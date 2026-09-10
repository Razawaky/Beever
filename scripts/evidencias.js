import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CONTAS } from './seed.js';

/**
 * Gera os prints das telas para a evidência da T-15.5.
 *
 * Print tirado à mão envelhece e ninguém sabe de qual versão ele é. Aqui a
 * captura é um comando: sobe o navegador sem janela, entra com a conta do seed
 * e fotografa cada tela pelo endereço.
 *
 * Precisa do servidor de pé (`npm start`) e do banco seedado (`npm run db:seed`).
 * Rode com `npm run evidencias`.
 */

const ENDERECO_DO_SERVIDOR = process.env.EVIDENCIAS_URL ?? 'http://localhost:3000';
const PASTA_DE_SAIDA = 'docs/evidencias/telas';
const PORTA_DE_DEPURACAO = 9222;

// A conta de exemplo vem do próprio seed, e não repetida aqui: senha escrita
// em dois arquivos vira duas verdades no dia em que uma delas mudar.
// `EVIDENCIAS_CONTA=avancado` fotografa a colmeia de quem já jogou muito.
const CONTA_DO_JOGADOR = CONTAS[process.env.EVIDENCIAS_CONTA ?? 'demo'] ?? CONTAS.demo;

// `--somente-rolagem` pula os prints e roda só a medição de 320 px. É o que o
// portão do CI executa: lá o que importa é reprovar a rolagem, e imagem gerada
// dentro do CI ninguém olha.
const SOMENTE_ROLAGEM = process.argv.includes('--somente-rolagem');

const LARGURA_DE_CELULAR = 390;
// O piso da RNF-20: nenhuma tela pode pedir rolagem lateral aqui.
const LARGURA_ESTREITA = 320;
const ALTURA_DE_CELULAR = 844;
const LARGURA_DE_DESKTOP = 1440;
const ALTURA_DE_DESKTOP = 900;

// Dobra a resolução para o print ficar legível impresso, e o teto de altura do
// codec WebP, que o navegador não avisa quando estoura.
const ESCALA_DESEJADA = 2;
const ALTURA_MAXIMA_DO_WEBP = 16383;

/**
 * As telas do fluxo de recompensa, na ordem em que a criança as vê. `desktop`
 * marca as quatro mais visitadas, que a T-16.1 vai recompor e por isso precisam
 * de foto nas duas larguras.
 */
const TELAS = [
  { arquivo: '01-landing', caminho: '/', publica: true },
  { arquivo: '02-login', caminho: '/login', publica: true },
  { arquivo: '03-colmeia', caminho: '/painel', desktop: true },
  { arquivo: '04-trilha', caminho: '/trilha', desktop: true },
  { arquivo: '05-celula', caminho: null },
  { arquivo: '06-loja', caminho: '/loja', desktop: true },
  { arquivo: '07-cofre', caminho: '/cofre', desktop: true },
  { arquivo: '08-metas', caminho: '/metas' },
  { arquivo: '09-conquistas', caminho: '/conquistas' },
  { arquivo: '10-liga', caminho: '/liga' },
  { arquivo: '11-inventario', caminho: '/inventario' },
  { arquivo: '12-privacidade', caminho: '/privacidade', publica: true },
];

/**
 * O painel administrativo entra na medição de 320 px, mas não no álbum de
 * prints: o laudo do TCC mostra o que a criança vê. Ele exige a conta de
 * administrador, que é outra sessão.
 */
const TELAS_DO_PAINEL = ['/admin', '/admin/usuarios', '/admin/itens', '/admin/favos', '/admin/auditoria'];

/** O navegador instalado. Brave e Chromium falam o mesmo protocolo. */
const NAVEGADORES_POSSIVEIS = ['brave', 'chromium', 'google-chrome', 'google-chrome-stable'];

function extrairCookieDeSessao(resposta) {
  const cabecalhos = resposta.headers.getSetCookie();
  const daSessao = cabecalhos.find((cabecalho) => cabecalho.startsWith('beever.sid='));
  if (!daSessao) return null;
  return daSessao.split(';')[0].split('=').slice(1).join('=');
}

