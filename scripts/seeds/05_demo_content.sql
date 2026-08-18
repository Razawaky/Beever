-- Conteúdo de demonstração: dois favos de quatro células por faixa etária.
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
    -- Faixa B (9 a 11): já entra troco, comparação de preço e a ideia de planejar o mês.
    UNION ALL SELECT 'dinheiro-no-dia-a-dia', 'Dinheiro no dia a dia', 'Trocos, preços e escolhas de todo dia.', 1, 'B'
    UNION ALL SELECT 'planejar-o-mes', 'Planejar o mês', 'Combinar o que entra com o que sai, sem susto no fim.', 2, 'B'
    -- Faixa C (12 a 15): juros, renda e patrimônio, que é o vocabulário da economia do jogo.
    UNION ALL SELECT 'o-tempo-e-o-juro', 'O tempo e o juro', 'Por que esperar pode valer dinheiro — e por que dever custa caro.', 1, 'C'
    UNION ALL SELECT 'construir-patrimonio', 'Construir patrimônio', 'A diferença entre gastar, guardar e fazer render.', 2, 'C'
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

    UNION ALL SELECT 'dinheiro-no-dia-a-dia', 1, 'Contando o troco',       'quiz-do-favo',          240
    UNION ALL SELECT 'dinheiro-no-dia-a-dia', 2, 'Qual é a melhor compra?','mercado-esperto',       300
    UNION ALL SELECT 'dinheiro-no-dia-a-dia', 3, 'Gasto fixo ou variável?','arraste-e-classifique', 300
    UNION ALL SELECT 'dinheiro-no-dia-a-dia', 4, 'A conta do mês',         'monte-o-orcamento',     360
    UNION ALL SELECT 'planejar-o-mes', 1, 'Quanto sobra?',                 'monte-o-orcamento',     360
    UNION ALL SELECT 'planejar-o-mes', 2, 'Primeiro o quê?',               'ordene-a-prioridade',   300
    UNION ALL SELECT 'planejar-o-mes', 3, 'Imprevisto na porta',           'quiz-do-favo',          240
    UNION ALL SELECT 'planejar-o-mes', 4, 'Guardar antes de gastar',       'cofre-do-tempo',        360

    UNION ALL SELECT 'o-tempo-e-o-juro', 1, 'O juro que trabalha por você','cofre-do-tempo',        420
    UNION ALL SELECT 'o-tempo-e-o-juro', 2, 'O juro que trabalha contra',  'quiz-do-favo',          300
    UNION ALL SELECT 'o-tempo-e-o-juro', 3, 'À vista ou parcelado?',       'mercado-esperto',       360
    UNION ALL SELECT 'o-tempo-e-o-juro', 4, 'Esperar vale quanto?',        'ordene-a-prioridade',   300
    UNION ALL SELECT 'construir-patrimonio', 1, 'Gastar, guardar, render', 'arraste-e-classifique', 360
    UNION ALL SELECT 'construir-patrimonio', 2, 'O que é patrimônio',      'quiz-do-favo',          300
    UNION ALL SELECT 'construir-patrimonio', 3, 'Montando a reserva',      'cofre-do-tempo',        420
    UNION ALL SELECT 'construir-patrimonio', 4, 'A escolha de um ano',     'monte-o-orcamento',     420
  ) AS dados
  JOIN hives favo ON favo.slug = dados.favo
  JOIN game_types jogo ON jogo.slug = dados.jogo
  -- RN-029: a célula herda a faixa do favo. O percentual do favo conta só o que
  -- o jogador vê, então célula de faixa acima dentro de favo de faixa abaixo
  -- deixaria o favo impossível de fechar para quem é mais novo.
  JOIN age_bands faixa ON faixa.id = favo.age_band_id
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
