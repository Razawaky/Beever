import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import request from 'supertest';

// `ambiente.js` aponta o pool da aplicação para o banco de teste e precisa ser
// avaliado antes de qualquer módulo do projeto. Não reordene estes imports.
import '../helpers/ambiente.js';
import { criarBancoDeTeste, motivoParaPular } from '../helpers/banco.js';
import { criarApp } from '../../src/app.js';
import { fecharPool } from '../../src/config/database.js';
import { fecharSessionStore } from '../../src/config/session.js';

/**
 * O onboarding retomado de onde parou (RF-ONB-01, T-04.2).
 *
 * Até aqui as respostas viviam na memória da aba: fechar o navegador no meio
 * começava tudo do zero. O que este arquivo prova é justamente o contrário —
 * que o progresso sobrevive à sessão, e sobrevive **em outro navegador**, que é
 * o cenário da decisão D-2 do laudo da T-04.1: a criança começa no computador
 * da escola e termina em casa.
 *
 * A conclusão continua sendo transação única, e nada aqui pode marcar a conta
 * como configurada antes dela.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

const CREDENCIAIS = { email: 'onboarding@beever.dev', senha: 'beever123' };
const DIAS_ESCOLHIDOS = ['1', '3', '5'];

/**
 * O rascunho viaja num atributo do `<body>`, e o EJS escapa atributo como
 * escapa qualquer outro valor. Desescapar aqui é o que o navegador faria
 * sozinho ao ler `dataset`; `&amp;` fica por último para não desfazer duas
 * vezes o que já foi desescapado.
 */
function lerRascunhoDaPagina(html) {
  const achado = /data-onboarding="([^"]*)"/.exec(html);
  assert.ok(achado, 'a página de onboarding precisa carregar o rascunho no body');

  const json = achado[1]
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  return JSON.parse(json);
}

