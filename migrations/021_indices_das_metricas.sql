-- 021 — Índices para o painel de métricas (RF-ADM-04).
--
-- Todo índice das tabelas grandes começa por `user_id`, porque todos nasceram
-- para responder "o que este jogador fez". O painel pergunta o contrário: "o que
-- todo mundo fez neste período", e nenhuma das quatro métricas tinha por onde
-- começar a não ser varrendo a tabela.
--
-- São as tabelas que mais crescem — uma linha por partida, uma por compra, uma
-- por dia de cada jogador —, então a varredura chega junto com o uso.
--
-- A ordem das colunas segue o formato da pergunta: primeiro o que filtra por
-- igualdade ou intervalo, depois o que agrupa.
--
-- REVERSÃO: ALTER TABLE game_sessions DROP KEY idx_game_sessions_status_fim;
-- ALTER TABLE purchases DROP KEY idx_purchases_data_item;
-- ALTER TABLE streak_events DROP KEY idx_streak_events_data_tipo;

-- "Quantas partidas foram concluídas" e "quantos jogadores distintos apareceram".
ALTER TABLE game_sessions
  ADD KEY idx_game_sessions_status_fim (status_id, finished_at);

-- "Quais itens venderam mais no período": o intervalo filtra, o item agrupa.
ALTER TABLE purchases
  ADD KEY idx_purchases_data_item (purchased_at, item_id);

-- "Dos dias marcados que passaram, quantos foram cumpridos" (retenção).
ALTER TABLE streak_events
  ADD KEY idx_streak_events_data_tipo (event_date, event_type_id);
