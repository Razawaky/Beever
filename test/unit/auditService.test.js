import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { admin, atorDaSessao, sistema, usuario } from '../../src/services/auditService.js';

/**
 * Os atores da trilha de auditoria.
 *
 * Testar isto parece exagero até lembrar por que o service existe: antes dele
 * cada chamador escrevia o tipo de ator à mão, e apareceu de tudo — `'Usuario'`,
 * `'usuario'`, `'Sistema'`. Os slugs aqui têm que casar com `audit_actor_types`,
 * senão o `INSERT` não encontra linha e a auditoria some (o repository passou a
 * gritar nesse caso, mas o certo é não chegar lá).
 */

describe('auditService — atores', () => {
  it('usuário e admin carregam o id de quem agiu', () => {
    assert.deepEqual(usuario(7), { tipo: 'usuario', id: 7 });
    assert.deepEqual(admin(9), { tipo: 'admin', id: 9 });
  });

  it('sistema não tem id, porque não há pessoa por trás', () => {
    assert.deepEqual(sistema(), { tipo: 'sistema', id: null });
  });

  it('a sessão decide entre usuário e admin', () => {
    assert.deepEqual(atorDaSessao({ usuarioId: 3, ehAdmin: false }), { tipo: 'usuario', id: 3 });
    assert.deepEqual(atorDaSessao({ usuarioId: 4, ehAdmin: true }), { tipo: 'admin', id: 4 });
  });

  it('os tipos são exatamente os slugs semeados em audit_actor_types', () => {
    const tipos = [usuario(1).tipo, admin(1).tipo, sistema().tipo];
    assert.deepEqual(tipos, ['usuario', 'admin', 'sistema']);
  });
});
