-- 015 — A partida guarda o progresso parcial, para poder ser retomada.
--
-- A RF-JOG-07 pede que a criança volte de onde parou quando a sessão é
-- interrompida. O `docs/CONTRATO-DE-JOGO.md` já reservava o lugar desta coluna
-- desde a T-07.1, para que nenhum jogo inventasse o próprio jeito de salvar.
--
-- Guardar no navegador não serve: o Beever é web multiplataforma, e a criança
-- que começa no computador da escola precisa continuar no celular de casa — a
-- mesma razão pela qual o rascunho do onboarding vive no servidor.
--
-- JSON e não uma tabela por resposta: o formato é diferente em cada jogo (índice
-- de alternativa, id de caixa, valor por categoria, depósito por ciclo), muda
-- junto com o jogo e não é consultado por pedaço — só é lido inteiro na hora de
-- retomar. Modelar coluna a coluna obrigaria uma migration a cada jogo novo.
--
-- Fica NULL enquanto o jogador não decidiu nada, e continua valendo depois de a
-- partida fechar: é histórico do que foi respondido, não estado vivo.
--
-- REVERSÃO: ALTER TABLE game_sessions DROP COLUMN saved_state;

ALTER TABLE game_sessions
  ADD COLUMN saved_state JSON DEFAULT NULL AFTER is_replay;
