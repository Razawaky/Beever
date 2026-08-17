import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ehBackupAntigo } from '../../scripts/backup.js';

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
});
