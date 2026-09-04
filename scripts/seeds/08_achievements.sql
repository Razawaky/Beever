-- Catálogo de conquistas (RF-GAM-01, RN-023).
--
-- Cinco famílias, quatro degraus cada. A proporção é a que os aplicativos
-- infantojuvenis usam: poucos eixos e muitos degraus, com o primeiro degrau
-- perto o bastante para acontecer na primeira semana — conquista que demora a
-- primeira vez é conquista que a criança nunca descobre que existe.
--
-- O critério mora aqui, e não no código (migration 022): `criterion_type` diz o
-- que medir e `criterion_target` a partir de que número. O slug é só um nome
-- estável — até a T-13.1 ele carregava o número, e por isso só a sequência
-- conseguia desbloquear.
--
-- O valor do bônus segue a escala do resto (RN-006): meta simples paga 100, meta
-- alta 200, e o degrau que custa um mês de constância compra um Escudo (400).

INSERT INTO achievements (slug, name, description, criterion_type, criterion_target, reward_coins) VALUES
  -- Sequência: os cinco marcos da RN-023, que já existiam.
  ('sequencia-7',   'Uma semana inteira',   'Sete dias seguidos de colmeia. O começo de tudo.',           'sequencia-dias',      7,  100),
  ('sequencia-14',  'Duas semanas',         'Catorze dias seguidos. Já virou hábito.',                    'sequencia-dias',     14,  200),
  ('sequencia-30',  'Um mês de constância', 'Trinta dias seguidos. Dá para comprar um Escudo com isso.',  'sequencia-dias',     30,  400),
  ('sequencia-60',  'Dois meses firmes',    'Sessenta dias seguidos. Pouca gente chega aqui.',            'sequencia-dias',     60,  800),
  ('sequencia-100', 'Cem dias',             'Cem dias seguidos. Você é lenda da colmeia.',                'sequencia-dias',    100, 1500),

  -- Favos: a escada da trilha. O primeiro cai no fim do primeiro favo.
  ('favo-1',  'Primeiro favo fechado', 'Você terminou um favo inteiro da trilha.',      'favos-concluidos',  1,  100),
  ('favo-3',  'Três favos',            'Três favos fechados. A trilha já tem história.','favos-concluidos',  3,  250),
  ('favo-6',  'Seis favos',            'Seis favos fechados. Metade do caminho.',       'favos-concluidos',  6,  500),
  ('favo-12', 'Doze favos',            'Doze favos fechados. Colmeia inteira na mão.',  'favos-concluidos', 12, 1000),

  -- Células: o esforço miúdo, que aparece antes de qualquer favo fechar.
  ('celulas-10',  'Dez atividades',       'Dez células concluídas. Está pegando o jeito.',   'celulas-concluidas',  10,  100),
  ('celulas-30',  'Trinta atividades',    'Trinta células concluídas. Isso é constância.',   'celulas-concluidas',  30,  250),
  ('celulas-75',  'Setenta e cinco',      'Setenta e cinco células. Poucos chegam tão longe.','celulas-concluidas', 75,  500),
  ('celulas-150', 'Cento e cinquenta',    'Cento e cinquenta células concluídas.',           'celulas-concluidas', 150, 1000),

  -- Patrimônio: o que a criança construiu, somando carteira, cofre e bens.
  ('patrimonio-500',   'Primeiro patrimônio', 'Quinhentos de patrimônio. Você tem alguma coisa.', 'patrimonio-total',   500,  100),
  ('patrimonio-2000',  'Dois mil',            'Dois mil de patrimônio somando tudo o que é seu.', 'patrimonio-total',  2000,  250),
  ('patrimonio-5000',  'Cinco mil',           'Cinco mil de patrimônio. Isso dá segurança.',      'patrimonio-total',  5000,  500),
  ('patrimonio-10000', 'Dez mil',             'Dez mil de patrimônio. Colmeia próspera.',         'patrimonio-total', 10000, 1000),

  -- Poupança: o mel parado no cofre, que é o hábito mais difícil de todos.
  ('cofre-100',  'Primeiro cofrinho',  'Cem de mel guardados no cofre.',                      'cofre-guardado',  100,  100),
  ('cofre-500',  'Guardando de verdade','Quinhentos de mel no cofre, rendendo toda semana.',  'cofre-guardado',  500,  250),
  ('cofre-1500', 'Reserva formada',    'Mil e quinhentos guardados. Isso é uma reserva.',     'cofre-guardado', 1500,  500),
  ('cofre-4000', 'Cofre cheio',        'Quatro mil de mel no cofre. Paciência rende.',        'cofre-guardado', 4000, 1000)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name,
  description = novo.description,
  criterion_type = novo.criterion_type,
  criterion_target = novo.criterion_target,
  reward_coins = novo.reward_coins;