function extrairTokenCsrf(html) {
  const encontrado = html.match(/name="_csrf" value="([^"]+)"/);
  if (!encontrado) throw new Error('A página de login não trouxe o token CSRF.');
  return encontrado[1];
}

/**
 * Entra com a conta do seed e devolve o cookie de sessão já autenticado. O
 * login troca a sessão por outra, então o cookie que vale é o da resposta do
 * POST, não o da página do formulário.
 */
async function entrar(conta) {
  const paginaDeLogin = await fetch(`${ENDERECO_DO_SERVIDOR}/login`);
  const cookieAnonimo = extrairCookieDeSessao(paginaDeLogin);
  const token = extrairTokenCsrf(await paginaDeLogin.text());

  const corpo = new URLSearchParams({
    email: conta.email,
    senha: conta.senha,
    _csrf: token,
  });

  const resposta = await fetch(`${ENDERECO_DO_SERVIDOR}/sessao/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: `beever.sid=${cookieAnonimo}`,
    },
    body: corpo,
  });

  if (resposta.status >= 400) {
    throw new Error(`O login recusou ${conta.email} (HTTP ${resposta.status}).`);
  }

  return extrairCookieDeSessao(resposta) ?? cookieAnonimo;
}

/**
 * Descobre uma célula de verdade para fotografar a tela de jogo. Sem isso o
 * print viria de um id inventado, que dá 404 e não prova nada.
 */
async function descobrirCaminhoDaCelula(cookieDeSessao) {
  const resposta = await fetch(`${ENDERECO_DO_SERVIDOR}/trilha`, {
    headers: { cookie: `beever.sid=${cookieDeSessao}` },
  });
  const html = await resposta.text();
  const encontrado = html.match(/\/trilha\/(\d+)\/celula\/(\d+)/);
  if (!encontrado) return null;
  return encontrado[0];
}

async function esperar(milissegundos) {
  await new Promise((resolver) => setTimeout(resolver, milissegundos));
}

/** Sobe o navegador sem janela com a porta de depuração aberta. */
async function subirNavegador(perfilTemporario) {
  for (const nome of NAVEGADORES_POSSIVEIS) {
    const processo = spawn(
      nome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--remote-debugging-port=${PORTA_DE_DEPURACAO}`,
        `--user-data-dir=${perfilTemporario}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    );

    for (let tentativa = 0; tentativa < 40; tentativa += 1) {
      await esperar(250);
      try {
        const resposta = await fetch(`http://127.0.0.1:${PORTA_DE_DEPURACAO}/json/version`);
        const versao = await resposta.json();
        return { processo, nome, enderecoDoNavegador: versao.webSocketDebuggerUrl };
      } catch {
        if (processo.exitCode !== null) break;
      }
    }

    processo.kill();
  }

  throw new Error(`Nenhum navegador encontrado. Instale um destes: ${NAVEGADORES_POSSIVEIS.join(', ')}.`);
}

/**
 * Uma conversa com o navegador pelo protocolo do Chrome DevTools. É WebSocket
 * cru de propósito: o Node 22 já tem cliente embutido e o projeto não ganha
 * dependência nova só para tirar print.
 */
class ConversaComONavegador {
  constructor(endereco) {
    this.endereco = endereco;
    this.proximoId = 1;
    this.pendentes = new Map();
    this.eventos = new Map();
  }

  async abrir() {
    this.socket = new WebSocket(this.endereco);
    this.socket.addEventListener('message', (mensagem) => this.receber(JSON.parse(mensagem.data)));
    await new Promise((resolver, rejeitar) => {
      this.socket.addEventListener('open', resolver, { once: true });
      this.socket.addEventListener('error', rejeitar, { once: true });
    });
  }

  receber(mensagem) {
    if (mensagem.id && this.pendentes.has(mensagem.id)) {
      const { resolver, rejeitar } = this.pendentes.get(mensagem.id);
      this.pendentes.delete(mensagem.id);
      if (mensagem.error) rejeitar(new Error(mensagem.error.message));
      else resolver(mensagem.result);
      return;
    }
    if (mensagem.method && this.eventos.has(mensagem.method)) {
      const aguardando = this.eventos.get(mensagem.method);
      this.eventos.delete(mensagem.method);
      aguardando();
    }
  }

