# Rastreabilidade — requisito → arquivos → testes

Tabela exigida pela seção 7 do `docs/01-REQUISITOS-E-REGRAS.md` e material
direto da defesa do TCC.

**Escopo de hoje:** o arquivo nasceu na T-06.1 e cobre, por ora, só os
requisitos tocados a partir dela. O preenchimento retroativo das etapas E01 a
E05 é a **T-15.1**, na E15 — até lá, ausência aqui não significa requisito não
atendido, significa linha ainda não escrita.

**Situação** diz o quanto do requisito está de pé: *atendido* quando o caminho
inteiro existe e tem teste; *parcial* quando a peça desta etapa existe mas
depende de tarefa seguinte para valer no jogo.

| Requisito | Arquivos | Testes | Situação |
|---|---|---|---|
| **RN-002** — XP nunca é gasto nem perdido, só acumula | `src/repositories/userLevelsRepository.js` (`lancarXp` só aceita crédito), `src/services/levelsService.js` | `test/integration/recompensaDaCelula.test.js` — "o cache de user_levels continua batendo com o livro"; `scripts/reconcile.js` | atendido |
| **RN-003** — nível vem da tabela `levels`, nunca de fórmula no código | `scripts/seeds/01_levels.sql`, `src/services/levelsService.js` (`nivelParaXp`, `xpDoProximoNivel`) | `test/unit/levelsService.test.js` — leitura da curva, incluindo salto de vários níveis | atendido |
| **RN-001** — XP, pólen e mel são recompensas independentes, sem conversão entre si | `src/services/levelsService.js`, `src/services/pointsService.js`, `src/services/coinsService.js` — um service por recompensa, e o de XP calcula o bônus de nível mas não credita mel | `test/integration/recompensaDaCelula.test.js` — "subir de nível devolve o bônus de mel da curva, sem creditar mel aqui" | atendido |
| **RN-004** — mel nunca fica negativo; débito valida saldo e é atômico | `src/repositories/walletsRepository.js` (`debitarMel`, com `WHERE coins >= ?` na mesma instrução), `src/services/coinsService.js` (`debitar`) | `test/integration/recompensaDaCelula.test.js` — "gastar mais mel do que se tem é recusado, e não deixa rastro" | atendido |
| **RN-005** — valor monetário é inteiro, nunca `FLOAT` | `migrations/014_reward_modifiers.sql` (fator em `DECIMAL`, valores em mel seguem inteiros) | `test/integration/schema.test.js` — "não tem nenhuma coluna em ponto flutuante" | atendido |
| **RN-006** — todo valor de recompensa vem de configuração em banco | `migrations/003_rewards_ledgers.sql` (`reward_configs`), `migrations/014_reward_modifiers.sql`, `scripts/seeds/04_reward_configs.sql`, `scripts/seeds/07_reward_modifiers.sql`, `src/repositories/rewardConfigsRepository.js` | `test/integration/repositories/rewardConfigs.test.js` — os 54 combos de jogo, faixa e estrelas conferidos contra a escala do seed | atendido para a célula — XP, pólen e mel saem de `reward_configs` (`calcularXpDaCelula`, `calcularPolenDaCelula`, `calcularMelDaCelula`); tarefa e meta leem os catálogos delas |
| **RN-008** — repetir célula concluída paga 25% de XP e zero mel | `scripts/seeds/07_reward_modifiers.sql` (`repeticao-de-celula`), `src/repositories/rewardConfigsRepository.js` (`buscarModificador`), `src/services/levelsService.js` (`calcularXpDaCelula`), `src/services/pointsService.js` (`calcularPolenDaCelula`), `src/services/coinsService.js` (`calcularMelDaCelula`), `src/repositories/progressRepository.js` (estrela e pontuação só sobem) | `test/integration/repositories/rewardConfigs.test.js` — "traz o corte da repetição da RN-008 como número"; `test/integration/recompensaDaCelula.test.js` — "repetir a mesma célula paga 25% do XP" e "repetir não paga pólen nenhum" e "repetir não paga mel nenhum" | atendido — 25% de XP, zero pólen e zero mel; falta só o chamador da T-06.5 |
