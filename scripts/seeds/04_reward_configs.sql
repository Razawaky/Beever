-- Configuração de recompensa (RN-006).
--
-- Quanto vale concluir uma célula depende do tipo de jogo, da faixa de idade e
-- de quantas estrelas a criança tirou. Nenhum desses números pode viver no
-- código, e é por isso que este arquivo existe.
--
-- A base é por estrela; a faixa multiplica, porque a mesma célula custa mais
-- esforço para quem está na faixa mais avançada:
--   1 estrela → 10 XP · 5 pólen · 5 mel
--   2 estrelas → 20 XP · 10 pólen · 12 mel
--   3 estrelas → 35 XP · 20 pólen · 25 mel
--   faixa A ×1,0 · faixa B ×1,2 · faixa C ×1,5
--
-- Gerado por produto cartesiano em vez de 54 linhas escritas à mão: assim
-- acrescentar um tipo de jogo em 02 já traz a configuração dele junto, e não
-- existe combinação esquecida.
--
-- O cálculo fica numa tabela derivada (`calculado`) porque o ON DUPLICATE KEY
-- UPDATE precisa referenciar os valores prontos — e porque um SELECT terminado
-- em `JOIN ... ON` confunde o parser com o `ON DUPLICATE` que vem em seguida.

INSERT INTO reward_configs (game_type_id, age_band_id, stars, xp_amount, points_amount, coins_amount)
SELECT calculado.game_type_id, calculado.age_band_id, calculado.stars,
       calculado.xp, calculado.polen, calculado.mel
  FROM (
    SELECT jogo.id AS game_type_id,
           faixa.id AS age_band_id,
           base.estrelas AS stars,
           ROUND(base.xp    * fator.valor) AS xp,
           ROUND(base.polen * fator.valor) AS polen,
           ROUND(base.mel   * fator.valor) AS mel
      FROM game_types jogo
      CROSS JOIN age_bands faixa
      CROSS JOIN (
        SELECT 1 AS estrelas, 10 AS xp,  5 AS polen,  5 AS mel
        UNION ALL SELECT 2, 20, 10, 12
        UNION ALL SELECT 3, 35, 20, 25
      ) AS base
      CROSS JOIN LATERAL (
        SELECT CASE faixa.code WHEN 'A' THEN 1.0 WHEN 'B' THEN 1.2 ELSE 1.5 END AS valor
      ) AS fator
  ) AS calculado
ON DUPLICATE KEY UPDATE
  xp_amount     = calculado.xp,
  points_amount = calculado.polen,
  coins_amount  = calculado.mel;