  pedir(metodo, parametros = {}) {
    const id = this.proximoId;
    this.proximoId += 1;
    this.socket.send(JSON.stringify({ id, method: metodo, params: parametros }));
    return new Promise((resolver, rejeitar) => this.pendentes.set(id, { resolver, rejeitar }));
  }

  esperarEvento(metodo) {
    return new Promise((resolver) => this.eventos.set(metodo, resolver));
  }

  fechar() {
    this.socket?.close();
  }
}

async function abrirAba(enderecoDoNavegador) {
  const navegador = new ConversaComONavegador(enderecoDoNavegador);
  await navegador.abrir();
  const { targetId } = await navegador.pedir('Target.createTarget', { url: 'about:blank' });
  navegador.fechar();

  const aba = new ConversaComONavegador(
    `ws://127.0.0.1:${PORTA_DE_DEPURACAO}/devtools/page/${targetId}`,
  );
  await aba.abrir();
  await aba.pedir('Page.enable');
  await aba.pedir('Network.enable');
  return aba;
}

/**
 * Fotografa a página inteira, não só o que cabe na tela: a Colmeia e a landing
 * são longas e o corte esconderia justamente o que a banca quer ver.
 */
async function fotografar(aba, endereco, largura, altura, destino) {
  async function ajustarTela(escala) {
    await aba.pedir('Emulation.setDeviceMetricsOverride', {
      width: largura,
      height: altura,
      deviceScaleFactor: escala,
      mobile: largura <= LARGURA_DE_CELULAR,
    });
  }

  await ajustarTela(ESCALA_DESEJADA);

  const carregou = aba.esperarEvento('Page.loadEventFired');
  await aba.pedir('Page.navigate', { url: endereco });
  await carregou;
  // A revelação por rolagem e as fontes chegam depois do load; sem esta pausa a
  // foto sai com seção invisível e texto na fonte de reserva.
  await esperar(1800);

  // A loja e a landing passam de dez mil pixels de altura, e em escala dobrada
  // estouram o teto do WebP — o navegador devolve arquivo vazio, sem erro. Por
  // isso a escala cai para caber.
  const { cssContentSize } = await aba.pedir('Page.getLayoutMetrics');
  const escala = cssContentSize.height * ESCALA_DESEJADA > ALTURA_MAXIMA_DO_WEBP ? 1 : ESCALA_DESEJADA;
  if (escala !== ESCALA_DESEJADA) await ajustarTela(escala);

  // WebP pelo mesmo motivo do resto da arte do projeto: os dezesseis prints
  // saem de 7,2 MB para pouco mais de 2 MB no repositório.
  const { data } = await aba.pedir('Page.captureScreenshot', {
    format: 'webp',
    quality: 85,
    captureBeyondViewport: true,
  });

  const imagem = Buffer.from(data, 'base64');
  if (imagem.length === 0) {
    throw new Error(`O navegador devolveu print vazio de ${endereco} (${largura}px).`);
  }
  await writeFile(destino, imagem);
}

/**
 * Mede se a página cabe em 320 px sem rolagem horizontal (RNF-20).
 *
 * A varredura de acessibilidade lê o HTML servido e não consegue responder
 * isto: largura só existe depois de o CSS ser aplicado. Aqui a pergunta é feita
 * ao navegador — `scrollWidth` maior que a janela é a definição de rolagem
 * lateral, e é o que o checklist da seção 8 do `docs/04` proíbe.
 */
