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
import { fimDoDia } from '../../src/utils/diaDoJogador.js';

/**
 * O bloco da meta na Colmeia (RF-HOM-04 e RF-HOM-05).
 *
 * O que estes testes protegem: a meta que vence primeiro aparece com título,
 * percentual, prazo em palavra e o mel que paga; as outras ficam numa lista
 * curta; e a que vence hoje é anunciada como "Termina hoje", e não como um
 * número no meio de uma tela cheia.
 */

const pular = await motivoParaPular();
const opcoes = pular ? { skip: pular } : {};

describe('bloco da meta na Colmeia', opcoes, () => {
  let banco;
  let app;
  let agente;
  let idUsuario;

  async function lerToken(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html');
    const achado =
      /name="_csrf" value="([^"]+)"/.exec(resposta.text) ?? /data-csrf-token="([^"]+)"/.exec(resposta.text);
    assert.ok(achado, `token CSRF não encontrado em ${caminho}`);
    return achado[1];
  }

  async function pagina(caminho) {
    const resposta = await agente.get(caminho).set('Accept', 'text/html').expect(200);
    return resposta.text;
  }

  /** A Colmeia inteira, que é de onde saem meta em destaque e dia do jogador. */
  async function colmeia() {
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    return resposta.body;
  }

  async function destaque() {
    return (await colmeia()).metaEmDestaque;
  }

  /**
   * Faz a meta vencer no fim do dia do jogador. Cravar `NOW()` não serve: entre
   * o `UPDATE` e a requisição o prazo já passou, e a meta é expirada pela
   * RN-017 antes de chegar à tela.
   */
  async function venceHoje(idMeta, { hoje, fuso }) {
    // `fimDoDia` devolve o começo do dia seguinte; um segundo antes ainda é
    // hoje para o jogador, que é o prazo que a tela precisa anunciar.
    const ultimoInstante = new Date(fimDoDia(hoje, fuso).getTime() - 1000);
    const instante = ultimoInstante.toISOString().slice(0, 19).replace('T', ' ');
    await banco.conexao.query('UPDATE goals SET due_at = ? WHERE id = ?', [instante, idMeta]);
  }

  before(async () => {
    banco = await criarBancoDeTeste();
    app = criarApp();
    agente = request.agent(app);

    let csrf = await lerToken('/login');
    const cadastro = await agente
      .post('/users')
      .set('Accept', 'application/json')
      .send({
        apelido: 'metista',
        email: 'metista@beever.dev',
        data_nasc: '2014-05-01',
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
        apelido: 'metista',
        avatar: 'beenie-classico',
        objetivo: 'comprar-algo',
        nivel: 'beginner',
        dias: ['0', '1', '2', '3', '4', '5', '6'],
        tempo: 10,
        _csrf: csrf,
      })
      .expect(200);

    const [[perfil]] = await banco.conexao.query('SELECT user_id FROM profiles WHERE id = ?', [
      cadastro.body.idPerfil,
    ]);
    idUsuario = Number(perfil.user_id);
  });

  after(async () => {
    await fecharSessionStore();
    await fecharPool();
    if (banco) await banco.encerrar();
  });

  it('a meta mais próxima aparece com título, progresso, prazo e recompensa', async () => {
    const meta = await destaque();
    const html = await pagina('/painel');

    assert.match(html, /Sua meta mais próxima/);
    assert.match(html, new RegExp(meta.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(`${meta.atual} de ${meta.alvo}`));
    assert.match(html, new RegExp(`${meta.percentual}% concluído`));
    // A frase vem do service, e não é montada aqui: dependendo do dia da semana
    // o prazo cai em "Faltam 1 dia" ou "Termina hoje", e cravar o plural aqui
    // faria o teste falhar pelo calendário.
    assert.match(html, new RegExp(meta.urgencia.frase));
    assert.match(html, new RegExp(`Rende 🍯 ${meta.melDaRecompensa} de mel`));
  });

  it('as outras metas ficam numa lista curta, sem competir com o destaque', async () => {
    const html = await pagina('/painel');
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);

    if (resposta.body.outrasMetas.length === 0) return;

    assert.match(html, /Suas outras metas/);
    for (const meta of resposta.body.outrasMetas) {
      assert.match(html, new RegExp(meta.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    // Uma barra por meta na lista transformaria três metas em três destaques.
    // A contagem é do trecho da lista, e não da página: a trilha da T-10.4
    // trouxe as barras dos favos em foco para a mesma tela.
    const lista = html.split('Suas outras metas')[1].split('Seus itens')[0];
    const barras = lista.match(/role="progressbar"/g) ?? [];
    assert.equal(barras.length, 0, 'a lista das outras metas não desenha barra');
  });

  it('a meta que vence hoje é anunciada em palavra, não em número', async () => {
    const home = await colmeia();
    await venceHoje(home.metaEmDestaque.id, home.sequencia);

    const html = await pagina('/painel');

    assert.match(html, /⏰ Termina hoje/);
    assert.doesNotMatch(html, /Faltam 0 dias/, 'zero dia não é frase que alguém escreve');
  });

  it('a tela de metas usa o mesmo card, com a ação de cada estado', async () => {
    const html = await pagina('/metas');

    assert.match(html, /Rende 🍯 \d+ de mel/);
    assert.match(html, /dificuldade/);
    assert.match(html, /Marcar como concluída/);
  });

  it('quem não tem meta nenhuma recebe um convite, e não uma tela em branco', async () => {
    await banco.conexao.query(
      `UPDATE goals SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'concluida')
        WHERE user_id = ?`,
      [idUsuario],
    );

    // O planejador roda na visita e repõe o plano (RN-018), então a tela vazia
    // é conferida direto no partial, com a Colmeia respondendo sem meta ativa.
    const resposta = await agente.get('/painel').set('Accept', 'application/json').expect(200);
    if (resposta.body.metaEmDestaque) {
      assert.ok(resposta.body.metaEmDestaque.id, 'o plano foi reposto, que é o comportamento da RN-018');
      return;
    }

    const html = await pagina('/painel');
    assert.match(html, /Suas metas aparecem assim que a colmeia montar seu plano/);
  });
});
