-- 011 — Guarda em que passo do onboarding o jogador parou.
--
-- Até aqui as respostas do wizard viviam só na memória da aba: fechar o
-- navegador no meio começava tudo do zero. É a lacuna 4 do laudo da T-04.1, e
-- com cinco passos — um deles obrigatório por regra — deixou de ser aceitável.
--
-- A decisão D-2 daquele laudo escolheu o servidor em vez do `localStorage`: um
-- rascunho guardado no navegador não sobrevive a trocar de aparelho, e a
-- criança que começa no computador da escola termina em casa.
--
-- A coluna guarda o índice do **próximo** passo a mostrar, não o último
-- respondido: zero significa "ainda não respondeu nada", que é o valor certo
-- para toda conta que já existe.
--
-- Não há CHECK de limite superior de propósito. Quantos passos o wizard tem é
-- decisão de produto, que vive em `profilesService.PASSOS_DO_ONBOARDING`; um
-- CHECK aqui obrigaria uma migration a cada passo novo, e o service já recusa
-- passo que não está na lista dele antes de escrever.
--
-- REVERSÃO: ALTER TABLE profiles DROP COLUMN onboarding_step.

ALTER TABLE profiles
  ADD COLUMN onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER initial_goal_id;
