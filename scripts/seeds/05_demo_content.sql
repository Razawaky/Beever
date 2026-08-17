-- Conteúdo de demonstração: dois favos com quatro células cada.
--
-- Serve para a trilha existir de verdade em desenvolvimento — com ordem,
-- desbloqueio e conteúdo — em vez de tela vazia. Não é o conteúdo pedagógico
-- final: esse vem da área administrativa (E12).
--
-- O corpo de cada célula é JSON validado pela aplicação, não pelo banco (foi a
-- decisão do checkpoint da E01). O formato aqui é o que os validadores da E07
-- vão esperar, e `version` existe para poder mudar sem quebrar o que já foi
-- respondido.

INSERT INTO hives (slug, title, description, order_index, age_band_id, unlock_percent)
SELECT dados.slug, dados.titulo, dados.descricao, dados.ordem, faixa.id, 80
  FROM (
    SELECT 'primeiros-passos' AS slug, 'Primeiros passos' AS titulo, 'De onde vem o dinheiro e para onde ele vai.' AS descricao, 1 AS ordem, 'A' AS faixa
    UNION ALL SELECT 'guardar-e-gastar', 'Guardar e gastar', 'A diferença entre o que você precisa e o que você quer.', 2, 'A'
  ) AS dados
  JOIN age_bands faixa ON faixa.code = dados.faixa
ON DUPLICATE KEY UPDATE
  title = dados.titulo, description = dados.descricao, order_index = dados.ordem;

INSERT INTO cells (hive_id, game_type_id, age_band_id, order_index, title, estimated_seconds)
SELECT favo.id, jogo.id, faixa.id, dados.ordem, dados.titulo, dados.segundos
  FROM (
    SELECT 'primeiros-passos' AS favo, 1 AS ordem, 'O que é mel?'            AS titulo, 'quiz-do-favo'          AS jogo, 180 AS segundos
    UNION ALL SELECT 'primeiros-passos', 2, 'Ganhar e gastar',            'arraste-e-classifique', 240
    UNION ALL SELECT 'primeiros-passos', 3, 'Preciso ou quero?',          'ordene-a-prioridade',   240
    UNION ALL SELECT 'primeiros-passos', 4, 'Meu primeiro orçamento',     'monte-o-orcamento',     300
    UNION ALL SELECT 'guardar-e-gastar', 1, 'Por que guardar?',           'quiz-do-favo',          180
    UNION ALL SELECT 'guardar-e-gastar', 2, 'O cofre do tempo',           'cofre-do-tempo',        300
    UNION ALL SELECT 'guardar-e-gastar', 3, 'Comparando preços',          'mercado-esperto',       240
    UNION ALL SELECT 'guardar-e-gastar', 4, 'Planejando a semana',        'monte-o-orcamento',     300
  ) AS dados
  JOIN hives favo ON favo.slug = dados.favo
  JOIN game_types jogo ON jogo.slug = dados.jogo
  JOIN age_bands faixa ON faixa.code = 'A'
ON DUPLICATE KEY UPDATE
  title = dados.titulo, game_type_id = jogo.id, estimated_seconds = dados.segundos;

-- Conteúdo só da primeira célula, como exemplo de formato. As outras recebem um
-- placeholder para a trilha navegar de ponta a ponta sem tela quebrada.
INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'quiz',
    'perguntas', JSON_ARRAY(
      JSON_OBJECT(
        'enunciado', 'O mel é a moeda do Beever. Para que ele serve?',
        'alternativas', JSON_ARRAY('Comprar coisas na loja', 'Subir de nível', 'Nada'),
        'correta', 0
      ),
      JSON_OBJECT(
        'enunciado', 'De onde vem o mel?',
        'alternativas', JSON_ARRAY('De concluir atividades', 'De pedir para o Beenie', 'Ele aparece sozinho'),
        'correta', 0
      )
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'primeiros-passos' AND celula.order_index = 1
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT('tipo', 'placeholder', 'texto', 'Conteúdo em produção.')
  FROM cells celula
  LEFT JOIN contents existente ON existente.cell_id = celula.id
 WHERE existente.id IS NULL;
