-- 013 — As duas tabelas que o `GoalPlannerService` lê (RN-014 e RN-015).
--
-- A RN-014 é uma tabela de três linhas: 1–2 dias por semana → 1 meta de 28 dias,
-- dificuldade alta; 3–4 dias → 2 metas de 14 dias, média; 5–7 dias → 3 metas de
-- 7 dias, simples. Metade disso já existia em `goal_difficulties`, que traz
-- prazo, multiplicador e recompensa. O que não existia em lugar nenhum era
-- **quantas metas ativas** cada faixa de dias recebe — a decisão D-4 do laudo do
-- onboarding, tomada no checkpoint desta tarefa a favor de tabela própria.
--
-- Poderiam ser colunas novas em `goal_difficulties`, já que hoje cada faixa de
-- dias corresponde a exatamente uma dificuldade. Ficam separadas porque são
-- assuntos diferentes: uma diz o que a dificuldade vale, a outra diz que ritmo
-- de jogo ela atende. Amanhã, se duas faixas passarem a compartilhar
-- dificuldade, nada precisa ser migrado.
--
-- `goal_target_rules` é o tamanho do alvo. O princípio vem dos aplicativos que
-- fazem isso há anos com criança e adolescente — a meta é dimensionada pelo
-- tempo que a pessoa **disse** ter, não por um número fixo, e nunca nasce já
-- cumprida nem impossível. Como o onboarding já coleta dias por semana e minutos
-- por sessão (T-04.3), o alvo sai de:
--
--   incremento = base_per_session × (minutos_por_sessao / 10) × dias × semanas
--
-- arredondado para `rounding_step` (número redondo é número que criança lê) e
-- preso entre `min_increment` e `max_increment` (o desafio tem de ficar na faixa
-- em que ela ainda vence). A sessão de referência é de 10 minutos.
--
-- Todos os números moram aqui e no seed porque calibragem de jogo só se acerta
-- jogando: mexer no ritmo tem de ser editar seed e rodar, nunca alterar código.
--
-- REVERSÃO:
--   DROP TABLE goal_target_rules;
--   DROP TABLE goal_plan_rules;

CREATE TABLE IF NOT EXISTS goal_plan_rules (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  min_weekdays  TINYINT UNSIGNED NOT NULL,
  max_weekdays  TINYINT UNSIGNED NOT NULL,
  active_goals  TINYINT UNSIGNED NOT NULL,
  difficulty_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_plan_rules_faixa (min_weekdays, max_weekdays),
  KEY idx_goal_plan_rules_difficulty (difficulty_id),
  CONSTRAINT fk_goal_plan_rules_difficulty FOREIGN KEY (difficulty_id) REFERENCES goal_difficulties (id) ON DELETE RESTRICT,
  -- A faixa começa em 1: a RF-ONB-03 exige pelo menos um dia marcado, e semana
  -- vazia não tem linha nesta tabela de propósito — é erro, não plano.
  CONSTRAINT ck_goal_plan_rules_faixa CHECK (min_weekdays >= 1 AND max_weekdays >= min_weekdays AND max_weekdays <= 7),
  -- RN-018: sempre existe pelo menos uma meta ativa.
  CONSTRAINT ck_goal_plan_rules_metas CHECK (active_goals >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS goal_target_rules (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_type_id     BIGINT UNSIGNED NOT NULL,
  base_per_session DECIMAL(10,3) NOT NULL,
  min_increment    BIGINT NOT NULL,
  max_increment    BIGINT NOT NULL,
  rounding_step    BIGINT NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_goal_target_rules_type (goal_type_id),
  CONSTRAINT fk_goal_target_rules_type FOREIGN KEY (goal_type_id) REFERENCES goal_types (id) ON DELETE CASCADE,
  CONSTRAINT ck_goal_target_rules_valores CHECK (
    base_per_session > 0 AND min_increment >= 1 AND max_increment >= min_increment AND rounding_step >= 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
