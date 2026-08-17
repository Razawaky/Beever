/**
 * Sanea o `LIMIT` de uma consulta.
 *
 * Por que existe: o `mysql2` manda os parâmetros de `execute` como texto, e o
 * MySQL recusa texto em `LIMIT ?` — a consulta morre com "Incorrect arguments
 * to mysqld_stmt_execute". Não é bug de quem chama; é como o protocolo de
 * prepared statement trata essa cláusula.
 *
 * A saída é sempre um inteiro positivo produzido aqui dentro, nunca o valor que
 * veio de fora, então interpolá-la no texto do SQL não abre porta para
 * injeção: o que entra na consulta é um número que este arquivo escolheu. Todo
 * o resto continua parametrizado, como manda a regra do projeto.
 *
 * O teto existe para que uma requisição não peça um milhão de linhas e leve o
 * tempo de resposta junto (RNF de 2 s).
 */
export function limiteSeguro(valor, { padrao = 50, maximo = 200 } = {}) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) return padrao;
  return Math.min(numero, maximo);
}