async function medirRolagemEstreita(aba, endereco) {
  await aba.pedir('Emulation.setDeviceMetricsOverride', {
    width: LARGURA_ESTREITA,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  });

  const carregou = aba.esperarEvento('Page.loadEventFired');
  await aba.pedir('Page.navigate', { url: endereco });
  await carregou;
  await esperar(800);

  const medir = () => aba.pedir('Runtime.evaluate', {
    // `scrollWidth` do documento é clampado quando algo esconde o transbordo, e
    // aí a medida vira sempre "cabe". O que não mente é o elemento mais largo
    // da página: se ele passa da janela, houve transbordo, escondido ou não.
    expression: `JSON.stringify((() => {
      let maior = document.documentElement.scrollWidth;
      let culpado = 'html';
      let contencao = 'nenhuma';
      for (const elemento of document.body.querySelectorAll('*')) {
        const direita = elemento.getBoundingClientRect().right;
        if (direita <= maior) continue;

        maior = Math.ceil(direita);
        culpado = elemento.tagName.toLowerCase() + (elemento.id ? '#' + elemento.id : '') + (elemento.className ? '.' + String(elemento.className).split(' ').slice(0, 3).join('.') : '');

        // Quem segura o transbordo muda o veredito: contêiner que rola deixa o
        // conteúdo alcançável, e é o padrão que o design system pede para
        // tabela larga. Contêiner que esconde corta e a criança não chega lá.
        contencao = 'nenhuma';
        for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
          const transbordo = getComputedStyle(pai).overflowX;
          if (transbordo === 'visible') continue;
          contencao = transbordo === 'hidden' ? 'escondido' : 'rolavel';
          break;
        }
      }
      return {
        rolagem: document.documentElement.scrollWidth,
        pagina: maior,
        janela: window.innerWidth,
        culpado,
        contencao,
        caminho: location.pathname,
      };
    })())`,
    returnByValue: true,
  });

  // O evento de carregamento de uma navegação anterior pode chegar atrasado e
  // resolver a espera cedo demais — aí a medida sai da página errada. Por isso
  // a página conferida diz de onde ela veio, e a medição insiste até bater.
  const esperado = new URL(endereco).pathname;
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const { result } = await medir();
    const medida = JSON.parse(result.value);
    if (medida.caminho === esperado) return medida;
    await esperar(600);
  }

  throw new Error(`A medição não conseguiu chegar em ${esperado}.`);
}

