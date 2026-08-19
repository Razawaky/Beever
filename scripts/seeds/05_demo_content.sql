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

-- Arraste e Classifique (RF-JOG-02): três células, uma por favo, cada uma com
-- um par de caixas diferente. `categoria` guarda o `id` da caixa certa e nunca
-- viaja para a tela.
INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'arraste',
    'enunciado', 'O dinheiro entrou ou saiu?',
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'entra', 'nome', 'Dinheiro que entra'),
      JSON_OBJECT('id', 'sai',   'nome', 'Dinheiro que sai')
    ),
    'cartas', JSON_ARRAY(
      JSON_OBJECT('texto', 'Mesada do mês',        'categoria', 'entra'),
      JSON_OBJECT('texto', 'Presente da vovó',     'categoria', 'entra'),
      JSON_OBJECT('texto', 'Comprar figurinhas',   'categoria', 'sai'),
      JSON_OBJECT('texto', 'Pagar o lanche',       'categoria', 'sai')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'primeiros-passos' AND celula.order_index = 2
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'arraste',
    'enunciado', 'Esse gasto é sempre igual ou muda de valor?',
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'fixo',     'nome', 'Gasto fixo'),
      JSON_OBJECT('id', 'variavel', 'nome', 'Gasto variável')
    ),
    'cartas', JSON_ARRAY(
      JSON_OBJECT('texto', 'Mensalidade da escola',     'categoria', 'fixo'),
      JSON_OBJECT('texto', 'Aluguel da casa',           'categoria', 'fixo'),
      JSON_OBJECT('texto', 'Sorvete no fim de semana',  'categoria', 'variavel'),
      JSON_OBJECT('texto', 'Conta de luz',              'categoria', 'variavel')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'dinheiro-no-dia-a-dia' AND celula.order_index = 3
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'arraste',
    'enunciado', 'Para onde vai esse dinheiro?',
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'gastar',  'nome', 'Gastar agora'),
      JSON_OBJECT('id', 'guardar', 'nome', 'Guardar parado'),
      JSON_OBJECT('id', 'render',  'nome', 'Fazer render')
    ),
    'cartas', JSON_ARRAY(
      JSON_OBJECT('texto', 'Comprar um doce',            'categoria', 'gastar'),
      JSON_OBJECT('texto', 'Ingresso do cinema',         'categoria', 'gastar'),
      JSON_OBJECT('texto', 'Cofrinho embaixo da cama',   'categoria', 'guardar'),
      JSON_OBJECT('texto', 'Poupança que rende juros',   'categoria', 'render'),
      JSON_OBJECT('texto', 'Dinheiro investido no banco','categoria', 'render')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'construir-patrimonio' AND celula.order_index = 1
ON DUPLICATE KEY UPDATE body = VALUES(body);

-- Monte o Orçamento (RF-JOG-03): cinco células, uma por favo, com o total e o
-- passo crescendo junto da faixa etária. A soma dos mínimos nunca passa do
-- total, e a dos máximos nunca fica abaixo dele — senão não existiria divisão
-- sem erro.
INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'orcamento',
    'enunciado', 'Você tem 50 de mel para a semana. Divida sem quebrar nenhuma regra.',
    'total', 50,
    'passo', 5,
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'guardar',   'nome', 'Guardar',   'minimo', 20, 'maximo', 50, 'dica', 'Guarde pelo menos 20'),
      JSON_OBJECT('id', 'lanche',    'nome', 'Lanche',    'minimo', 10, 'maximo', 20, 'dica', 'Entre 10 e 20'),
      JSON_OBJECT('id', 'brinquedo', 'nome', 'Brinquedo', 'minimo',  0, 'maximo', 15, 'dica', 'No máximo 15')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'primeiros-passos' AND celula.order_index = 4
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'orcamento',
    'enunciado', 'São 40 de mel para a semana inteira. Onde cada parte vai?',
    'total', 40,
    'passo', 5,
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'guardar',  'nome', 'Guardar',  'minimo', 15, 'maximo', 40, 'dica', 'Guarde pelo menos 15'),
      JSON_OBJECT('id', 'passeio',  'nome', 'Passeio',  'minimo',  5, 'maximo', 15, 'dica', 'Entre 5 e 15'),
      JSON_OBJECT('id', 'presente', 'nome', 'Presente', 'minimo',  0, 'maximo', 20, 'dica', 'No máximo 20')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'guardar-e-gastar' AND celula.order_index = 4
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'orcamento',
    'enunciado', 'A casa recebeu 200 de mel no mês. Feche a conta sem furar nenhuma regra.',
    'total', 200,
    'passo', 10,
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'contas',  'nome', 'Contas da casa', 'minimo', 80, 'maximo', 120, 'dica', 'Entre 80 e 120'),
      JSON_OBJECT('id', 'comida',  'nome', 'Comida',         'minimo', 40, 'maximo',  80, 'dica', 'Entre 40 e 80'),
      JSON_OBJECT('id', 'lazer',   'nome', 'Lazer',          'minimo',  0, 'maximo',  40, 'dica', 'No máximo 40'),
      JSON_OBJECT('id', 'guardar', 'nome', 'Guardar',        'minimo', 20, 'maximo', 100, 'dica', 'Guarde pelo menos 20')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'dinheiro-no-dia-a-dia' AND celula.order_index = 4
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'orcamento',
    'enunciado', 'Entraram 150 de mel no mês. Quanto vai sobrar depende de você.',
    'total', 150,
    'passo', 10,
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'fixos',     'nome', 'Gastos fixos',    'minimo', 60, 'maximo', 90, 'dica', 'Entre 60 e 90'),
      JSON_OBJECT('id', 'variaveis', 'nome', 'Gastos variáveis','minimo', 20, 'maximo', 50, 'dica', 'Entre 20 e 50'),
      JSON_OBJECT('id', 'guardar',   'nome', 'Guardar',         'minimo', 30, 'maximo', 80, 'dica', 'Guarde pelo menos 30'),
      JSON_OBJECT('id', 'imprevisto','nome', 'Imprevisto',      'minimo', 10, 'maximo', 30, 'dica', 'Entre 10 e 30')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'planejar-o-mes' AND celula.order_index = 1
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'orcamento',
    'enunciado', 'São 500 de mel para o ano. Decida o que fica de pé no fim dele.',
    'total', 500,
    'passo', 10,
    'categorias', JSON_ARRAY(
      JSON_OBJECT('id', 'moradia',      'nome', 'Moradia',              'minimo', 150, 'maximo', 250, 'dica', 'Entre 150 e 250'),
      JSON_OBJECT('id', 'estudo',       'nome', 'Estudo',               'minimo',  50, 'maximo', 150, 'dica', 'Entre 50 e 150'),
      JSON_OBJECT('id', 'lazer',        'nome', 'Lazer',                'minimo',   0, 'maximo',  80, 'dica', 'No máximo 80'),
      JSON_OBJECT('id', 'reserva',      'nome', 'Reserva de emergência','minimo', 100, 'maximo', 200, 'dica', 'Pelo menos 100'),
      JSON_OBJECT('id', 'investimento', 'nome', 'Investimento',         'minimo',  50, 'maximo', 150, 'dica', 'Entre 50 e 150')
    )
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'construir-patrimonio' AND celula.order_index = 4
ON DUPLICATE KEY UPDATE body = VALUES(body);

