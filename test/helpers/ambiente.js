/**
 * Aponta o pool da aplicação para o banco de teste.
 *
 * Os testes de repository não podem falar com o banco por fora: eles precisam
 * exercitar o mesmo `src/config/database.js` que a aplicação usa, senão provam
 * que o SQL funciona no arnês e não que funciona no produto. Só que o pool lê
 * o banco de `src/config/env.js` no momento em que é importado — e isso, por
 * padrão, é o banco de desenvolvimento.
 *
 * Este módulo resolve a ordem: ele não importa **nada** do projeto, então roda
 * antes de qualquer coisa que leia `env`, e ajusta as variáveis a tempo. O
 * `dotenv` que o `env.js` carrega não desfaz o ajuste, porque ele nunca
 * sobrescreve variável que já existe em `process.env`.
 *
 * Importe-o **antes** de qualquer módulo do projeto:
 *
 *     import '../../helpers/ambiente.js';
 *     import { criarBancoDeTeste } from '../../helpers/banco.js';
 *
 * As credenciais são de root porque criar e derrubar banco exige isso, e é a
 * mesma escolha já feita em `helpers/banco.js`. Vale só para `beever_teste`,
 * que nasce e morre dentro da suíte.
 */

/**
 * Um banco por arquivo de teste.
 *
 * O `node --test` roda os arquivos em paralelo, um processo cada. Se todos
 * usassem o mesmo `beever_teste`, o `before` de um arquivo derrubaria o banco
 * que outro está usando no meio do teste — e a suíte falharia de formas
 * diferentes a cada execução, que é o pior tipo de falha. O nome do arquivo
 * vira sufixo: `beever_teste_users`, `beever_teste_goals`, e assim por diante.
 */
function nomeDoBancoDesteArquivo() {
  if (process.env.DB_TEST_NAME) return process.env.DB_TEST_NAME;

  const arquivo = process.argv[1] ?? '';
  const base = arquivo.split('/').pop()?.replace(/\.test\.js$/, '') ?? '';
  const sufixo = base.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);
  return sufixo ? `beever_teste_${sufixo}` : 'beever_teste';
}

export const NOME_BANCO_TESTE = nomeDoBancoDesteArquivo();

process.env.DB_TEST_NAME = NOME_BANCO_TESTE;
process.env.DB_NAME = NOME_BANCO_TESTE;
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = process.env.DB_ROOT_PASSWORD ?? 'root';
process.env.SESSION_SECRET ??= 'segredo-de-teste';
process.env.DB_HOST ??= '127.0.0.1';
