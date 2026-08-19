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
import * as cellsRepository from '../../src/repositories/cellsRepository.js';
import * as hivesRepository from '../../src/repositories/hivesRepository.js';
import * as progressService from '../../src/services/progressService.js';

/**
 * As duas telas da trilha, pelo HTTP.
 *
 * O que estes testes protegem é o que a tela promete: favo travado aparece com o
 * motivo escrito — nunca só cinza —, e a lista de células dele não é servida a
 * quem não pode abri-la, mesmo digitando o endereço.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('telas da trilha', opcoes, () => {
  let banco;
  let app;
  let agente;
  let csrf;
  let idUsuario;
  let primeiroFavo;
  let segundoFavo;
  let celulas;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
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
        apelido: 'trilheiro',
        email: 'telas-trilha@beever.dev',
        data_nasc: '2018-04-02',
        senha: 'beever123',
        consentimento_responsavel: 'on',
        _csrf: csrf,
      })
      .expect(201);

    csrf = await lerToken('/onboarding');
    await agente
      .put(`/perfil/${cadastro.body.idPerfil}/onboarding`)
      .set('Accept', 'application/json')
      .send({
        apelido: 'trilheiro',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['1', '3', '5'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);

    primeiroFavo = await hivesRepository.buscarPorSlug('primeiros-passos');
    segundoFavo = await hivesRepository.buscarPorSlug('guardar-e-gastar');
    celulas = await cellsRepository.listarDoFavoComProgresso(primeiroFavo.id, idUsuario, ['A']);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a Colmeia leva para a trilha', async () => {
    const painel = await agente.get('/painel').set('Accept', 'text/html').expect(200);
    assert.match(painel.text, /href="\/trilha"/);
  });

  it('a trilha diz quantas células o favo tem antes de o jogador tocar nele', async () => {
    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /0 de 4 células/, 'o total vem do catálogo, não do cache de progresso');
    assert.doesNotMatch(pagina.text, /de \? células/, 'a tela sabe o número: não pergunta');
  });

  it('a trilha mostra os dois favos, um aberto e um travado com o motivo escrito', async () => {
    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /Primeiros passos/);
    assert.match(pagina.text, /Guardar e gastar/);
    assert.match(pagina.text, /Conclua 80% do favo anterior/, 'o travado diz o que falta, não só cinza');
    assert.match(pagina.text, new RegExp(`href="/trilha/${primeiroFavo.id}"`), 'o favo aberto tem link');
    assert.doesNotMatch(
      pagina.text,
      new RegExp(`href="/trilha/${segundoFavo.id}"`),
      'o favo travado não tem link para entrar',
    );
  });

  it('o hexágono do favo aberto é anunciado com estado e percentual', async () => {
    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /aria-label="Abrir favo Primeiros passos — disponível, 0% concluído"/);
  });

  it('o favo aberto lista as células, só a primeira com botão de jogar', async () => {
    const pagina = await agente.get(`/trilha/${primeiroFavo.id}`).set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /O que é mel\?/);
    assert.match(pagina.text, /Meu primeiro orçamento/);
    assert.match(pagina.text, /Conclua a célula anterior/, 'as travadas dizem por quê');

    // Desde a T-07.2 o quiz é jogável, e só ele: as outras três células deste
    // favo são de jogos que a E07 ainda não escreveu.
    const links = pagina.text.match(/\/celula\/\d+/g) ?? [];
    assert.equal(links.length, 1, 'só a célula de quiz oferece caminho');
    assert.match(pagina.text, new RegExp(`/trilha/${primeiroFavo.id}/celula/${celulas[0].id}`));
  });

  it('endereço com id inválido é página que não existe, não formulário errado', async () => {
    const resposta = await agente.get('/trilha/abc').set('Accept', 'text/html').expect(404);
    assert.match(resposta.text, /Página não encontrada/);
    assert.doesNotMatch(resposta.text, /campos preenchidos/, 'quem digitou uma URL não preencheu campo nenhum');

    await agente.get('/trilha/0').set('Accept', 'application/json').expect(404);
  });

  it('favo travado não serve a lista de células nem por URL', async () => {
    const resposta = await agente.get(`/trilha/${segundoFavo.id}`).set('Accept', 'text/html').expect(403);
    assert.doesNotMatch(resposta.text, /Por que guardar\?/, 'nem o nome das células vaza');
  });

  it('concluir a primeira célula troca o botão para "Repetir" e abre a seguinte', async () => {
    await progressService.registrarTentativa(idUsuario, celulas[0].id, { erros: 0, pontuacao: 100, concluiu: true });

    const pagina = await agente.get(`/trilha/${primeiroFavo.id}`).set('Accept', 'text/html').expect(200);

    assert.match(pagina.text, /3 de 3 estrelas/, 'a leitura de tela recebe as estrelas em texto');
    assert.match(pagina.text, /Repetir/, 'célula concluída convida a repetir');
    // A segunda célula abriu, e o jogo dela — o Arraste e Classifique — existe
    // desde a T-07.3: ela vira link, e não mais "em breve". As duas seguintes
    // continuam travadas, então nenhuma "em breve" sobra nesta tela.
    assert.match(pagina.text, new RegExp(`href="/trilha/${primeiroFavo.id}/celula/${celulas[1].id}"`));
    assert.doesNotMatch(pagina.text, /em breve/);

    const trilha = await agente.get('/trilha').set('Accept', 'text/html').expect(200);
    assert.match(trilha.text, /25%/);
  });

  /**
   * O botão não pode prometer o que o servidor recusa. Antes bastava o tipo de
   * jogo ter validador para o "Jogar" aparecer, e célula com conteúdo de
   * demonstração levava a criança direto a um 422.
   */
  it('célula com conteúdo de demonstração não oferece "Jogar"', async () => {
    const conteudoDeVerdade = await banco.conexao.query('SELECT body FROM contents WHERE cell_id = ?', [
      celulas[1].id,
    ]);
    await banco.conexao.query(
      "UPDATE contents SET body = JSON_OBJECT('tipo', 'placeholder', 'texto', 'Em produção.') WHERE cell_id = ?",
      [celulas[1].id],
    );

    const pagina = await agente.get(`/trilha/${primeiroFavo.id}`).set('Accept', 'text/html').expect(200);

    assert.doesNotMatch(pagina.text, new RegExp(`celula/${celulas[1].id}"`), 'sem link para o que não dá para jogar');
    assert.match(pagina.text, /em breve/, 'a célula aberta avisa em vez de prometer');

    await banco.conexao.query('UPDATE contents SET body = ? WHERE cell_id = ?', [
      JSON.stringify(conteudoDeVerdade[0][0].body),
      celulas[1].id,
    ]);
  });

  it('sem faixa etária a trilha mostra estado vazio, e não erro', async () => {
    await banco.conexao.query('UPDATE profiles SET age_band_id = NULL WHERE user_id = ?', [idUsuario]);

    const pagina = await agente.get('/trilha').set('Accept', 'text/html').expect(200);
    assert.match(pagina.text, /ainda está sendo montada/);
    assert.match(pagina.text, /beenie_vem\.png/, 'estado vazio tem mascote e ação, nunca só "nada aqui"');
  });
});