-- Cofre do Tempo (RF-JOG-04): quatro células. A taxa é do conteúdo, não do
-- código: a faixa A precisa de juro alto para ver a curva em quatro ciclos, e a
-- faixa C fecha com os 2% do cofre de verdade (RN-042). A meta fica sempre
-- acima do que guardar o mínimo alcança e dentro do que guardar tudo alcança.
INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'cofre',
    'enunciado', 'Entram 20 de mel por semana. Guarde o que puder: o que fica no cofre rende 10% toda semana.',
    'nomeDoCiclo', 'semana',
    'entradaPorCiclo', 20,
    'minimoPorCiclo', 5,
    'taxaPorCiclo', 10,
    'ciclos', 4,
    'meta', 60
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'guardar-e-gastar' AND celula.order_index = 2
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'cofre',
    'enunciado', 'Entram 50 de mel por mês, e o cofre rende 5% ao mês. Chegue a 180 em cinco meses.',
    'nomeDoCiclo', 'mês',
    'entradaPorCiclo', 50,
    'minimoPorCiclo', 10,
    'taxaPorCiclo', 5,
    'ciclos', 5,
    'meta', 180
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'planejar-o-mes' AND celula.order_index = 4
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'cofre',
    'enunciado', 'Entram 100 de mel por mês, e o cofre rende 4% ao mês. Guardar cedo rende mais do que guardar tarde.',
    'nomeDoCiclo', 'mês',
    'entradaPorCiclo', 100,
    'minimoPorCiclo', 20,
    'taxaPorCiclo', 4,
    'ciclos', 6,
    'meta', 480
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'o-tempo-e-o-juro' AND celula.order_index = 1
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT(
    'tipo', 'cofre',
    'enunciado', 'Entram 80 de mel por semana e o cofre rende 2% por semana, como o cofre de verdade. Monte a reserva.',
    'nomeDoCiclo', 'semana',
    'entradaPorCiclo', 80,
    'minimoPorCiclo', 20,
    'taxaPorCiclo', 2,
    'ciclos', 6,
    'meta', 400
  )
  FROM cells celula
  JOIN hives favo ON favo.id = celula.hive_id
 WHERE favo.slug = 'construir-patrimonio' AND celula.order_index = 3
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO contents (cell_id, version, body)
SELECT celula.id, 1, JSON_OBJECT('tipo', 'placeholder', 'texto', 'Conteúdo em produção.')
  FROM cells celula
  LEFT JOIN contents existente ON existente.cell_id = celula.id
 WHERE existente.id IS NULL;
