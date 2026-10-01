-- 020 — Dois favos não podem disputar a mesma posição na faixa.
--
-- `cells` sempre teve `UNIQUE (hive_id, order_index)`, e é ela que torna "a
-- próxima célula" uma pergunta com resposta. `hives` tinha só um índice comum
-- em `(age_band_id, order_index)`, então nada impedia duas posições iguais — e
-- o `buscarAnterior` da RN-027, que ordena por `order_index DESC LIMIT 1`,
-- passaria a depender do desempate do MySQL para dizer qual é o favo anterior.
--
-- Não era hipótese: a T-12.2 deixou o painel trocar a faixa de um favo sem
-- recalcular a posição, e o favo chegava na faixa nova com a ordem antiga.
--
-- REVERSÃO: ALTER TABLE hives DROP KEY uq_hives_faixa_ordem,
-- ADD KEY idx_hives_order (age_band_id, order_index).

ALTER TABLE hives
  DROP KEY idx_hives_order,
  ADD UNIQUE KEY uq_hives_faixa_ordem (age_band_id, order_index);
