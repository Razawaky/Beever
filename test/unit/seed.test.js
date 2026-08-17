import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { listarSeeds } from '../../scripts/seed.js';

/**
 * A ordem dos seeds não é detalhe: 03 depende das categorias criadas em 02, e
 * 06 depende de tudo. Um seed aplicado fora de ordem falha em foreign key.
 */
describe('runner de seeds', () => {
  it('devolve só arquivos .sql, em ordem lexical', async () => {
    const diretorio = await mkdtemp(path.join(tmpdir(), 'beever-seeds-'));
    await writeFile(path.join(diretorio, '02_segundo.sql'), 'SELECT 1;');
    await writeFile(path.join(diretorio, '01_primeiro.sql'), 'SELECT 1;');
    await writeFile(path.join(diretorio, 'notas.md'), 'não é seed');

    assert.deepEqual(await listarSeeds(diretorio), ['01_primeiro.sql', '02_segundo.sql']);
  });

  it('enxerga os seis seeds reais do projeto, na ordem de dependência', async () => {
    assert.deepEqual(await listarSeeds(), [
      '01_levels.sql',
      '02_age_bands_domains.sql',
      '03_items_catalog.sql',
      '04_reward_configs.sql',
      '05_demo_content.sql',
      '06_admin_dev.sql',
    ]);
  });
});
