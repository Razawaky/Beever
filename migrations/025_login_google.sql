-- 025 — Login com Google.
--
-- Conta criada pelo Google nasce sem senha, então `password_hash` passa a
-- aceitar nulo. `google_sub` é o id fixo que o Google dá à pessoa: o e-mail da
-- conta Google pode mudar, o `sub` não.
--
-- REVERSÃO: ALTER TABLE users DROP KEY uq_users_google_sub, DROP COLUMN google_sub,
--   MODIFY password_hash VARCHAR(255) NOT NULL; (só depois de dar senha a toda conta sem senha)

ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN google_sub VARCHAR(255) NULL AFTER password_hash,
  ADD UNIQUE KEY uq_users_google_sub (google_sub);
