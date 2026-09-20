import { createServer } from 'node:http';

import { criarApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { fecharPool } from '../src/config/database.js';
import { fecharSessionStore } from '../src/config/session.js';

/**
 * Gerador de carga da RNF-02: trinta jogadores fazendo o caminho de verdade.
 *
 * **O número daqui vale como comparação entre configurações, não como promessa
 * de produção.** A máquina de desenvolvimento divide processador com o MySQL, e
 * um servidor atrás de proxy se comporta diferente. O que este script responde é
 * "qual tamanho de pool aguenta trinta simultâneos aqui", que é a pergunta que a
 * tarefa faz.
 *
 * Sobe a aplicação em processo, numa porta livre, e fala com ela por HTTP: assim
 * a medição inclui sessão, middleware e render, que é o que o jogador espera.
 *
 * Uso:
 *   node scripts/carga.js
 *   node scripts/carga.js --usuarios=30 --rodadas=5
 *   DB_POOL_LIMIT=20 node scripts/carga.js
 *
 * O cadastro das contas fica fora da medição de propósito: o bcrypt do registro
 * é caro por definição e esconderia a disputa por conexão, que é o alvo.
 */

const PADROES = { usuarios: 30, rodadas: 5 };

/** As páginas que o jogador abre numa sessão comum, na ordem em que abre. */
const JORNADA = ['/painel', '/trilha', '/metas', '/loja'];

function argumento(nome) {
  const achado = process.argv.find((valor) => valor.startsWith(`--${nome}=`));
  return achado ? Number(achado.split('=')[1]) : PADROES[nome];
}

/** Um cliente com cookie próprio: cada jogador tem a própria sessão. */
function criarCliente(base) {
  let cookie = '';

  return async function pedir(caminho, opcoes = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
      ...opcoes,
      redirect: 'manual',
      headers: { ...(opcoes.headers ?? {}), ...(cookie ? { cookie } : {}) },
    });

    const recebido = resposta.headers.getSetCookie?.() ?? [];
    if (recebido.length > 0) cookie = recebido.map((linha) => linha.split(';')[0]).join('; ');

    return resposta;
  };
}

async function tokenDe(pedir, caminho) {
  const corpo = await (await pedir(caminho)).text();
  const achado = /name="_csrf" value="([^"]+)"/.exec(corpo) ?? /data-csrf-token="([^"]+)"/.exec(corpo);
  if (!achado) throw new Error(`Token CSRF não encontrado em ${caminho}`);
  return achado[1];
}

function formulario(campos) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams(campos).toString(),
  };
}

/** Cria a conta e conclui o onboarding. Fora da medição. */
async function prepararJogador(base, numero) {
  const pedir = criarCliente(base);
  const dados = { email: `carga${numero}@beever.dev`, senha: 'beever123', apelido: `carga${numero}` };

  let csrf = await tokenDe(pedir, '/login');
  const cadastro = await pedir(
    '/users',
    formulario({
      apelido: dados.apelido,
      email: dados.email,
      data_nasc: '2015-06-15',
      senha: dados.senha,
      consentimento_responsavel: 'on',
      _csrf: csrf,
    }),
  );

  if (cadastro.status === 409) {
    // Conta de uma rodada anterior: entra em vez de cadastrar.
    csrf = await tokenDe(pedir, '/login');
    await pedir('/sessao/login', formulario({ email: dados.email, senha: dados.senha, _csrf: csrf }));
    return pedir;
  }
  if (cadastro.status !== 201) throw new Error(`Cadastro de carga${numero} falhou: ${cadastro.status}`);

  const { idPerfil } = await cadastro.json();
  csrf = await tokenDe(pedir, '/onboarding');

  // Os sete dias vão como campo repetido, que é como o formulário os envia. Sem
  // eles o onboarding é recusado, o jogador fica preso em `/onboarding`, e a
  // medição acaba cronometrando redirecionamento em vez de página.
  const corpo = new URLSearchParams({
    apelido: dados.apelido,
    avatar: 'beenie-classico',
    objetivo: 'comprar-algo',
    nivel: 'beginner',
    tempo: '10',
    _csrf: csrf,
  });
  for (const dia of ['0', '1', '2', '3', '4', '5', '6']) corpo.append('dias', dia);

  const onboarding = await pedir(`/perfil/${idPerfil}/onboarding`, {
    method: 'PUT',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: corpo.toString(),
  });
  if (onboarding.status !== 200) throw new Error(`Onboarding de carga${numero} falhou: ${onboarding.status}`);

  return pedir;
}

function percentil(amostras, fatia) {
  const ordenadas = [...amostras].sort((um, outro) => um - outro);
  return Math.round(ordenadas[Math.min(ordenadas.length - 1, Math.floor(ordenadas.length * fatia))]);
}

function relatar(medidas, erros, duracaoTotal, usuarios, rodadas) {
  console.log(`\nPool: ${env.banco.limitePool} conexões · ${usuarios} jogadores · ${rodadas} rodadas`);
  console.log('rota          amostras     p50     p95     p99     máx');

  for (const [rota, amostras] of medidas) {
    console.log(
      rota.padEnd(14) +
        String(amostras.length).padStart(8) +
        String(percentil(amostras, 0.5)).padStart(8) +
        String(percentil(amostras, 0.95)).padStart(8) +
        String(percentil(amostras, 0.99)).padStart(8) +
        String(Math.round(Math.max(...amostras))).padStart(8),
    );
  }

  const total = [...medidas.values()].reduce((soma, amostras) => soma + amostras.length, 0);
  console.log(`\n${total} requisições em ${Math.round(duracaoTotal)}ms · ${erros} erro(s)`);
  console.log(`vazão: ${Math.round((total / duracaoTotal) * 1000)} req/s`);
}

async function principal() {
  const usuarios = argumento('usuarios');
  const rodadas = argumento('rodadas');

  const servidor = createServer(criarApp());
  await new Promise((resolve) => servidor.listen(0, resolve));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  console.log(`Preparando ${usuarios} contas...`);
  const clientes = [];
  for (let numero = 0; numero < usuarios; numero += 1) clientes.push(await prepararJogador(base, numero));

  const medidas = new Map(JORNADA.map((rota) => [rota, []]));
  const statusPorCodigo = new Map();
  let erros = 0;

  console.log(`Medindo ${rodadas} rodadas da jornada, todos ao mesmo tempo...`);
  const inicio = performance.now();

  for (let rodada = 0; rodada < rodadas; rodada += 1) {
    await Promise.all(
      clientes.map(async (pedir) => {
        for (const rota of JORNADA) {
          const partida = performance.now();
          try {
            const resposta = await pedir(rota, { headers: { accept: 'text/html' } });
            statusPorCodigo.set(resposta.status, (statusPorCodigo.get(resposta.status) ?? 0) + 1);
            if (resposta.status >= 400) erros += 1;
            await resposta.text();
          } catch {
            erros += 1;
          }
          medidas.get(rota).push(performance.now() - partida);
        }
      }),
    );
  }

  relatar(medidas, erros, performance.now() - inicio, usuarios, rodadas);
  // O código de resposta importa tanto quanto o tempo: 429 não é lentidão, é
  // limite de requisição batendo, e resolve-se em lugar diferente.
  console.log('respostas por código:', [...statusPorCodigo].map(([codigo, quantas]) => `${codigo}×${quantas}`).join(' '));

  await new Promise((resolve) => servidor.close(resolve));
  await fecharSessionStore();
  await fecharPool();
}

await principal();
