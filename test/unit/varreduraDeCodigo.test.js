import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Varredura estática da T-14.1: o que dá para provar lendo o código, sem subir
 * banco nem servidor.
 *
 * A ideia destes testes não é achar o problema de hoje — é barrar o de amanhã.
 * Um teste que só experimenta payload de ataque prova o presente; este aqui
 * reprova a próxima consulta montada por concatenação e a próxima rota de
 * escrita sem validador, antes de qualquer um deles chegar a produção.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function lerPasta(pasta) {
  const diretorio = path.join(raiz, pasta);
  return readdirSync(diretorio)
    .filter((nome) => nome.endsWith('.js'))
    .map((nome) => ({ nome, conteudo: readFileSync(path.join(diretorio, nome), 'utf8') }));
}

/** O arquivo sem comentário: palavra de SQL dentro de comentário não é SQL. */
function semComentarios(conteudo) {
  return conteudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * As interpolações auditadas dos repositories, em três famílias.
 *
 * Constante do módulo em MAIÚSCULAS: lista de colunas, junção e recorte fixos,
 * escritos no arquivo e nunca vindos de fora. Fragmento montado internamente
 * (`sql`, `faixa.sql`, `partes`, `marcadores`): o pedaço é gerado pelo próprio
 * repository e leva `?` dentro, então o valor continua entrando por parâmetro.
 * Número já domado (`limiteSeguro`, `deslocamentoSeguro`): `LIMIT` não aceita
 * marcador no MySQL, então o número é convertido e limitado antes de entrar.
 *
 * Acrescentar linha aqui é declarar que a expressão foi auditada. Quem não
 * quiser auditar usa `?`, que é o caminho normal.
 */
const INTERPOLACOES_AUDITADAS = new Set([
  // Constantes de módulo.
  'CAMPOS',
  'CAMPOS_PUBLICOS',
  'CAMPOS_DA_CONSULTA',
  'JOINS',
  'JOIN_PROGRESSO',
  'ATIVO',
  'CONCLUIDA',
  'CELULA_ATIVA',
  'PROGRESSO',
  // Constantes locais com texto fixo de SQL, escritas no próprio arquivo.
  'percentual',
  'completo',
  'referencia',
  'comparacao',
  'sentido',
  'marcadores',
  // A mesma lista de colunas, prefixada com o apelido da tabela na consulta.
  "CAMPOS.split(', ').map((campo) => `a.${campo}`).join(', ')",
  "CAMPOS_PUBLICOS.split(', ').map((campo) => `u.${campo}`).join(', ')",
  // Fragmentos montados pelo repository, com `?` dentro.
  'sql',
  'faixa.sql',
  "partes.join(' AND ')",
  'marcadores(codigosDeFaixa.length)',
  'marcadores(idsDeFavo.length)',
  // Números domados antes de entrar no LIMIT/OFFSET.
  'limiteSeguro(limite)',
  'deslocamentoSeguro(deslocamento)',
  'limiteSeguro(limite, { padrao: 5, maximo: 20 })',
  'limiteSeguro(limite, { padrao: 20 })',
  'limiteSeguro(limite, { maximo })',
  // Identificadores que não podem virar `?`, protegidos por lista fechada
  // dentro do próprio arquivo (`COLUNAS_DE_SALDO` e `LIVROS`).
  'coluna',
  'tabela',
  // Fora de SQL: mensagens de erro.
  'motivo',
  'atorTipo',
  'campo',
  'e.mensagem',
]);

/** Toda expressão `${...}` do arquivo, com aninhamento de uma camada resolvido. */
function interpolacoesDe(conteudo) {
  const achadas = [];
  for (const trecho of conteudo.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    achadas.push(trecho[1].trim());
  }
  return achadas;
}

describe('varredura de SQL (RNF-05)', () => {
  it('toda interpolação dentro de repository é uma das auditadas', () => {
    const novas = [];

    for (const arquivo of lerPasta('src/repositories')) {
      for (const expressao of interpolacoesDe(arquivo.conteudo)) {
        if (!INTERPOLACOES_AUDITADAS.has(expressao)) novas.push(`${arquivo.nome}: \${${expressao}}`);
      }
    }

    assert.deepEqual(
      novas,
      [],
      'interpolação nova em repository: use `?` ou audite a expressão em INTERPOLACOES_AUDITADAS',
    );
  });

  it('nenhum repository concatena texto com `+` dentro de uma consulta', () => {
    const suspeitas = [];

    for (const arquivo of lerPasta('src/repositories')) {
      for (const linha of arquivo.conteudo.split('\n')) {
        // Palavra de SQL, aspas fechando e um `+` logo depois: é assim que uma
        // consulta montada por concatenação se parece.
        if (/(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|VALUES)[^'"`]*['"]\s*\+/i.test(linha)) {
          suspeitas.push(`${arquivo.nome}: ${linha.trim()}`);
        }
      }
    }

    assert.deepEqual(suspeitas, []);
  });

  it('nenhuma camada acima de repository fala SQL', () => {
    const vazamentos = [];

    for (const pasta of ['src/services', 'src/controllers', 'src/middlewares']) {
      for (const arquivo of lerPasta(pasta)) {
        if (/\b(SELECT|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b/.test(semComentarios(arquivo.conteudo))) {
          vazamentos.push(`${pasta}/${arquivo.nome}`);
        }
      }
    }

    assert.deepEqual(vazamentos, [], 'SQL só existe em src/repositories');
  });
});

/** O bloco inteiro de uma chamada `router.<metodo>(...)`, parênteses casados. */
function blocoDaRota(conteudo, inicio) {
  let profundidade = 0;
  for (let posicao = conteudo.indexOf('(', inicio); posicao < conteudo.length; posicao += 1) {
    if (conteudo[posicao] === '(') profundidade += 1;
    if (conteudo[posicao] === ')') {
      profundidade -= 1;
      if (profundidade === 0) return conteudo.slice(inicio, posicao + 1);
    }
  }
  return conteudo.slice(inicio);
}

/**
 * Rotas de escrita que não recebem nada do cliente além da sessão. Não têm o
 * que validar, e exigir validador delas seria teatro.
 */
const ROTAS_SEM_ENTRADA = ['/logout'];

describe('varredura de validação de entrada (RNF-06)', () => {
  it('toda rota que muda estado valida a entrada', () => {
    const semValidacao = [];

    for (const arquivo of lerPasta('src/routes')) {
      for (const chamada of arquivo.conteudo.matchAll(/router\.(post|put|patch|delete)\(/g)) {
        const bloco = blocoDaRota(arquivo.conteudo, chamada.index);
        const caminho = /['"]([^'"]*)['"]/.exec(bloco)?.[1] ?? '?';

        if (ROTAS_SEM_ENTRADA.includes(caminho)) continue;
        const valida = /\bvalidate\b|\bbody\(|\bparam\(|\bquery\(|regras|validacao|idNaUrl/.test(bloco);

        if (!valida) semValidacao.push(`${arquivo.nome}: ${chamada[1].toUpperCase()} ${caminho}`);
      }
    }

    assert.deepEqual(semValidacao, []);
  });

  it('a suíte enxerga todas as rotas de escrita, e não um punhado delas', () => {
    let total = 0;
    for (const arquivo of lerPasta('src/routes')) {
      total += [...arquivo.conteudo.matchAll(/router\.(post|put|patch|delete)\(/g)].length;
    }

    // Guarda contra o regex parar de casar por uma mudança de estilo: se o
    // número cair, a varredura acima passou a olhar menos rota do que existe.
    assert.ok(total >= 36, `só ${total} rotas de escrita encontradas`);
  });
});

describe('varredura de escape em view (RNF-07)', () => {
  it('nenhuma view imprime dado sem escapar com `<%- %>`', () => {
    const perigosas = [];
    const pastas = ['src/views/pages', 'src/views/partials'];

    const varrer = (diretorio) => {
      for (const entrada of readdirSync(path.join(raiz, diretorio), { withFileTypes: true })) {
        const caminho = path.join(diretorio, entrada.name);
        if (entrada.isDirectory()) {
          varrer(caminho);
          continue;
        }
        if (!entrada.name.endsWith('.ejs')) continue;

        const conteudo = readFileSync(path.join(raiz, caminho), 'utf8');
        for (const saida of conteudo.matchAll(/<%-\s*([^%]+?)\s*%>/g)) {
          // `include` monta template, não imprime dado. Todo o resto que sai sem
          // escapar é candidato a XSS armazenado.
          if (!/^include\(/.test(saida[1].trim())) perigosas.push(`${caminho}: <%- ${saida[1].trim()} %>`);
        }
      }
    };

    varrer(pastas[0]);
    varrer(pastas[1]);

    assert.deepEqual(perigosas, []);
  });
});

describe('varredura de segredo em código (RNF-13)', () => {
  it('nenhum segredo escrito no código; tudo vem do ambiente', () => {
    const suspeitas = [];

    for (const pasta of ['src/config', 'src/services', 'src/middlewares', 'src/controllers']) {
      for (const arquivo of lerPasta(pasta)) {
        for (const linha of arquivo.conteudo.split('\n')) {
          // Atribuição de senha, segredo ou chave a um texto literal não vazio.
          if (/(senha|password|secret|segredo|apiKey|token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(linha)) {
            suspeitas.push(`${pasta}/${arquivo.nome}: ${linha.trim()}`);
          }
        }
      }
    }

    assert.deepEqual(suspeitas, []);
  });
});
