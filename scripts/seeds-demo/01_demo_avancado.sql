-- Conta de demonstração avançada: a colmeia de quem já jogou muito.
--
-- Por que existe: a conta `ana@beever.dev` mostra o começo do jogo, e começo é
-- tela quase vazia — nível 1, liga sem posição, dois favos. Para demonstrar o
-- Beever a alguém de fora é preciso uma conta com passado: trilha fechada,
-- patrimônio construído, cofre com extrato, sequência longa e disputa de liga.
--
-- Faixa C de propósito: é a única com custo fixo e depreciação ligados
-- (RN-038), então a economia aparece inteira. E, pela RN-029, quem está na
-- faixa C enxerga também as faixas anteriores — então a trilha dele são os seis
-- favos e as 26 células, todas concluídas aqui. O teto do "maximizado" é o
-- conteúdo que existe: as conquistas de 30, 75 e 150 células e a de 12 favos
-- não têm como ser alcançadas com 26 células e 6 favos.
--
-- O hash da senha chega em @avancado_hash, definido pelo scripts/seed.js.
--
-- Idempotência por exclusão, igual ao arquivo 06: a conta e os colegas de liga
-- são apagados e recriados a cada execução, senão os lançamentos dos livros
-- dobrariam e a reconciliação passaria a acusar divergência.

DELETE FROM users WHERE email IN (
  'leo@beever.dev',
  'bia@beever.dev', 'caio@beever.dev', 'duda@beever.dev', 'enzo@beever.dev', 'flor@beever.dev'
);

-- ---------------------------------------------------------------------------
-- A conta
-- ---------------------------------------------------------------------------

INSERT INTO users (email, nickname, password_hash, birth_date, onboarding_completed_at, last_login_at)
VALUES ('leo@beever.dev', 'Léo', @avancado_hash, CURDATE() - INTERVAL 14 YEAR,
        UTC_TIMESTAMP() - INTERVAL 120 DAY, UTC_TIMESTAMP());

SET @leo = LAST_INSERT_ID();

-- Em subconsulta, e não em JOIN: `INSERT ... SELECT` com JOIN que não casa
-- insere zero linhas em silêncio, e o perfil sumido só aparece como 404 na
-- primeira visita. Assim, slug errado vira NULL e o NOT NULL reprova o seed.
SET @faixa_c = (SELECT id FROM age_bands WHERE code = 'C');
SET @avatar_leo = (SELECT id FROM avatars WHERE slug = 'beenie-dourado');
SET @objetivo_leo = (SELECT id FROM initial_goals WHERE slug = 'entender-juros');

INSERT INTO profiles (user_id, age_band_id, avatar_id, initial_goal_id, session_minutes)
VALUES (@leo, @faixa_c, @avatar_leo, @objetivo_leo, 30);