async function principal() {
  const cookieDeSessao = await entrar(CONTA_DO_JOGADOR);
  const caminhoDaCelula = await descobrirCaminhoDaCelula(cookieDeSessao);

  await mkdir(PASTA_DE_SAIDA, { recursive: true });
  const perfilTemporario = join(tmpdir(), `beever-evidencias-${process.pid}`);
  const { processo, nome } = await subirNavegador(perfilTemporario);
  console.log(`Navegador: ${nome}`);

  const versao = await (await fetch(`http://127.0.0.1:${PORTA_DE_DEPURACAO}/json/version`)).json();
  const aba = await abrirAba(versao.webSocketDebuggerUrl);

  const capturadas = [];
  const estouraram = [];

  async function capturar(tela) {
    if (SOMENTE_ROLAGEM) return;

    const caminho = tela.caminho ?? caminhoDaCelula;
    if (!caminho) {
      console.log(`  ${tela.arquivo}: sem célula na trilha, pulada`);
      return;
    }

    const larguras = [{ sufixo: 'celular', largura: LARGURA_DE_CELULAR, altura: ALTURA_DE_CELULAR }];
    if (tela.desktop) {
      larguras.push({ sufixo: 'desktop', largura: LARGURA_DE_DESKTOP, altura: ALTURA_DE_DESKTOP });
    }

    for (const { sufixo, largura, altura } of larguras) {
      const destino = `${PASTA_DE_SAIDA}/${tela.arquivo}-${sufixo}.webp`;
      await fotografar(aba, `${ENDERECO_DO_SERVIDOR}${caminho}`, largura, altura, destino);
      capturadas.push(destino);
      console.log(`  ${destino}`);
    }
  }

  async function ligarSessao(cookie) {
    const { hostname } = new URL(ENDERECO_DO_SERVIDOR);
    await aba.pedir('Network.setCookie', {
      name: 'beever.sid',
      value: cookie,
      domain: hostname,
      path: '/',
      httpOnly: true,
    });
  }

  async function medirTodas(telas) {
    for (const tela of telas) {
      const caminho = tela.caminho ?? caminhoDaCelula;
      if (!caminho) continue;

      const { rolagem, pagina, janela, culpado, contencao } = await medirRolagemEstreita(
        aba,
        `${ENDERECO_DO_SERVIDOR}${caminho}`,
      );

      // Sem esta conferência o gate mente: se o navegador não aplicar a largura
      // pedida, a página é medida numa janela maior e "cabe" sem ter cabido.
      // Alguns pixels de diferença são arredondamento do navegador; o que
      // invalida a medida é a janela abrir bem maior que a pedida, como
      // acontece abaixo de uns 250 px, quando ele ignora a largura.
      if (Math.abs(janela - LARGURA_ESTREITA) > 4) {
        estouraram.push(`${caminho} (medido em ${janela}px, e não em ${LARGURA_ESTREITA}px)`);
        console.log(`  ${caminho}: NÃO MEDIDO — a janela ficou em ${janela}px`);
        continue;
      }

      // Duas medidas, e só a primeira reprova. `scrollWidth` do documento é o
      // que vira barra de rolagem de verdade; o elemento mais largo pode estar
      // aparado por um ancestral e não rolar nada — vale como pista, não como
      // veredito.
      const sobra = rolagem - janela;
      if (sobra > 0) {
        estouraram.push(`${caminho} (rola ${sobra}px além da janela, por ${culpado})`);
        console.log(`  ${caminho}: ROLA ${sobra}px, por ${culpado}`);
      } else if (pagina > janela && contencao === 'escondido') {
        console.log(`  ${caminho}: cabe, mas ${culpado} é cortado e não dá para alcançar`);
      } else if (pagina > janela) {
        console.log(`  ${caminho}: cabe (${culpado} rola dentro do próprio contêiner)`);
      } else {
        console.log(`  ${caminho}: cabe`);
      }
    }
  }

  try {
    if (SOMENTE_ROLAGEM) console.log('Modo medição: sem prints.');

    // As telas públicas vêm primeiro e sem cookie: com a sessão ligada, `/` e
    // `/login` redirecionam para a Colmeia e o print sairia da tela errada.
    await aba.pedir('Network.clearBrowserCookies');
    for (const tela of TELAS.filter((tela) => tela.publica)) {
      await capturar(tela);
    }

    await ligarSessao(cookieDeSessao);

    for (const tela of TELAS.filter((tela) => !tela.publica)) {
      await capturar(tela);
    }

    console.log('\nRolagem lateral a 320 px:');
    // Em duas fases, pelo mesmo motivo dos prints: com a sessão ligada, `/` e
    // `/login` redirecionam para a Colmeia e a medida sairia da tela errada —
    // três vezes a mesma página, com três vezes o mesmo veredito.
    await aba.pedir('Network.clearBrowserCookies');
    await medirTodas(TELAS.filter((tela) => tela.publica));
    await ligarSessao(cookieDeSessao);
    await medirTodas(TELAS.filter((tela) => !tela.publica));

    // O painel administrativo é outra sessão, e por isso vem por último.
    await aba.pedir('Network.clearBrowserCookies');
    await ligarSessao(await entrar(CONTAS.admin));
    await medirTodas(TELAS_DO_PAINEL.map((caminho) => ({ caminho })));
  } finally {
    aba.fechar();
    processo.kill();
    // O navegador ainda grava no perfil enquanto morre; apagar antes disso
    // falha com ENOTEMPTY e derruba a execução depois de os prints prontos.
    if (processo.exitCode === null) {
      await new Promise((resolver) => processo.once('exit', resolver));
    }
    // O navegador deixa processos filhos gravando no perfil por um instante
    // depois de morrer, e apagar nesse instante estoura ENOTEMPTY. Perfil
    // esquecido em /tmp é inofensivo; print perdido não seria.
    try {
      await rm(perfilTemporario, { recursive: true, force: true });
    } catch {
      console.log(`Perfil temporário ficou em ${perfilTemporario}.`);
    }
  }

  if (!SOMENTE_ROLAGEM) console.log(`\n${capturadas.length} prints em ${PASTA_DE_SAIDA}/`);

  // Falha de propósito: prova que não passa é evidência que não vale.
  if (estouraram.length > 0) {
    throw new Error(`Telas com rolagem lateral a ${LARGURA_ESTREITA}px: ${estouraram.join(', ')}`);
  }
}

principal().catch((erro) => {
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
