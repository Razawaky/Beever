-- 005 — Economia: itens, comportamento, compras, inventário, cofre e ciclos.
--
-- É a parte pedagógica do produto: a criança aprende que casa valoriza, celular
-- deprecia, carro custa todo mês e barraquinha gera renda. Nada disso existia —
-- o `item` antigo tinha nome, preço e uma categoria em texto livre.
--
-- No fim do arquivo, a foreign key de `hives.required_item_id` que ficou
-- pendente em 002, agora que `items` existe.
--
-- REVERSÃO: ALTER TABLE hives DROP FOREIGN KEY fk_hives_required_item, depois
-- DROP TABLE patrimony_snapshots, economic_cycles, vault_transactions,
-- vault_transaction_types, vaults, inventory, inventory_statuses, purchases,
-- item_requirements, item_requirement_types, item_behaviors_map, items,
-- item_behaviors, item_categories.

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

-- Moradia, transporte, tecnologia, negócios, cosméticos, utilitários (seção 6
-- dos requisitos).
CREATE TABLE IF NOT EXISTS item_categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(60) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-034: neutro · valoriza · deprecia · custo_fixo · gera_renda.
CREATE TABLE IF NOT EXISTS item_behaviors (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(40) NOT NULL,
  name        VARCHAR(80) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_behaviors_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-041: cosmético não entra no patrimônio, e `counts_in_patrimony` é o que
-- torna isso verificável — não uma regra escondida no service.
-- RN-005: preço, custo e renda são BIGINT em unidades de mel. As taxas são
-- DECIMAL(6,3), nunca FLOAT.
-- `upgrade_of_item_id` sustenta a compra com desconto de upgrade (RF-LOJ).
CREATE TABLE IF NOT EXISTS items (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug                VARCHAR(60) NOT NULL,
  name                VARCHAR(120) NOT NULL,
  description_kid     VARCHAR(500) NOT NULL,
  category_id         BIGINT UNSIGNED NOT NULL,
  price               BIGINT NOT NULL,
  counts_in_patrimony TINYINT(1) NOT NULL DEFAULT 1,
  valuation_rate      DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  valuation_floor_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
  valuation_cap_pct   SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  upkeep_cost         BIGINT NOT NULL DEFAULT 0,
  income_per_cycle    BIGINT NOT NULL DEFAULT 0,
  upgrade_of_item_id  BIGINT UNSIGNED DEFAULT NULL,
  is_consumable       TINYINT(1) NOT NULL DEFAULT 0,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at          DATETIME DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_slug (slug),
  KEY idx_items_category_active (category_id, is_active),
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES item_categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_items_upgrade_of FOREIGN KEY (upgrade_of_item_id) REFERENCES items (id) ON DELETE SET NULL,
  CONSTRAINT ck_items_price CHECK (price >= 0),
  CONSTRAINT ck_items_upkeep CHECK (upkeep_cost >= 0),
  CONSTRAINT ck_items_income CHECK (income_per_cycle >= 0),
  CONSTRAINT ck_items_floor CHECK (valuation_floor_pct BETWEEN 0 AND 100),
  CONSTRAINT ck_items_cap CHECK (valuation_cap_pct >= valuation_floor_pct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-035: um item combina comportamentos — carro é `deprecia` **e**
-- `custo_fixo`. Por isso N:N, e não uma coluna de comportamento no item.
CREATE TABLE IF NOT EXISTS item_behaviors_map (
  item_id     BIGINT UNSIGNED NOT NULL,
  behavior_id BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, behavior_id),
  KEY idx_item_behaviors_map_behavior (behavior_id),
  CONSTRAINT fk_item_behaviors_map_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT fk_item_behaviors_map_behavior FOREIGN KEY (behavior_id) REFERENCES item_behaviors (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- nivel_minimo · favo_concluido · item_prerequisito · patrimonio_minimo.
CREATE TABLE IF NOT EXISTS item_requirement_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_item_requirement_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-033: só compra "Garagem" quem tem "Casa". Cada linha é um requisito; o
-- item pode ter vários, e todos precisam valer.
CREATE TABLE IF NOT EXISTS item_requirements (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id             BIGINT UNSIGNED NOT NULL,
  requirement_type_id BIGINT UNSIGNED NOT NULL,
  required_level      SMALLINT UNSIGNED DEFAULT NULL,
  required_hive_id    BIGINT UNSIGNED DEFAULT NULL,
  required_item_id    BIGINT UNSIGNED DEFAULT NULL,
  required_patrimony  BIGINT DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_requirements_item (item_id),
  CONSTRAINT fk_item_requirements_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT fk_item_requirements_type FOREIGN KEY (requirement_type_id) REFERENCES item_requirement_types (id) ON DELETE RESTRICT,
  CONSTRAINT fk_item_requirements_hive FOREIGN KEY (required_hive_id) REFERENCES hives (id) ON DELETE CASCADE,
  CONSTRAINT fk_item_requirements_item_ref FOREIGN KEY (required_item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT ck_item_requirements_patrimony CHECK (required_patrimony IS NULL OR required_patrimony >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Compra e inventário
-- ---------------------------------------------------------------------------

-- RN-032: `price_at_purchase` é o preço no momento da compra e **nunca** é
-- recalculado a partir de `items.price`. Se o item valorizar depois, o
-- histórico não muda.
-- `total_price` é guardado, não derivado: é registro contábil da transação,
-- pelo mesmo motivo de `price_at_purchase`. O CHECK garante que os dois batem.
CREATE TABLE IF NOT EXISTS purchases (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  item_id           BIGINT UNSIGNED NOT NULL,
  quantity          INT UNSIGNED NOT NULL DEFAULT 1,
  price_at_purchase BIGINT NOT NULL,
  discount_applied  BIGINT NOT NULL DEFAULT 0,
  total_price       BIGINT NOT NULL,
  purchased_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchases_user_date (user_id, purchased_at),
  CONSTRAINT fk_purchases_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE RESTRICT,
  CONSTRAINT ck_purchases_values CHECK (quantity > 0 AND price_at_purchase >= 0 AND discount_applied >= 0 AND total_price >= 0),
  CONSTRAINT ck_purchases_total CHECK (total_price = price_at_purchase * quantity - discount_applied)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ativo · inadimplente · vendido. RN-037: dois ciclos inadimplente e o item é
-- vendido automaticamente por 50%.
CREATE TABLE IF NOT EXISTS inventory_statuses (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_statuses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Uma linha por unidade adquirida, não uma linha por par usuário-item: cada
-- unidade tem valor atual e ciclos de inadimplência próprios, e o inventário
-- antigo (só quantidade) não conseguia representar isso.
-- RN-039: `current_value` é o que entra na conta do patrimônio.
CREATE TABLE IF NOT EXISTS inventory (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  item_id        BIGINT UNSIGNED NOT NULL,
  purchase_id    BIGINT UNSIGNED DEFAULT NULL,
  status_id      BIGINT UNSIGNED NOT NULL,
  current_value  BIGINT NOT NULL DEFAULT 0,
  overdue_cycles TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_equipped    TINYINT(1) NOT NULL DEFAULT 0,
  acquired_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sold_at        DATETIME DEFAULT NULL,
  sold_value     BIGINT DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_user_status (user_id, status_id),
  KEY idx_inventory_item (item_id),
  CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_purchase FOREIGN KEY (purchase_id) REFERENCES purchases (id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_status FOREIGN KEY (status_id) REFERENCES inventory_statuses (id) ON DELETE RESTRICT,
  CONSTRAINT ck_inventory_values CHECK (current_value >= 0 AND (sold_value IS NULL OR sold_value >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Cofre
-- ---------------------------------------------------------------------------

-- RN-042: rende 2% por ciclo semanal, configurável — daí a taxa ser coluna e
-- não constante. RN-004 vale aqui também: saldo de cofre nunca fica negativo, e
-- quem garante é o CHECK.
CREATE TABLE IF NOT EXISTS vaults (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  balance       BIGINT NOT NULL DEFAULT 0,
  interest_rate DECIMAL(6,3) NOT NULL DEFAULT 2.000,
  goal_amount   BIGINT DEFAULT NULL,
  goal_due_at   DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vaults_user (user_id),
  CONSTRAINT fk_vaults_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_vaults_balance CHECK (balance >= 0),
  CONSTRAINT ck_vaults_rate CHECK (interest_rate >= 0),
  CONSTRAINT ck_vaults_goal CHECK (goal_amount IS NULL OR goal_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- deposito · saque · rendimento · bonus_de_meta.
CREATE TABLE IF NOT EXISTS vault_transaction_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vault_transaction_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Append-only, mesma lógica dos livros de recompensa: o extrato do cofre é a
-- prova de como o saldo chegou onde chegou. RN-043: o mel sacado não rende no
-- ciclo do saque, e é por isso que a data de cada movimento importa.
CREATE TABLE IF NOT EXISTS vault_transactions (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  transaction_type_id BIGINT UNSIGNED NOT NULL,
  amount            BIGINT NOT NULL,
  balance_after     BIGINT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vault_transactions_user_created (user_id, created_at),
  CONSTRAINT fk_vault_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_vault_transactions_type FOREIGN KEY (transaction_type_id) REFERENCES vault_transaction_types (id) ON DELETE RESTRICT,
  CONSTRAINT ck_vault_transactions_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Ciclo econômico e patrimônio
-- ---------------------------------------------------------------------------

-- RN-036: o ciclo é semanal e processado de forma preguiçosa — quem some por
-- seis semanas recebe os seis ciclos de uma vez ao voltar. A UNIQUE
-- (user_id, cycle_number) é o que garante que cada ciclo é aplicado **uma**
-- vez, mesmo com duas requisições simultâneas. É a idempotência escrita no
-- banco, não confiada ao service.
-- `summary` guarda o extrato do ciclo em JSON: valorização, depreciação,
-- custos, renda e vendas forçadas — é o que a tela de "resumo da semana" lê.
CREATE TABLE IF NOT EXISTS economic_cycles (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  cycle_number INT UNSIGNED NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  summary      JSON DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_economic_cycles_user_cycle (user_id, cycle_number),
  CONSTRAINT fk_economic_cycles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- RN-039: patrimônio = mel na carteira + saldo do cofre + valor atual dos itens.
-- A conta é feita pelo service; esta tabela é a foto semanal, para o gráfico de
-- evolução não precisar reconstruir o passado.
CREATE TABLE IF NOT EXISTS patrimony_snapshots (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  snapshot_date DATE NOT NULL,
  wallet_coins  BIGINT NOT NULL DEFAULT 0,
  vault_balance BIGINT NOT NULL DEFAULT 0,
  items_value   BIGINT NOT NULL DEFAULT 0,
  total_value   BIGINT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patrimony_snapshots_user_date (user_id, snapshot_date),
  CONSTRAINT fk_patrimony_snapshots_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_patrimony_snapshots_values CHECK (wallet_coins >= 0 AND vault_balance >= 0 AND items_value >= 0 AND total_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------
-- Pendência de 002
-- ---------------------------------------------------------------------------

-- RN-028: um favo pode exigir um item específico no inventário para liberar.
-- A coluna nasceu em 002; a foreign key só podia vir agora.
--
-- O MySQL não tem ADD CONSTRAINT IF NOT EXISTS, e o arquivo precisa ser
-- reaplicável sem erro como todos os outros. Daí o teste antes do ALTER.
SET @fk_hives_required_item := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'hives'
    AND constraint_name = 'fk_hives_required_item'
);

SET @sql_fk_hives := IF(
  @fk_hives_required_item = 0,
  'ALTER TABLE hives ADD CONSTRAINT fk_hives_required_item FOREIGN KEY (required_item_id) REFERENCES items (id) ON DELETE SET NULL',
  'DO 0'
);

PREPARE stmt_fk_hives FROM @sql_fk_hives;
EXECUTE stmt_fk_hives;
DEALLOCATE PREPARE stmt_fk_hives;
