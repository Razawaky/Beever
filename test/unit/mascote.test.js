import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { MASCOTES, mascote } from '../../src/config/mascote.js';

const diretorioPublico = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/public',
);

/**
 * O catálogo é o único ponto de troca da arte da Beenie, e o dia da troca é
 * justamente quando um caminho errado passa despercebido: a imagem some da tela
 * sem erro nenhum. Este teste transforma esse silêncio em falha.
 */
describe('catálogo do mascote', () => {
  it('toda pose aponta para um arquivo que existe', () => {
    for (const [pose, arte] of Object.entries(MASCOTES)) {
      const caminho = path.join(diretorioPublico, arte.arquivo);
      assert.ok(existsSync(caminho), `arquivo da pose ${pose} não existe: ${arte.arquivo}`);
    }
  });

  it('toda pose tem texto alternativo, porque a imagem pode não carregar', () => {
    for (const [pose, arte] of Object.entries(MASCOTES)) {
      assert.ok(arte.alt.trim().length > 0, `pose ${pose} sem alt`);
    }
  });

  it('pose desconhecida falha na hora, em vez de virar imagem quebrada', () => {
    assert.throws(() => mascote('dancando'), /Pose de mascote desconhecida/);
  });
});
