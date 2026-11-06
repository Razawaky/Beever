-- 014 — Os fatores que reduzem uma recompensa viram dado.
--
-- A RN-008 corta o XP da repetição para 25% e zera o mel. A RN-006 diz que
-- valor de recompensa vem do banco, nunca do código — e 0,25 é valor de
-- recompensa. Sem esta tabela, o número apareceria escrito à mão no XpService,
-- no PointsService e no CoinService.
--
-- `reward_configs` não serve: ela é indexada por tipo de jogo, faixa e
-- estrelas, e o corte da repetição não varia por nenhum dos três.
--
-- Um fator por tipo de recompensa na mesma linha, como em `reward_configs`:
-- o service lê uma linha e multiplica, sem três consultas.
--
-- DECIMAL e não FLOAT (RN-005). O dinheiro continua inteiro; o que é fracionado
-- aqui é o multiplicador, e o arredondamento é do service.
--
-- REVERSÃO: DROP TABLE reward_modifiers;

CREATE TABLE IF NOT EXISTS reward_modifiers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug          VARCHAR(60) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  xp_factor     DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  points_factor DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  coins_factor  DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reward_modifiers_slug (slug),
  CONSTRAINT ck_reward_modifiers_factors CHECK (xp_factor >= 0 AND points_factor >= 0 AND coins_factor >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
