import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import {
  apagaOFoco,
  camposSemRotulo,
  corDoToken,
  elementosFocaveis,
  largurasFixasDemais,
  niveisDeTitulo,
  pareceBotao,
  paresDeCorNoMesmoElemento,
  razaoDeContraste,
  tabelasSemRolagem,
  temAlvoDeToque,
} from '../helpers/acessibilidade.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * Acessibilidade e responsividade em todas as telas (T-14.7).
 *
 * A T-11.7 provou a landing e a política; as outras trinta telas nunca passaram
 * por régua nenhuma. Aqui cada tela é buscada pelo HTTP, como o navegador faz, e
 * a mesma bateria roda em todas: foco visível, alvo de toque, campo com nome,
 * ordem de títulos, contraste do par escrito no elemento e largura que cabe em
 * 320 px. Tela nova que esquecer qualquer um desses cai aqui.
 */

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

// Vêm do seed: o administrador tem linha em `admins`.
const ADMIN = { email: 'admin@beever.dev', senha: 'admin1234' };

/** A tela de jogo não tem nada clicável fora do jogo, e por isso não leva painel. */
const SEM_PAINEL = ['célula'];

describe('acessibilidade de todas as telas', opcoes, () => {
  let banco;
  let app;

  /** Cada item vira `{ nome, html }` e alimenta todos os testes do arquivo. */
  const telas = [];

  function telaDe(nome) {
    const achada = telas.find((tela) => tela.nome === nome);
    assert.ok(achada, `a tela "${nome}" foi coletada`);
    return achada.html;
  }

  async function lerToken(agente, caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').redirects(2);
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  /** Busca a tela e guarda o HTML. O código esperado varia: erro é 404 de propósito. */
  async function coletar(agente, nome, caminho, codigo = 200) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').expect(codigo);
    telas.push({ nome, caminho, html: resposta.text });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();

    const anonimo = request.agent(app);
    await coletar(anonimo, 'landing', '/');
    await coletar(anonimo, 'login', '/login');
    await coletar(anonimo, 'cadastro', '/cadastro');
    await coletar(anonimo, 'privacidade', '/privacidade');
    await coletar(anonimo, 'manutenção', '/manutencao');
    await coletar(anonimo, 'erro', '/rota-que-nao-existe', 404);
    await coletar(anonimo, 'login do admin', '/admin/login');

    const jogador = request.agent(app);
    let csrf = await lerToken(jogador, '/login');
    const cadastro = await jogador
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'varredura',
        email: 'varredura@beever.dev',
        data_nasc: '2014-05-01',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    // O onboarding só existe enquanto está pendente, então é a primeira coleta.
    await coletar(jogador, 'onboarding', '/onboarding');

    csrf = await lerToken(jogador, '/onboarding');
    await jogador
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'varredura',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[favo]] = await banco.conexao.query(
      'SELECT id FROM hives WHERE is_active = 1 ORDER BY order_index LIMIT 1',
    );
    const [[celula]] = await banco.conexao.query(
      'SELECT id FROM cells WHERE hive_id = ? ORDER BY order_index LIMIT 1',
      [favo.id],
    );
    const [[item]] = await banco.conexao.query(
      'SELECT id FROM items WHERE is_active = 1 ORDER BY price LIMIT 1',
    );

    await coletar(jogador, 'colmeia', '/painel');
    await coletar(jogador, 'trilha', '/trilha');
    await coletar(jogador, 'favo', `/trilha/${favo.id}`);
    await coletar(jogador, 'célula', `/trilha/${favo.id}/celula/${celula.id}`);
    await coletar(jogador, 'loja', '/loja');
    await coletar(jogador, 'confirmação de compra', `/loja/itens/${item.id}/confirmar`);
    await coletar(jogador, 'inventário', '/inventario');
    await coletar(jogador, 'cofre', '/cofre');
    await coletar(jogador, 'metas', '/metas');
    await coletar(jogador, 'conquistas', '/conquistas');
    await coletar(jogador, 'liga', '/liga');
    await coletar(jogador, 'perfil', '/perfil');

    const admin = request.agent(app);
    csrf = await lerToken(admin, '/admin/login');
    await admin
      .post('/admin/login')
      .set('Accept', 'application/json')
      .send({ ...ADMIN, _csrf: csrf })
      .expect(200);

    await coletar(admin, 'painel do admin', '/admin');
    await coletar(admin, 'contas', '/admin/usuarios');
    await coletar(admin, 'favos do admin', '/admin/favos');
    await coletar(admin, 'favo novo', '/admin/favos/novo');
    await coletar(admin, 'células do admin', `/admin/favos/${favo.id}`);
    await coletar(admin, 'favo em edição', `/admin/favos/${favo.id}/editar`);
    await coletar(admin, 'célula nova', `/admin/favos/${favo.id}/celulas/nova`);
    await coletar(admin, 'conteúdo da célula', `/admin/celulas/${celula.id}/conteudo`);
    await coletar(admin, 'itens do admin', '/admin/itens');
    await coletar(admin, 'item novo', '/admin/itens/novo');
    // `/admin/itens/:id` só responde JSON: no navegador ele desvia para a edição.
    await coletar(admin, 'item em edição', `/admin/itens/${item.id}/editar`);
    await coletar(admin, 'auditoria', '/admin/auditoria');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('coletou as trinta telas que a aplicação serve', () => {
    assert.ok(telas.length >= 30, `esperava a aplicação inteira, coletei ${telas.length} telas`);
  });

  it('o foco visível é regra de base, e não classe que cada tela precisa lembrar (RNF-23)', () => {
    const tema = readFileSync(path.join(raiz, 'src/styles/tema.css'), 'utf8');

    // Escrito elemento por elemento, quatrocentos deles ficaram sem nada. Uma
    // regra na base cobre inclusive a tela que ainda vai ser escrita.
    assert.match(tema, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--color-ambar\)/);
  });

  it('nenhuma tela apaga o foco sem pôr outro no lugar (RNF-23)', () => {
    const apagados = [];

    for (const tela of telas) {
      for (const elemento of elementosFocaveis(tela.html)) {
        if (apagaOFoco(elemento)) apagados.push(`${tela.nome}: ${elemento.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }

    assert.deepEqual(apagados, [], `foco apagado sem substituto:\n${apagados.join('\n')}`);
  });

  it('botão e link em forma de botão alcançam o alvo de 44 px (RNF-22)', () => {
    const pequenos = [];

    for (const tela of telas) {
      for (const elemento of elementosFocaveis(tela.html)) {
        if (!pareceBotao(elemento)) continue;
        if (!temAlvoDeToque(elemento)) pequenos.push(`${tela.nome}: ${elemento.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }

    assert.deepEqual(pequenos, [], `alvos abaixo do piso:\n${pequenos.join('\n')}`);
  });

  it('todo campo de formulário tem nome que o leitor de tela leia', () => {
    const anonimos = [];

    for (const tela of telas) {
      for (const campo of camposSemRotulo(tela.html)) {
        anonimos.push(`${tela.nome}: ${campo.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }

    assert.deepEqual(anonimos, [], `campos sem rótulo:\n${anonimos.join('\n')}`);
  });

  it('cada tela tem um h1 só e nenhum salto de nível de título', () => {
    const problemas = [];

    for (const tela of telas) {
      const niveis = niveisDeTitulo(tela.html);
      const primeiros = niveis.filter((nivel) => nivel === 1).length;

      if (primeiros !== 1) problemas.push(`${tela.nome}: ${primeiros} títulos de nível 1`);

      for (let i = 1; i < niveis.length; i += 1) {
        if (niveis[i] - niveis[i - 1] > 1) {
          problemas.push(`${tela.nome}: salto de h${niveis[i - 1]} para h${niveis[i]}`);
        }
      }
    }

    assert.deepEqual(problemas, [], `hierarquia de títulos quebrada:\n${problemas.join('\n')}`);
  });

  it('todo par de cor escrito no mesmo elemento alcança 4,5:1 (RNF-21)', () => {
    const reprovados = [];

    for (const tela of telas) {
      for (const par of paresDeCorNoMesmoElemento(tela.html)) {
        const razao = razaoDeContraste(corDoToken(par.frente), corDoToken(par.fundo));
        if (razao < 4.5) {
          reprovados.push(
            `${tela.nome}: text-${par.frente} sobre bg-${par.fundo} dá ${razao.toFixed(2)}:1`,
          );
        }
      }
    }

    assert.deepEqual([...new Set(reprovados)], [], `contraste abaixo de AA:\n${reprovados.join('\n')}`);
  });

  it('nenhuma tela fixa largura maior que a tela de 320 px (RNF-20)', () => {
    const largas = [];

    for (const tela of telas) {
      for (const classe of largurasFixasDemais(tela.html)) largas.push(`${tela.nome}: ${classe}`);
    }

    assert.deepEqual(largas, [], `largura fixa maior que a tela:\n${largas.join('\n')}`);
  });

  it('toda tabela rola sozinha, em vez de esticar a página (RNF-20)', () => {
    const soltas = [];

    for (const tela of telas) {
      for (const tabela of tabelasSemRolagem(tela.html)) soltas.push(`${tela.nome}: ${tabela}`);
    }

    assert.deepEqual(soltas, [], `tabela sem rolagem própria:\n${soltas.join('\n')}`);
  });

  it('toda tela declara idioma e deixa o navegador ampliar (RNF-20)', () => {
    for (const tela of telas) {
      assert.match(tela.html, /<html lang="pt-BR">/, `idioma declarado em ${tela.nome}`);
      assert.match(tela.html, /name="viewport" content="width=device-width/, `viewport em ${tela.nome}`);
      // Bloquear o zoom é o atalho mais comum para quebrar a leitura de quem
      // enxerga pouco, e não tem nada que o justifique aqui.
      assert.doesNotMatch(tela.html, /user-scalable=no|maximum-scale=1/, `zoom travado em ${tela.nome}`);
    }
  });

  it('o painel de acessibilidade está em toda tela, menos na de jogo', () => {
    for (const tela of telas) {
      const temPainel = /<div[^>]*id="acessibilidade"/.test(tela.html);
      const deveTer = !SEM_PAINEL.includes(tela.nome);

      assert.equal(temPainel, deveTer, `painel em ${tela.nome}: esperava ${deveTer}`);
    }
  });

  it('nenhum ajuste do painel nasce ligado: o padrão é a tela como foi desenhada', () => {
    for (const tela of telas) {
      if (SEM_PAINEL.includes(tela.nome)) continue;

      const chaves = tela.html.match(/class="acessibilidade-chave[^"]*"[^>]*aria-pressed="([^"]+)"/g) ?? [];
      assert.equal(chaves.length, 4, `os quatro ajustes em ${tela.nome}`);
      for (const chave of chaves) {
        assert.match(chave, /aria-pressed="false"/, `ajuste ligado por padrão em ${tela.nome}`);
      }
    }
  });

  it('toda folha de estilo com animação atende quem pede menos movimento (RNF-26)', () => {
    const semSaida = [];

    for (const folha of ['tema.css', 'trilha.css', 'landing.css']) {
      const estilo = readFileSync(path.join(raiz, 'src/styles', folha), 'utf8');
      if (!/@keyframes/.test(estilo)) continue;
      if (!/@media \(prefers-reduced-motion: reduce\)/.test(estilo)) semSaida.push(folha);
    }

    assert.deepEqual(semSaida, [], `folhas com animação e sem saída: ${semSaida.join(', ')}`);
  });

  it('os jogos de arrastar têm o mesmo caminho por clique e por teclado (RNF-23)', () => {
    for (const jogo of ['arraste.js', 'ordene.js']) {
      const script = readFileSync(path.join(raiz, 'src/public/js', jogo), 'utf8');

      // Carta e caixa são `<button>`, então arrastar é atalho e não requisito:
      // clique e teclado chegam nos mesmos elementos, sem caminho paralelo.
      assert.match(script, /createElement\('button'\)/, `${jogo} é feito de botões`);
      assert.match(script, /addEventListener\('click'/, `${jogo} responde a clique`);
    }
  });

  it('estado nenhum depende só de cor: acerto, atenção e erro vêm com palavra (RNF-25)', () => {
    // As telas onde a cor sozinha seria mais tentadora: a semana da sequência, o
    // degrau travado da conquista e a linha do próprio jogador na liga.
    assert.match(telaDe('colmeia'), /aria-label="[^"]*(?:cumprid|folga|hoje)/i);
    assert.match(telaDe('conquistas'), /Travad|Falta|de \d+/);
    assert.match(telaDe('liga'), /você/i);
  });
});
