import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chaveDoLimiteGlobal } from '../../src/middlewares/rateLimiters.js';

/**
 * A chave do limite global (RNF-02, RNF-09).
 *
 * A medição de carga da T-14.3 devolveu 120 respostas 429 em 600 requisições:
 * trinta crianças da mesma sala saem de um IP só e eram contadas como uma
 * pessoa (DT-112). Quem está logado e só está lendo passou a contar por sessão;
 * escrita e anônimo seguem por endereço, que é o que segura varredura em massa.
 */

function requisicao({ metodo = 'GET', usuario = null, ip = '200.1.2.3' } = {}) {
  return { method: metodo, ip, session: usuario ? { usuarioId: usuario } : {} };
}

describe('chave do limite global', () => {
  it('duas crianças do mesmo IP lendo caem em baldes diferentes', () => {
    const primeira = chaveDoLimiteGlobal(requisicao({ usuario: 11 }));
    const segunda = chaveDoLimiteGlobal(requisicao({ usuario: 12 }));

    assert.notEqual(primeira, segunda);
    assert.equal(primeira, 'sessao:11');
  });

  it('escrita continua contada por endereço, mesmo com sessão', () => {
    const escrita = chaveDoLimiteGlobal(requisicao({ metodo: 'POST', usuario: 11 }));
    const leitura = chaveDoLimiteGlobal(requisicao({ usuario: 11 }));

    assert.notEqual(escrita, leitura);
    assert.equal(escrita, chaveDoLimiteGlobal(requisicao({ metodo: 'PUT', usuario: 12 })));
  });

  it('quem não está logado é contado por endereço', () => {
    const anonimo = chaveDoLimiteGlobal(requisicao());
    const outroAnonimo = chaveDoLimiteGlobal(requisicao({ ip: '200.9.9.9' }));

    assert.equal(anonimo, chaveDoLimiteGlobal(requisicao({ metodo: 'POST' })));
    assert.notEqual(anonimo, outroAnonimo);
  });
});
