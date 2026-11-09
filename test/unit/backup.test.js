import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ehBackupAntigo } from '../../scripts/backup.js';
import { escolherArquivo, podeExecutar } from '../../scripts/restaurar.js';

/**
 * A retenção apaga arquivo. Errar o critério significa ou encher o disco, ou
 * apagar o backup de ontem — por isso ele é testado isoladamente.
 */
describe('retenção de backups', () => {
  const agora = Date.parse('2026-08-17T12:00:00Z');
  const diasAtras = (dias) => agora - dias * 24 * 60 * 60 * 1000;

  it('apaga dump mais velho que o período de retenção', () => {
    assert.equal(ehBackupAntigo('beever-20260801-0300.sql', diasAtras(16), agora, 7), true);
  });

  it('preserva dump dentro do período', () => {
    assert.equal(ehBackupAntigo('beever-20260815-0300.sql', diasAtras(2), agora, 7), false);
  });

  it('preserva dump exatamente no limite', () => {
    assert.equal(ehBackupAntigo('beever-20260810-0300.sql', diasAtras(7), agora, 7), false);
  });

  it('não mexe em arquivo que não é dump', () => {
    assert.equal(ehBackupAntigo('README.md', diasAtras(90), agora, 7), false);
  });

  // Regressão da T-14.6: a retenção apagou o dump de antes da E01, guardado de
  // propósito. Marco tem nome próprio e não pode entrar na conta dos 7 dias.
  it('preserva dump de marco, guardado à mão, por mais velho que seja', () => {
    assert.equal(ehBackupAntigo('beever-antes-da-E01-20260817-1612.sql', diasAtras(400), agora, 7), false);
  });
});

/**
 * A restauração sobrescreve o banco. Escolher o arquivo errado, ou rodar sem
 * confirmação, custa os dados de quem estava usando.
 */
describe('guardas da restauração', () => {
  const argumentosComSim = ['--sim'];

  it('recusa rodar em produção, mesmo com confirmação', () => {
    const { permitido } = podeExecutar({
      producao: true,
      argumentos: argumentosComSim,
      nomeBanco: 'beever',
    });
    assert.equal(permitido, false);
  });

  it('recusa rodar sem a confirmação explícita', () => {
    const { permitido, motivo } = podeExecutar({
      producao: false,
      argumentos: [],
      nomeBanco: 'beever',
    });
    assert.equal(permitido, false);
    assert.match(motivo, /--sim/);
  });

  it('permite fora de produção e com confirmação', () => {
    const { permitido } = podeExecutar({
      producao: false,
      argumentos: argumentosComSim,
      nomeBanco: 'beever',
    });
    assert.equal(permitido, true);
  });
});

describe('escolha do dump a restaurar', () => {
  const dumps = ['beever-20260815-0300.sql', 'beever-20260902-1433.sql', 'README.md'];

  it('sem pedido, escolhe o dump mais recente pelo nome', () => {
    assert.equal(escolherArquivo(dumps), 'beever-20260902-1433.sql');
  });

  it('respeita o arquivo pedido quando ele existe', () => {
    assert.equal(escolherArquivo(dumps, 'beever-20260815-0300.sql'), 'beever-20260815-0300.sql');
  });

  it('recusa arquivo que não está na pasta', () => {
    assert.throws(() => escolherArquivo(dumps, 'beever-19990101-0000.sql'), /não existe/);
  });

  it('avisa quando não há dump nenhum', () => {
    assert.throws(() => escolherArquivo(['README.md']), /db:backup/);
  });
});
