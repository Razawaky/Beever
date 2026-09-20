import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requireAdmin } from '../../src/middlewares/requireAdmin.js';

/**
 * O middleware que guarda a área administrativa, sem banco e sem HTTP.
 *
 * São quatro desfechos e cada um importa: anônimo pedindo página vai para o
 * login, anônimo pedindo JSON recebe 401, jogador comum recebe 403 nos dois
 * casos, e admin passa. O 403 é o próprio aceite da E12.
 */

function requisicao({ sessao = null, aceita = 'html' } = {}) {
  return {
    session: sessao,
    accepts: () => aceita,
  };
}

function resposta() {
  return {
    destino: null,
    redirect(caminho) {
      this.destino = caminho;
    },
  };
}

describe('requireAdmin', () => {
  it('manda quem não está logado para o login administrativo', () => {
    const res = resposta();
    let chamouNext = false;

    requireAdmin(requisicao(), res, () => {
      chamouNext = true;
    });

    assert.equal(res.destino, '/admin/login');
    assert.equal(chamouNext, false);
  });

  it('responde 401 para quem não está logado e pediu JSON', () => {
    let erro = null;
    requireAdmin(requisicao({ aceita: 'json' }), resposta(), (recebido) => {
      erro = recebido;
    });

    assert.equal(erro.status, 401);
  });

  it('recusa com 403 quem está logado e não é administrador', () => {
    for (const aceita of ['html', 'json']) {
      let erro = null;
      requireAdmin(requisicao({ sessao: { usuarioId: 7, ehAdmin: false }, aceita }), resposta(), (recebido) => {
        erro = recebido;
      });

      assert.equal(erro.status, 403, `pedido em ${aceita} deveria receber 403`);
      assert.equal(erro.codigo, 'ACESSO_NEGADO');
    }
  });

  it('deixa o administrador passar', () => {
    let argumento = 'não chamado';
    requireAdmin(requisicao({ sessao: { usuarioId: 1, ehAdmin: true } }), resposta(), (recebido) => {
      argumento = recebido;
    });

    assert.equal(argumento, undefined, 'next() sem erro é o que libera a rota');
  });
});