-- Sete dias disponíveis: o plano de metas mais cheio que a RN-014 permite.
INSERT INTO schedules (user_id, weekday, is_available)
SELECT @leo, dia.numero, 1
  FROM (SELECT 0 AS numero UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS dia;

INSERT INTO guardian_consents (user_id, guardian_email) VALUES (@leo, 'responsavel@beever.dev');

-- ---------------------------------------------------------------------------
-- Trilha: as 26 células das três faixas, todas com três estrelas
-- ---------------------------------------------------------------------------

INSERT INTO cell_progress (user_id, cell_id, stars, attempts, errors, best_score, first_completed_at, last_completed_at)
SELECT @leo, celula.id, 3, 3, 0, 100,
       UTC_TIMESTAMP() - INTERVAL (90 - celula.order_index * 5) DAY,
       UTC_TIMESTAMP() - INTERVAL (20 - celula.order_index) DAY
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
  JOIN age_bands faixa ON faixa.id = favo.age_band_id
 WHERE faixa.code IN ('A', 'B', 'C');

INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
SELECT @leo, favo.id, COUNT(celula.id), COUNT(celula.id), 100, UTC_TIMESTAMP() - INTERVAL 20 DAY
  FROM hives favo
  JOIN age_bands faixa ON faixa.id = favo.age_band_id
  JOIN cells celula ON celula.hive_id = favo.id
 WHERE faixa.code IN ('A', 'B', 'C')
 GROUP BY favo.id;

-- Uma partida fechada por célula, mais dois replays de cada. O replay paga
-- menos (RN-008), e é isso que os livros abaixo registram.
INSERT INTO game_sessions (
  user_id, cell_id, status_id, token, started_at, finished_at,
  duration_seconds, errors, stars, xp_awarded, points_awarded, coins_awarded, is_replay
)
SELECT @leo, celula.id, estado.id,
       UUID(),
       UTC_TIMESTAMP() - INTERVAL (90 - celula.order_index * 5 + rodada.numero) DAY,
       UTC_TIMESTAMP() - INTERVAL (90 - celula.order_index * 5 + rodada.numero) DAY + INTERVAL 6 MINUTE,
       360, 0, 3,
       IF(rodada.numero = 0, 120, 60),
       IF(rodada.numero = 0,  70, 35),
       IF(rodada.numero = 0,  90, 45),
       IF(rodada.numero = 0, 0, 1)
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
  JOIN age_bands faixa ON faixa.id = favo.age_band_id
  JOIN game_session_statuses estado ON estado.slug = 'concluida'
  JOIN (SELECT 0 AS numero UNION ALL SELECT 1 UNION ALL SELECT 2) AS rodada
 WHERE faixa.code IN ('A', 'B', 'C');

-- ---------------------------------------------------------------------------
-- Livros
-- ---------------------------------------------------------------------------
-- O saldo de cada linha é calculado pela soma corrente, e não digitado: com
-- quase noventa lançamentos, escrever `balance_after` à mão seria a forma mais
-- provável de a reconciliação falhar.
--
-- Mel:   2340 (células) + 2340 (replays) + 2000 (metas) + 1600 (tarefas)
--        + 6000 (renda dos negócios) + 900 (prêmios de liga)
--        + 7650 (conquistas) − 11700 (compras) − 4200 (cofre) = 6930
-- Pólen: 1820 + 1820 + 1000 (tarefas) + 1000 (esta semana) = 5640
-- XP:    3120 + 3120 + 500 = 6740  → nível 16, próximo em 7010
--
-- As compras ficam nas datas em que o saldo já as pagava: a casa é a última,
-- porque comprá-la antes deixaria o livro com saldo negativo — que o banco
-- recusa, e com razão.

INSERT INTO coin_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
WITH RECURSIVE n (i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 51)
SELECT @leo, mov.valor, motivo.id, mov.referencia,
       SUM(mov.valor) OVER (ORDER BY mov.dias_atras DESC, mov.ordem ROWS UNBOUNDED PRECEDING),
       UTC_TIMESTAMP() - INTERVAL mov.dias_atras DAY
  FROM (
    SELECT    90 AS valor, 'conclusao-celula'   AS motivo, 'cell'        AS referencia, 88 - n.i * 3 AS dias_atras, 1 AS ordem FROM n WHERE n.i < 26
    UNION ALL SELECT   45, 'conclusao-celula',   'cell',        70 - n.i,      2 FROM n WHERE n.i < 52
    UNION ALL SELECT  400, 'conclusao-meta',     'goal',        70 - n.i * 14, 3 FROM n WHERE n.i < 5
    UNION ALL SELECT   40, 'conclusao-tarefa',   'task',        80 - n.i * 2,  4 FROM n WHERE n.i < 40
    UNION ALL SELECT  600, 'renda-passiva',      'cycle',       70 - n.i * 7,  5 FROM n WHERE n.i < 10
    UNION ALL SELECT  300, 'premio-de-liga',     'league',      21 - n.i * 7,  6 FROM n WHERE n.i < 3
    UNION ALL SELECT  100, 'marco-de-sequencia', 'achievement', 84, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  200, 'marco-de-sequencia', 'achievement', 77, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  400, 'marco-de-sequencia', 'achievement', 63, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  800, 'marco-de-sequencia', 'achievement', 35, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT 1500, 'marco-de-sequencia', 'achievement',  1, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  100, 'marco-de-sequencia', 'achievement', 80, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  100, 'marco-de-sequencia', 'achievement', 75, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  250, 'marco-de-sequencia', 'achievement', 55, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  500, 'marco-de-sequencia', 'achievement', 40, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT 1000, 'marco-de-sequencia', 'achievement', 15, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  100, 'marco-de-sequencia', 'achievement', 65, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  250, 'marco-de-sequencia', 'achievement', 50, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  500, 'marco-de-sequencia', 'achievement', 30, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT 1000, 'marco-de-sequencia', 'achievement', 10, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  250, 'marco-de-sequencia', 'achievement', 60, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  500, 'marco-de-sequencia', 'achievement', 45, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  100, 'marco-de-sequencia', 'achievement', 70, 7 FROM n WHERE n.i = 0
    UNION ALL SELECT  -500, 'compra', 'purchase', 72, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT  -800, 'compra', 'purchase', 66, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT -2000, 'compra', 'purchase', 45, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT  -900, 'compra', 'purchase', 33, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT -1500, 'compra', 'purchase', 25, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT -6000, 'compra', 'purchase',  8, 11 FROM n WHERE n.i = 0
    UNION ALL SELECT  -420, 'deposito-cofre', 'vault', 69 - n.i * 7, 12 FROM n WHERE n.i < 10
  ) AS mov
  JOIN reward_reasons motivo ON motivo.slug = mov.motivo;

INSERT INTO point_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
WITH RECURSIVE n (i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 51)
SELECT @leo, mov.valor, motivo.id, mov.referencia,
       SUM(mov.valor) OVER (ORDER BY mov.dias_atras DESC, mov.ordem ROWS UNBOUNDED PRECEDING),
       UTC_TIMESTAMP() - INTERVAL mov.dias_atras DAY
  FROM (
    SELECT 70 AS valor, 'conclusao-celula' AS motivo, 'cell' AS referencia, 88 - n.i * 3 AS dias_atras, 1 AS ordem FROM n WHERE n.i < 26
    UNION ALL SELECT 35, 'conclusao-celula', 'cell', 70 - n.i, 2 FROM n WHERE n.i < 52
    UNION ALL SELECT 25, 'conclusao-tarefa', 'task', 80 - n.i * 2, 3 FROM n WHERE n.i < 40
    -- O pólen desta semana, que é o que o ranque da liga lê (RF-GAM-02). Cai no
    -- domingo da semana corrente, seja qual for o dia de hoje.
    UNION ALL SELECT 1000, 'conclusao-celula', 'cell', DAYOFWEEK(CURDATE()) - 1, 4 FROM n WHERE n.i = 0
  ) AS mov
  JOIN reward_reasons motivo ON motivo.slug = mov.motivo;

INSERT INTO xp_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
WITH RECURSIVE n (i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 51)
SELECT @leo, mov.valor, motivo.id, mov.referencia,
       SUM(mov.valor) OVER (ORDER BY mov.dias_atras DESC, mov.ordem ROWS UNBOUNDED PRECEDING),
       UTC_TIMESTAMP() - INTERVAL mov.dias_atras DAY
  FROM (
    SELECT 120 AS valor, 'conclusao-celula' AS motivo, 'cell' AS referencia, 88 - n.i * 3 AS dias_atras, 1 AS ordem FROM n WHERE n.i < 26
    UNION ALL SELECT 60, 'conclusao-celula', 'cell', 70 - n.i, 2 FROM n WHERE n.i < 52
    UNION ALL SELECT 100, 'conclusao-meta', 'goal', 70 - n.i * 14, 3 FROM n WHERE n.i < 5
  ) AS mov
  JOIN reward_reasons motivo ON motivo.slug = mov.motivo;

INSERT INTO wallets (user_id, coins, points_total) VALUES (@leo, 6930, 5640);
INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (@leo, 16, 6740, 7010);

-- ---------------------------------------------------------------------------
-- Patrimônio
-- ---------------------------------------------------------------------------
-- Seis compras: quatro que contam patrimônio, uma que gera renda e um
-- cosmético, que existe para a tela mostrar que enfeite não vira patrimônio.

INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, total_price, purchased_at)
SELECT @leo, item.id, 1, item.price, item.price, UTC_TIMESTAMP() - INTERVAL compra.dias_atras DAY
  FROM (
    SELECT 'casa-media' AS slug, 8 AS dias_atras
    UNION ALL SELECT 'caixa-de-abelhas', 45
    UNION ALL SELECT 'barraquinha-de-limonada', 66
    UNION ALL SELECT 'celular', 25
    UNION ALL SELECT 'bicicleta', 72
    UNION ALL SELECT 'asas-brilhantes', 33
  ) AS compra
  JOIN items item ON item.slug = compra.slug;

