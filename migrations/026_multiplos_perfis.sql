-- 026 — Perfis múltiplos por conta.
--
-- A RN-050 dizia "um perfil por usuário" e o schema garantia isso com a UNIQUE
-- de `profiles.user_id`. A seleção de perfis existia só como tela, sem nada
-- além da conta principal para escolher.
--
-- A partir daqui, cada perfil adicional é uma linha-filha em `users`:
--   * a conta principal continua com `owner_user_id = NULL`;
--   * cada perfil adicional aponta para a conta em `owner_user_id`.
--
-- O motivo de reaproveitar `users` (em vez de criar uma tabela de perfil de
-- jogo paralela) é que quase todo o domínio já é indexado por `user_id`:
-- carteira, níveis, XP, metas, agenda, inventário, cofre, compras, progresso da
-- trilha e liga. Como cada perfil tem um `user_id` próprio, esses dados ficam
-- isolados sem alterar dezenas de tabelas e consultas.
--
-- `profiles` continua 1:1 com a linha de `users`: um perfil de jogo para cada
-- persona. A conta principal também tem o seu, e é por isso que ela aparece na
-- tela de seleção como o primeiro perfil.
--
-- E-mail e senha passam a ser opcionais porque perfil adicional não é conta de
-- login: não recebe e-mail, não recebe senha e não consegue autenticar. As
-- consultas de login filtram `owner_user_id IS NULL`, então uma linha-filha
-- nunca entra por engano, mesmo que alguém grave um e-mail nela no futuro.
--
-- REVERSÃO (depois de apagar os perfis-filho, porque as colunas voltariam a
-- ser NOT NULL): ALTER TABLE users DROP FOREIGN KEY fk_users_owner,
-- DROP KEY idx_users_owner, DROP COLUMN owner_user_id,
-- MODIFY email VARCHAR(190) NOT NULL, MODIFY password_hash VARCHAR(255) NOT NULL.

ALTER TABLE users
  MODIFY email VARCHAR(190) NULL,
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN owner_user_id BIGINT UNSIGNED NULL AFTER id,
  ADD KEY idx_users_owner (owner_user_id),
  ADD CONSTRAINT fk_users_owner
    FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE;