describe('onboarding em passos', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let perfilId;

  async function lerToken(caminho, agenteDoTeste = agente) {
    const resposta = await agenteDoTeste.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  // Devolve a requisição, não uma promessa dela: quem chama encadeia `.expect`.
  function salvarPasso(passo, resposta, agenteDoTeste = agente) {
    return agenteDoTeste
      .put(`/perfil/${perfilId}/onboarding/passo`)
      .set('Accept', 'application/json')
      .send({ passo, resposta, _csrf: csrf });
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);
    csrf = await lerToken('/login');

    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'aprendiz',
        email: CREDENCIAIS.email,
        data_nasc: '2014-05-20',
        senha: CREDENCIAIS.senha,
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    perfilId = cadastro.body.idPerfil;
    csrf = await lerToken('/onboarding');
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a tela abre no primeiro passo, com a barra em zero e anunciada', async () => {
    const pagina = await agente.get('/onboarding').set('Accept', 'text/html').expect(200);

    const rascunho = lerRascunhoDaPagina(pagina.text);
    assert.equal(rascunho.passoAtual, 0);
    assert.deepEqual(rascunho.passos, ['apelido', 'dias', 'objetivo', 'avatar', 'nivel']);

    // DT-29: a barra é a mesma do resto do sistema — classe, não atributo
    // `style` — e diz o progresso a quem usa leitor de tela.
    assert.match(pagina.text, /class="barra-0 /);
    assert.match(pagina.text, /role="progressbar"/);
    assert.match(pagina.text, /aria-valuenow="0"/);
    assert.doesNotMatch(pagina.text, /id="progress-bar"[^>]*style=/);
  });

  it('grava cada passo respondido e empurra o marcador para frente', async () => {
    const apelido = await salvarPasso('apelido', 'abelhinha').expect(200);
    assert.equal(apelido.body.passoAtual, 1);

    const dias = await salvarPasso('dias', DIAS_ESCOLHIDOS).expect(200);
    assert.equal(dias.body.passoAtual, 2);
    assert.deepEqual(dias.body.respostas.dias, DIAS_ESCOLHIDOS);

    // A gravação é de verdade, na coluna que já era do campo — não há tabela de
    // rascunho e não há cópia no fim.
    const [linhas] = await banco.conexao.query(
      'SELECT weekday FROM schedules WHERE user_id = (SELECT user_id FROM profiles WHERE id = ?) AND is_available = 1 ORDER BY weekday',
      [perfilId],
    );
    assert.deepEqual(
      linhas.map((linha) => String(linha.weekday)),
      DIAS_ESCOLHIDOS,
    );
  });

  it('gravar um passo não marca a conta como configurada', async () => {
    const perfil = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(perfil.body.onboardingConcluido, false);

    // E o app continua barrado: onboarding pela metade não é onboarding feito.
    await agente.get('/painel').set('Accept', 'text/html').expect(302).expect('Location', '/onboarding');
  });

  it('recusa passo desconhecido, semana vazia e o nível fora da conclusão', async () => {
    await salvarPasso('salario', 'muito').expect(422);
    await salvarPasso('dias', []).expect(422);

    const nivel = await salvarPasso('nivel', 'advanced').expect(422);
    assert.match(JSON.stringify(nivel.body), /gravado ao concluir/);

    // Nenhuma das recusas pode ter mexido no marcador.
    const [[perfil]] = await banco.conexao.query('SELECT onboarding_step FROM profiles WHERE id = ?', [perfilId]);
    assert.equal(Number(perfil.onboarding_step), 2);
  });

  /**
   * O cenário que motivou a tarefa: outro navegador, outra sessão, mesmo
   * jogador. O rascunho vem do servidor, então ele cai no passo em que parou
   * com as respostas anteriores já preenchidas.
   */
  it('retoma do passo salvo em uma sessão nova', async () => {
    const outroNavegador = request.agent(app);
    const tokenDeLogin = await lerToken('/login', outroNavegador);

    await outroNavegador
      .post('/sessao/login')
      .set('Accept', 'application/json')
      .send({ ...CREDENCIAIS, _csrf: tokenDeLogin })
      .expect(200);

    const pagina = await outroNavegador.get('/onboarding').set('Accept', 'text/html').expect(200);
    const rascunho = lerRascunhoDaPagina(pagina.text);

    assert.equal(rascunho.passoAtual, 2, 'volta no passo seguinte ao último respondido');
    assert.equal(rascunho.respostas.apelido, 'abelhinha');
    assert.deepEqual(rascunho.respostas.dias, DIAS_ESCOLHIDOS);
    assert.equal(rascunho.respostas.objetivo, undefined, 'o que não foi respondido não volta preenchido');
  });

  it('voltar e regravar um passo não devolve o jogador ao começo', async () => {
    await salvarPasso('objetivo', 'comprar-algo').expect(200);

    const regravado = await salvarPasso('apelido', 'abelha-rainha').expect(200);
    assert.equal(regravado.body.passoAtual, 3, 'o marcador só anda para frente');
    assert.equal(regravado.body.respostas.apelido, 'abelha-rainha', 'mas a resposta revisada é gravada');
  });

  it('a conclusão fecha tudo numa transação e encerra os passos', async () => {
    csrf = await lerToken('/onboarding');

    const resposta = await agente
      .put(`/perfil/${perfilId}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'abelha-rainha',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'intermediate',
        dias: DIAS_ESCOLHIDOS,
        _csrf: csrf,
      })
      .expect(200);

    assert.equal(resposta.body.diasDisponiveis, 3);

    const [[perfil]] = await banco.conexao.query('SELECT onboarding_step FROM profiles WHERE id = ?', [perfilId]);
    assert.equal(Number(perfil.onboarding_step), 5, 'quem concluiu não tem passo pendente');

    const meu = await agente.get('/perfil/meu').set('Accept', 'application/json').expect(200);
    assert.equal(meu.body.onboardingConcluido, true);
  });

  it('quem já concluiu não consegue mais gravar passo', async () => {
    csrf = await lerToken('/painel');
    const resposta = await salvarPasso('objetivo', 'entender-juros').expect(409);
    assert.equal(resposta.body.codigo, 'ONBOARDING_JA_CONCLUIDO');
  });
});