-- Valor atual depois das semanas que passaram: moradia e negócio valorizam,
-- tecnologia e transporte depreciam (RN-034).
INSERT INTO inventory (user_id, item_id, purchase_id, status_id, current_value, acquired_at)
SELECT @leo, item.id, compra.id, estado.id, atual.valor, compra.purchased_at
  FROM (
    SELECT 'casa-media' AS slug, 6300 AS valor
    UNION ALL SELECT 'caixa-de-abelhas', 2050
    UNION ALL SELECT 'barraquinha-de-limonada', 810
    UNION ALL SELECT 'celular', 1350
    UNION ALL SELECT 'bicicleta', 460
    UNION ALL SELECT 'asas-brilhantes', 900
  ) AS atual
  JOIN items item ON item.slug = atual.slug
  JOIN purchases compra ON compra.item_id = item.id AND compra.user_id = @leo
  JOIN inventory_statuses estado ON estado.slug = 'ativo';

-- Dez ciclos processados, um por semana, com renda de negócio e depreciação.
INSERT INTO economic_cycles (user_id, cycle_number, processed_at, summary)
SELECT @leo, n.i + 1, UTC_TIMESTAMP() - INTERVAL (70 - n.i * 7) DAY,
       JSON_OBJECT(
         'depreciacao', JSON_ARRAY(JSON_OBJECT('item', 'celular', 'de', 1500, 'para', 1350)),
         'valorizacao', JSON_ARRAY(JSON_OBJECT('item', 'casa-media', 'de', 6000, 'para', 6300)),
         'custos', 0,
         'renda', 600,
         'vendas_forcadas', JSON_ARRAY()
       )
  FROM (SELECT 0 AS i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS n;

-- ---------------------------------------------------------------------------
-- Cofre: dez depósitos de 420, mais o rendimento de cada ciclo
-- ---------------------------------------------------------------------------

INSERT INTO vaults (user_id, balance, interest_rate, goal_amount, goal_due_at)
VALUES (@leo, 4820, 2.000, 6000, UTC_TIMESTAMP() + INTERVAL 30 DAY);

INSERT INTO vault_transactions (user_id, transaction_type_id, amount, balance_after, created_at)
SELECT @leo, tipo.id, mov.valor,
       SUM(mov.valor) OVER (ORDER BY mov.dias_atras DESC, mov.ordem ROWS UNBOUNDED PRECEDING),
       UTC_TIMESTAMP() - INTERVAL mov.dias_atras DAY
  FROM (
    SELECT 420 AS valor, 'deposito' AS tipo, 69 - n.i * 7 AS dias_atras, 1 AS ordem FROM (SELECT 0 AS i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS n
    UNION ALL SELECT 62, 'rendimento', 68 - n.i * 7, 2 FROM (SELECT 0 AS i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS n
  ) AS mov
  JOIN vault_transaction_types tipo ON tipo.slug = mov.tipo;

-- ---------------------------------------------------------------------------
-- Metas, tarefas e sequência de cem dias
-- ---------------------------------------------------------------------------

INSERT INTO goals (
  user_id, goal_type_id, status_id, difficulty_id, title,
  target_value, current_value, reward_coins, reward_points, starts_at, due_at, completed_at
)
SELECT @leo, tipo.id, estado.id, dificuldade.id, dados.titulo,
       dados.alvo, dados.atual, dados.mel, 0,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY + INTERVAL 14 DAY,
       IF(dados.estado = 'concluida', UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY + INTERVAL 10 DAY, NULL)
  FROM (
    SELECT 'Conclua 4 células'          AS titulo, 'concluir-celulas' AS tipo, 'concluida' AS estado, 'alta' AS dificuldade, 4    AS alvo, 4    AS atual, 400 AS mel, 70 AS dias_atras
    UNION ALL SELECT 'Junte 1500 de mel',       'acumular-mel',        'concluida', 'alta', 1500, 1500, 400, 56
    UNION ALL SELECT 'Feche um favo',           'concluir-favo',       'concluida', 'alta',    1,    1, 400, 42
    UNION ALL SELECT 'Guarde 2000 no cofre',    'guardar-no-cofre',    'concluida', 'alta', 2000, 2000, 400, 28
    UNION ALL SELECT 'Chegue a 10000 de patrimônio', 'alcancar-patrimonio', 'concluida', 'alta', 10000, 10000, 400, 14
    UNION ALL SELECT 'Junte 6000 no cofre',     'guardar-no-cofre',    'ativa',     'alta', 6000, 4820,   0,  5
    UNION ALL SELECT 'Chegue ao nível 18',      'atingir-nivel',       'ativa',     'alta',   18,   16,   0,  3
  ) AS dados
  JOIN goal_types tipo ON tipo.slug = dados.tipo
  JOIN goal_statuses estado ON estado.slug = dados.estado
  JOIN goal_difficulties dificuldade ON dificuldade.slug = dados.dificuldade;

INSERT INTO tasks (
  user_id, task_type_id, status_id, target_value, current_value,
  reward_points, reward_coins, due_at, completed_at
)
SELECT @leo, tipo.id, estado.id, tipo.default_target, dados.atual,
       tipo.reward_points, tipo.reward_coins,
       UTC_TIMESTAMP() + INTERVAL dados.dias_para_vencer DAY,
       IF(dados.estado = 'concluida', UTC_TIMESTAMP(), NULL)
  FROM (
    SELECT 'concluir-3-celulas' AS tipo, 'concluida' AS estado, 3 AS atual, 1 AS dias_para_vencer
    UNION ALL SELECT 'jogar-3-dias',       'ativa', 2, 4
    UNION ALL SELECT 'depositar-no-cofre', 'ativa', 0, 1
  ) AS dados
  JOIN task_types tipo ON tipo.slug = dados.tipo
  JOIN goal_statuses estado ON estado.slug = dados.estado;

-- Cem dias seguidos: é o marco mais alto da RN-023, e o que faz a escada de
-- conquistas de sequência aparecer inteira na tela.
INSERT INTO streak_events (user_id, event_date, event_type_id)
WITH RECURSIVE dia (numero) AS (
  SELECT 0 UNION ALL SELECT numero + 1 FROM dia WHERE numero < 99
)
SELECT @leo, CURDATE() - INTERVAL dia.numero DAY, tipo.id
  FROM dia
  JOIN streak_event_types tipo ON tipo.slug = 'cumprido';

INSERT INTO streaks (user_id, current_days, best_days, shields_available, last_counted_date, last_evaluated_at)
VALUES (@leo, 100, 100, 2, CURDATE(), UTC_TIMESTAMP());

-- ---------------------------------------------------------------------------
-- Conquistas: as catorze que este progresso alcança
-- ---------------------------------------------------------------------------
-- As de 30, 75 e 150 células ficam de fora porque só existem 26 células no
-- catálogo, e a de 12 favos porque só existem 6. É limite de conteúdo, não do
-- jogador.

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT @leo, conquista.id, UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT 'sequencia-7' AS slug, 84 AS dias_atras
    UNION ALL SELECT 'sequencia-14',    77
    UNION ALL SELECT 'sequencia-30',    63
    UNION ALL SELECT 'sequencia-60',    35
    UNION ALL SELECT 'sequencia-100',    1
    UNION ALL SELECT 'favo-1',          80
    UNION ALL SELECT 'favo-3',          60
    UNION ALL SELECT 'favo-6',          45
    UNION ALL SELECT 'celulas-10',      70
    UNION ALL SELECT 'patrimonio-500',  75
    UNION ALL SELECT 'patrimonio-2000', 55
    UNION ALL SELECT 'patrimonio-5000', 40
    UNION ALL SELECT 'patrimonio-10000',15
    UNION ALL SELECT 'cofre-100',       65
    UNION ALL SELECT 'cofre-500',       50
    UNION ALL SELECT 'cofre-1500',      30
    UNION ALL SELECT 'cofre-4000',      10
  ) AS dados
  JOIN achievements conquista ON conquista.slug = dados.slug;

-- ---------------------------------------------------------------------------
-- Liga da semana, com gente para disputar
-- ---------------------------------------------------------------------------
-- Ranque com um só nome não é ranque. Cinco colegas entram com pólen próprio,
-- e o Léo fica em segundo: disputa em andamento demonstra mais do que
-- liderança folgada.

INSERT INTO users (email, nickname, password_hash, birth_date, onboarding_completed_at, last_login_at)
SELECT colega.email, colega.apelido, @avancado_hash, CURDATE() - INTERVAL 13 YEAR,
       UTC_TIMESTAMP() - INTERVAL 60 DAY, UTC_TIMESTAMP() - INTERVAL 1 DAY
  FROM (
    SELECT 'bia@beever.dev'  AS email, 'Bia'  AS apelido
    UNION ALL SELECT 'caio@beever.dev', 'Caio'
    UNION ALL SELECT 'duda@beever.dev', 'Duda'
    UNION ALL SELECT 'enzo@beever.dev', 'Enzo'
    UNION ALL SELECT 'flor@beever.dev', 'Flor'
  ) AS colega;

INSERT INTO profiles (user_id, age_band_id, avatar_id, initial_goal_id, session_minutes)
SELECT pessoa.id, faixa.id, avatar.id, objetivo.id, 20
  FROM users pessoa
  JOIN age_bands faixa ON faixa.code = 'C'
  JOIN avatars avatar ON avatar.slug = 'beenie-classico'
  JOIN initial_goals objetivo ON objetivo.slug = 'aprender-a-guardar'
 WHERE pessoa.email IN ('bia@beever.dev', 'caio@beever.dev', 'duda@beever.dev', 'enzo@beever.dev', 'flor@beever.dev');

-- Os colegas também precisam de livro e cache batendo: a reconciliação olha
-- todo mundo, não só a conta que interessa à demonstração. O pólen deles é o
-- da semana, lançado mais abaixo junto com o do Léo.
INSERT INTO wallets (user_id, coins, points_total)
SELECT pessoa.id, 0, colega.polen
  FROM (
    SELECT 'bia@beever.dev'  AS email, 1200 AS polen
    UNION ALL SELECT 'caio@beever.dev',  900
    UNION ALL SELECT 'duda@beever.dev',  700
    UNION ALL SELECT 'enzo@beever.dev',  450
    UNION ALL SELECT 'flor@beever.dev',  300
  ) AS colega
  JOIN users pessoa ON pessoa.email = colega.email;

INSERT INTO user_levels (user_id, level, xp_total, xp_next_level)
SELECT pessoa.id, 1, 0, 280
  FROM users pessoa
 WHERE pessoa.email IN ('bia@beever.dev', 'caio@beever.dev', 'duda@beever.dev', 'enzo@beever.dev', 'flor@beever.dev');

-- A liga da semana corrente. O serviço conta a semana de domingo a sábado em
-- UTC (`semanaDe`), então é essa a data que precisa bater: com a semana
-- começando na segunda, o grupo semeado é ignorado e a visita cria outro.
SET @domingo = CURDATE() - INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY;

-- `leagues` guarda um grupo por linha, e a semana tem vários grupos — não há
-- chave única em `starts_on`. Por isso os grupos desta semana são apagados
-- antes: sem isso o seed acumula um grupo novo a cada execução, e a busca pelo
-- grupo da semana passa a devolver mais de uma linha. O serviço recria o que
-- precisar na primeira visita.
DELETE FROM leagues WHERE starts_on = @domingo;

INSERT INTO leagues (name, starts_on, ends_on)
VALUES (CONCAT('Grupo 1 — semana de ', DATE_FORMAT(@domingo, '%d/%m')), @domingo, @domingo + INTERVAL 6 DAY);

SET @liga = LAST_INSERT_ID();

-- O ranque é lido do livro de pólen da semana, e não do cache em
-- `league_members` (DT-108). Sem lançamento desta semana, o ranque aparece
-- zerado mesmo com o cache cheio — foi o que aconteceu na primeira tentativa.
INSERT INTO point_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
SELECT pessoa.id, colega.polen, motivo.id, 'cell', colega.polen,
       TIMESTAMP(@domingo) + INTERVAL 10 HOUR
  FROM (
    SELECT 'bia@beever.dev'  AS email, 1200 AS polen
    UNION ALL SELECT 'caio@beever.dev',  900
    UNION ALL SELECT 'duda@beever.dev',  700
    UNION ALL SELECT 'enzo@beever.dev',  450
    UNION ALL SELECT 'flor@beever.dev',  300
  ) AS colega
  JOIN users pessoa ON pessoa.email = colega.email
  JOIN reward_reasons motivo ON motivo.slug = 'conclusao-celula';

INSERT INTO league_members (league_id, user_id, points)
SELECT @liga, pessoa.id, membro.polen
  FROM (
    SELECT 'leo@beever.dev'  AS email, 1100 AS polen
    UNION ALL SELECT 'bia@beever.dev',  1200
    UNION ALL SELECT 'caio@beever.dev',  900
    UNION ALL SELECT 'duda@beever.dev',  700
    UNION ALL SELECT 'enzo@beever.dev',  450
    UNION ALL SELECT 'flor@beever.dev',  300
  ) AS membro
  JOIN users pessoa ON pessoa.email = membro.email;
