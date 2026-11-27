import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { enviarRecuperacaoDeSenha, montarEmailDeRecuperacao } from '../../src/services/emailService.js';

describe('emailService.montarEmailDeRecuperacao', () => {
  const email = montarEmailDeRecuperacao({
    apelido: 'Ana',
    link: 'https://beever.exemplo/redefinir-senha?token=abc',
    validadeEmMinutos: 60,
  });

  it('leva o link inteiro, sem cortar o token', () => {
    assert.match(email.texto, /https:\/\/beever\.exemplo\/redefinir-senha\?token=abc/);
  });

  it('diz quanto tempo o link vale', () => {
    assert.match(email.texto, /60 minutos/);
  });

  it('avisa quem não pediu que pode ignorar', () => {
    assert.match(email.texto, /Se não foi você/);
  });
});

describe('emailService.enviarRecuperacaoDeSenha', () => {
  it('em teste o envio não sai da máquina e não quebra', async () => {
    await enviarRecuperacaoDeSenha({
      para: 'ana@beever.dev',
      apelido: 'Ana',
      link: 'http://localhost:3000/redefinir-senha?token=abc',
      validadeEmMinutos: 60,
    });
  });
});
