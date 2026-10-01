-- 012 — Cinco durações de sessão no lugar de três.
--
-- A RN-011 nasceu com 5, 10 e 20 minutos, e o CHECK da migration 001 repetia
-- essa lista. Na abertura da T-04.3 a decisão de produto mudou: as durações
-- passam a ser 5, 10, 20, 30 e 45 minutos, para que o jogador mais velho consiga
-- marcar uma sessão de estudo de verdade sem ter de abrir o app duas vezes. O
-- texto da RN-011 foi atualizado junto, em `docs/01-REQUISITOS-E-REGRAS.md`.
--
-- Nenhuma linha existente vira inválida: a lista só cresce, e o padrão continua
-- 10. Por isso não há passo de correção de dados aqui.
--
-- A lista viaja em três lugares — este CHECK, `MINUTOS_POR_SESSAO` no
-- `profilesService` e o validador da rota. É duplicação consciente, explicada no
-- comentário do service: o banco é a última barreira, e sem ela um cliente que
-- não passe pelo service escreveria qualquer número.
--
-- REVERSÃO: só é segura depois de conferir que ninguém escolheu 30 ou 45
-- (SELECT COUNT(*) FROM profiles WHERE session_minutes IN (30, 45)).
--   ALTER TABLE profiles DROP CHECK ck_profiles_session_minutes;
--   ALTER TABLE profiles ADD CONSTRAINT ck_profiles_session_minutes
--     CHECK (session_minutes IN (5, 10, 20));

ALTER TABLE profiles
  DROP CHECK ck_profiles_session_minutes;

ALTER TABLE profiles
  ADD CONSTRAINT ck_profiles_session_minutes CHECK (session_minutes IN (5, 10, 20, 30, 45));
