-- 028 — O Quarto do Beenie entra como primeira atividade de "Primeiros passos".
--
-- A célula nova se chama "De onde vem o dinheiro?" e usa o jogo que existia só
-- como protótipo isolado. Ela assume a ordem 1; as quatro atividades que já
-- estavam no favo passam para 2–5 sem trocar de id, então o progresso já
-- registrado nas contas continua apontando para o mesmo conteúdo.
--
-- Os ids das tarefas no JSON são os mesmos de `estadoDoJogo.js`. O servidor só
-- recebe a lista do que a pessoa concluiu e conta as faltas: a nota continua
-- sendo calculada no backend, nunca no cliente.
--
-- REVERSÃO: DELETE FROM contents WHERE cell_id IN (SELECT id FROM cells WHERE title = 'De onde vem o dinheiro?');
--   DELETE FROM cells WHERE title = 'De onde vem o dinheiro?';
--   UPDATE cells SET order_index = order_index - 1 WHERE hive_id = (SELECT id FROM hives WHERE slug = 'primeiros-passos');
--   DELETE FROM reward_configs WHERE game_type_id = (SELECT id FROM game_types WHERE slug = 'quarto-do-beenie');
--   DELETE FROM game_types WHERE slug = 'quarto-do-beenie';

INSERT INTO game_types (slug, name, description)
VALUES ('quarto-do-beenie', 'Quarto do Beenie', 'Arrume o quarto girando as paredes e guardando um item por vez')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, description = novo.description;

-- A ordem é única por favo. Descer primeiro as ordens altas evita colidir com
-- a linha que ainda ocupa o lugar seguinte.
UPDATE cells SET order_index = 5
 WHERE hive_id = (SELECT id FROM hives WHERE slug = 'primeiros-passos')
   AND order_index = 4;
UPDATE cells SET order_index = 4
 WHERE hive_id = (SELECT id FROM hives WHERE slug = 'primeiros-passos')
   AND order_index = 3;
UPDATE cells SET order_index = 3
 WHERE hive_id = (SELECT id FROM hives WHERE slug = 'primeiros-passos')
   AND order_index = 2;
UPDATE cells SET order_index = 2
 WHERE hive_id = (SELECT id FROM hives WHERE slug = 'primeiros-passos')
   AND order_index = 1;

INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title, estimated_seconds)
SELECT favo.id, jogo.id, favo.age_band_id, 1, 'De onde vem o dinheiro?', 300
  FROM hives favo
  JOIN game_types jogo ON jogo.slug = 'quarto-do-beenie'
 WHERE favo.slug = 'primeiros-passos'
   AND NOT EXISTS (
     SELECT 1 FROM cells existente
      WHERE existente.hive_id = favo.id AND existente.order_index = 1
   );

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'quarto-beenie',
    'enunciado', 'Gire as paredes, pegue um item por vez e guarde cada coisa no lugar certo. Quando quiser, clique na porta.',
    'total', 6,
    'tarefas', JSON_ARRAY('bau', 'armario', 'cama', 'quadro', 'mesa', 'janela')
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'primeiros-passos'
   AND celula.title = 'De onde vem o dinheiro?'
   AND NOT EXISTS (SELECT 1 FROM contents existente WHERE existente.cell_id = celula.id AND existente.version = 1)
ON DUPLICATE KEY UPDATE body = VALUES(body);

-- `hive_progress` é cache. Quem já havia concluído o favo inteiro continua com
-- 4 de 4 no cache até alguém jogar de novo; aqui ele passa a 4 de 5, sem
-- inventar conclusão para a célula nova.
UPDATE hive_progress progresso
  JOIN hives favo ON favo.id = progresso.hive_id
  JOIN (
    SELECT hive_id, COUNT(*) AS total
      FROM cells
     WHERE deleted_at IS NULL
     GROUP BY hive_id
  ) AS contagem ON contagem.hive_id = progresso.hive_id
   SET progresso.total_cells = contagem.total,
       progresso.percent = ROUND(progresso.completed_cells * 100 / contagem.total),
       progresso.completed_at = IF(
         progresso.completed_cells >= contagem.total,
         COALESCE(progresso.completed_at, UTC_TIMESTAMP()),
         NULL
       )
 WHERE favo.slug = 'primeiros-passos';

-- Sem isto a célula aparece, mas `abrirCelula` não encontra recompensa para o
-- tipo novo. O seed 04 já faz o cartesiano; aqui repetimos só para o slug novo.
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
     WHERE jogo.slug = 'quarto-do-beenie'
  ) AS calculado
ON DUPLICATE KEY UPDATE
  xp_amount     = calculado.xp,
  points_amount = calculado.polen,
  coins_amount  = calculado.mel;
