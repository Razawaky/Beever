-- 009 — Liga cada linha de auditoria à requisição que a produziu.
--
-- A T-02.5 deu um identificador a cada requisição e o carimbou em toda linha de
-- log. Faltava a outra ponta: quando a auditoria mostra que uma compra
-- aconteceu, não havia como achar no log o que mais aquela mesma requisição fez
-- — a validação que passou, a consulta que demorou, o erro logo depois.
--
-- Com esta coluna, auditoria e log se cruzam por um valor só. É a diferença
-- entre saber *que* algo aconteceu e conseguir reconstruir *como*.
--
-- Fica anulável de propósito: ação de cron e de script não nasce de requisição
-- nenhuma, e forçar um valor ali seria inventar um rastro que não existe.
--
-- CHAR(36) acompanha o formato do id gerado pela aplicação (UUID). Um id vindo
-- de proxy pode ser mais curto; mais longo que isso, a aplicação recusa e gera
-- o seu, então o tamanho é suficiente.
--
-- REVERSÃO: ALTER TABLE audit_logs DROP COLUMN request_id.

ALTER TABLE audit_logs
  ADD COLUMN request_id CHAR(36) DEFAULT NULL AFTER ip_hash,
  ADD KEY idx_audit_logs_request (request_id);
