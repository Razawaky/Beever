/**
 * Se dá para confiar no cronômetro nesta execução.
 *
 * A medição de cobertura instrumenta cada linha do código, e isso infla
 * justamente o número que a RNF-01 cobra: a mesma visita que leva 1,2 s na
 * execução normal passa dos 2 s sob instrumentação. Medir tempo e medir
 * cobertura na mesma rodada mede as duas coisas erradas.
 *
 * Por isso o `scripts/cobertura.js` marca a execução, e os testes de tempo se
 * pulam sozinhos ali. Quem cobra o teto da RNF-01 é o `npm run test:db`.
 */
export const medindoCobertura = process.env.MEDINDO_COBERTURA === '1';

export const opcoesDeTempo = medindoCobertura
  ? { skip: 'o cronômetro não vale sob instrumentação de cobertura' }
  : {};
