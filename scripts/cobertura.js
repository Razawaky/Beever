import { spawn } from 'node:child_process';

/**
 * O portão de cobertura da RNF-28.
 *
 * A regra do requisito é "100% dos services de cálculo", e não um percentual
 * global: piso de aplicação inteira deixa um service de mel ficar em 60% com o
 * total verde. Por isso a medição inclui só a lista abaixo, e o piso vale sobre
 * ela.
 *
 * **O que entra na lista:** service que decide um número que a criança vê ou
 * gasta — mel, pólen, XP, patrimônio, progresso, posição. Fica de fora quem só
 * orquestra tela ou cadastro (`adminContentService`, `profilesService`), quem é
 * infraestrutura (`healthService`, `limpezaService`) e os repositories, cujo
 * lugar de prova é o teste de integração contra banco real.
 *
 * Rode com `npm run test:cobertura`.
 */
const SERVICES_DE_CALCULO = [
  'achievementsService',
  'coinsService',
  'comportamentosDoItem',
  'conquistasDoJogador',
  'criteriosDeConquista',
  'economicCycleService',
  'eventosDeConquista',
  'gameSessionService',
  'goalPlannerService',
  'goalProgressSources',
  'goalsService',
  'inventoryService',
  'itemsService',
  'leagueService',
  'levelsService',
  'patrimonyService',
  'pointsService',
  'progressService',
  'purchasesService',
  'shopService',
  'streakService',
  'taskProgressSources',
  'tasksService',
  'vaultService',
];

/**
 * Os dois pisos.
 *
 * Linha é 100% e não se negocia: linha que nenhum teste executa é regra que
 * ninguém provou. Ramo é catraca — o número é o que a suíte alcança hoje, e ele
 * só sobe. Cravar 100% de ramo obrigaria a forçar caminhos que só acontecem com
 * o banco em estado impossível, e o teste que nasce disso executa linha sem
 * afirmar nada. O que falta para 100% está listado em
 * `docs/15-COBERTURA-DE-TESTES.md`, um a um, com o motivo.
 *
 * Função é catraca pelo mesmo motivo: as duas que faltam são funções anônimas
 * dentro de caminhos que não acontecem — retorno de `map` sobre lista que nunca
 * vem vazia, por exemplo. Perseguir esse número produz teste sem afirmação.
 */
const PISO_DE_LINHA = 100;
const PISO_DE_RAMO = 91;
const PISO_DE_FUNCAO = 99;

const argumentos = [
  '--test',
  '--experimental-test-coverage',
  `--test-coverage-lines=${PISO_DE_LINHA}`,
  `--test-coverage-branches=${PISO_DE_RAMO}`,
  `--test-coverage-functions=${PISO_DE_FUNCAO}`,
  ...SERVICES_DE_CALCULO.map((service) => `--test-coverage-include=src/services/${service}.js`),
  'test/**/*.test.js',
];

const processo = spawn(process.execPath, argumentos, {
  stdio: 'inherit',
  // Avisa os testes de tempo que o cronômetro não vale nesta execução: a
  // instrumentação infla o número que a RNF-01 cobra.
  env: { ...process.env, NODE_ENV: 'test', TESTES_DE_BANCO: '1', MEDINDO_COBERTURA: '1' },
});

processo.on('exit', (codigo) => process.exit(codigo ?? 1));
