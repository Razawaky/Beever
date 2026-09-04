-- 006 — Auditoria.
--
-- RN-010: toda alteração de XP, pólen, mel, compra e ação administrativa gera
-- linha aqui, com ator, ação, estado antes/depois e quando.
--
-- Substitui as quatro tabelas de log ad-hoc do dump original (`log_user`,
-- `log_perfil`, `log_acesso_user`, `log_acesso_perfil`), que guardavam cópias
-- de nome e e-mail. Aquilo violava a RN-053: apagar a conta não apagava o dado
-- pessoal, que sobrevivia no log. Aqui só entram identificadores e estado em
-- JSON — nunca cópia de identidade.
--
-- Append-only por contrato: sem UPDATE, sem DELETE. Não há foreign key para
-- `actor_id` de propósito, porque o registro precisa sobreviver à exclusão da
-- conta que o originou (RN-053 manda manter o agregado anonimizado).
--
-- `schema_migrations` não é criada aqui: quem cria é o próprio runner
-- (`scripts/migrate.js`), antes de aplicar qualquer arquivo. A coluna de
-- checksum que a seção 6 do documento de banco exige entra na T-01.4.
--
-- REVERSÃO: DROP TABLE audit_logs, audit_actor_types.

CREATE TABLE IF NOT EXISTS audit_actor_types (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(40) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_actor_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Os dois índices atendem às duas consultas reais: a tela de auditoria do admin
-- filtra por entidade (RF-ADM-04), e a investigação de um caso específico filtra
-- por ator em ordem de tempo. Sem eles, as duas são varredura de tabela inteira.
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_type_id BIGINT UNSIGNED NOT NULL,
  actor_id      BIGINT UNSIGNED DEFAULT NULL,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(60) NOT NULL,
  entity_id     BIGINT UNSIGNED DEFAULT NULL,
  before_state  JSON DEFAULT NULL,
  after_state   JSON DEFAULT NULL,
  ip_hash       CHAR(64) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_actor_created (actor_id, created_at),
  CONSTRAINT fk_audit_logs_actor_type FOREIGN KEY (actor_type_id) REFERENCES audit_actor_types (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
