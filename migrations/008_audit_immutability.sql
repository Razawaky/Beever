-- 008 — Torna a auditoria imutável de verdade.
--
-- A RNF-17 pede auditoria append-only. Até aqui isso era só contrato escrito no
-- comentário de 006: nada impedia um `UPDATE audit_logs SET ...` de reescrever
-- o histórico, e o documento de banco é explícito em não confiar no service.
--
-- Dois gatilhos que recusam qualquer alteração ou exclusão. É o único lugar do
-- projeto onde uso trigger, e por um motivo estreito: a regra é "esta linha
-- nunca muda", não tem exceção, e não existe como expressá-la em CHECK ou
-- constraint. Um service que "lembra" de não apagar não é garantia.
--
-- Complemento operacional, fora do alcance de uma migration: o usuário da
-- aplicação deveria ter só INSERT e SELECT em audit_logs. Isso é GRANT, roda
-- como root e está documentado em iniciar-proj.md. Os gatilhos valem mesmo se
-- alguém esquecer o GRANT — é a rede embaixo da rede.
--
-- Consequência aceita: corrigir uma linha errada de auditoria passa a exigir
-- desabilitar o gatilho conscientemente, como root. É esse o ponto.
--
-- REVERSÃO: DROP TRIGGER trg_audit_logs_sem_update; DROP TRIGGER
-- trg_audit_logs_sem_delete.

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_sem_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: alterar registro de auditoria nao e permitido (RNF-17)';

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_sem_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: apagar registro de auditoria nao e permitido (RNF-17)';
