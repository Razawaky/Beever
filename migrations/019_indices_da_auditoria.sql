-- 019 — Índices para a consulta de auditoria (RF-ADM-05).
--
-- A tabela já tinha índice por entidade e por ator, que é o que a escrita e a
-- consulta pontual precisavam. A tela de consulta acrescenta dois filtros que
-- hoje varrem tudo: por ação e por período.
--
-- `audit_logs` cresce a cada crédito de recompensa, então a varredura completa
-- não é hipótese distante — ela chega junto com o primeiro mês de uso, que é
-- exatamente quando alguém vai querer consultar.
--
-- O índice de ação leva `created_at` junto porque a tela ordena sempre por data
-- decrescente: sem a segunda coluna, o MySQL usaria o índice para filtrar e
-- ordenaria em memória depois.
--
-- REVERSÃO: ALTER TABLE audit_logs DROP KEY idx_audit_logs_action_created,
-- DROP KEY idx_audit_logs_created.

ALTER TABLE audit_logs
  ADD KEY idx_audit_logs_action_created (action, created_at),
  ADD KEY idx_audit_logs_created (created_at);
