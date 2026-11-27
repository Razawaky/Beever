-- 027 — Log em blockchain (cadeia de hashes SHA-256).
--
-- Cada bloco guarda data/hora, ator, ação, hash do bloco anterior e o próprio
-- hash. Alterar qualquer bloco muda o hash dele e quebra o encadeamento de
-- todos os seguintes, o que a função de validação detecta.
--
-- Complementa a `audit_logs` (006/008): aquela IMPEDE alteração por trigger;
-- esta DETECTA alteração mesmo que alguém contorne o banco. Por isso NÃO tem
-- trigger de imutabilidade: a demonstração precisa conseguir adulterar um
-- bloco para mostrar a validação acusando.
--
-- RN-053: só entram identificadores. Nunca nome ou e-mail.
--
-- `data_hora` é texto ISO-8601 de propósito: o hash é recalculado a partir
-- desse valor, e um DATETIME poderia voltar do banco com formato ou fuso
-- diferentes e invalidar a cadeia sem que ninguém tenha mexido em nada.
--
-- O UNIQUE em `hash_anterior` impede que dois blocos tenham o mesmo pai, ou
-- seja, impede a cadeia de bifurcar sob requisições simultâneas.
--
-- REVERSÃO: DROP TABLE log_blockchain.

CREATE TABLE IF NOT EXISTS log_blockchain (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  data_hora     VARCHAR(30) NOT NULL,
  usuario       VARCHAR(100) NOT NULL,
  acao          VARCHAR(255) NOT NULL,
  hash_anterior CHAR(64) NOT NULL,
  hash_atual    CHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_log_blockchain_hash_anterior (hash_anterior)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;