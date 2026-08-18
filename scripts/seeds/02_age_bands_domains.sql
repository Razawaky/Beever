-- Tabelas de domínio.
--
-- Tudo que num schema comum viraria coluna ENUM mora aqui. É o preço de poder
-- acrescentar um estado, um tipo de jogo ou um comportamento econômico novo sem
-- migration destrutiva.

-- Faixas etárias. RN-038: na faixa A não existe custo fixo, depreciação nem
-- inadimplência — a criança de 6 a 8 anos só vê ganho. É por isso que
-- `is_upkeep_enabled` é 0 nela.
INSERT INTO age_bands (code, name, min_age, max_age, is_economy_enabled, is_upkeep_enabled) VALUES
  ('A', 'Faixa A — primeiros passos',  6,  8, 1, 0),
  ('B', 'Faixa B — explorando',        9, 11, 1, 1),
  ('C', 'Faixa C — planejando',       12, 15, 1, 1)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, min_age = novo.min_age, max_age = novo.max_age,
  is_economy_enabled = novo.is_economy_enabled, is_upkeep_enabled = novo.is_upkeep_enabled;

-- Avatares do mascote, a partir das imagens que já existem em src/public/img.
INSERT INTO avatars (slug, name, image_path) VALUES
  ('beenie-classico',   'Beenie',            '/img/beenie_howdy.png'),
  ('beenie-explorador', 'Beenie explorador', '/img/beenie_vem.png'),
  ('beenie-dourado',    'Beenie dourado',    '/img/beenie_1real.png'),
  ('babybee',           'Abelhinha',         '/img/babybee.png')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, image_path = novo.image_path;

-- RN-011: o objetivo escolhido no último passo do onboarding.
INSERT INTO initial_goals (slug, label) VALUES
  ('comprar-algo',       'Quero comprar algo'),
  ('aprender-a-guardar', 'Quero aprender a guardar'),
  ('entender-juros',     'Quero entender juros')
AS novo
ON DUPLICATE KEY UPDATE label = novo.label;

-- Os seis jogos do RF-JOG. Os dois últimos são P1.
INSERT INTO game_types (slug, name, description) VALUES
  ('quiz-do-favo',          'Quiz do Favo',           'Perguntas de múltipla escolha sobre o conteúdo da célula'),
  ('arraste-e-classifique', 'Arraste e Classifique',  'Separa itens em categorias, com alternativa por clique e teclado'),
  ('monte-o-orcamento',     'Monte o Orçamento',      'Distribui uma quantia entre necessidades e desejos'),
  ('cofre-do-tempo',        'Cofre do Tempo',         'Simula juros compostos ao longo de ciclos'),
  ('mercado-esperto',       'Mercado Esperto',        'Compara preços e decide a melhor compra'),
  ('ordene-a-prioridade',   'Ordene a Prioridade',    'Coloca gastos em ordem de importância')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, description = novo.description;

-- Estados possíveis de uma sessão de jogo.
INSERT INTO game_session_statuses (slug, name) VALUES
  ('aberta',     'Aberta'),
  ('concluida',  'Concluída'),
  ('abandonada', 'Abandonada'),
  ('expirada',   'Expirada')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- Motivo de cada lançamento nos livros. Sem isto, o extrato mostra números sem
-- explicação — e explicar de onde veio o mel é metade do valor pedagógico.
INSERT INTO reward_reasons (slug, name) VALUES
  ('conclusao-celula',      'Conclusão de célula'),
  ('conclusao-meta',        'Conclusão de meta'),
  ('conclusao-tarefa',      'Conclusão de tarefa'),
  ('marco-de-sequencia',    'Marco de sequência'),
  ('subida-de-nivel',       'Subida de nível'),
  ('renda-passiva',         'Renda passiva de item'),
  ('rendimento-cofre',      'Rendimento do cofre'),
  ('deposito-cofre',        'Depósito no cofre'),
  ('saque-cofre',           'Saque do cofre'),
  ('compra',                'Compra na loja'),
  ('custo-fixo',            'Custo fixo de item'),
  ('venda-item',            'Venda de item'),
  ('venda-por-inadimplencia', 'Venda forçada por inadimplência'),
  ('ajuste-administrativo', 'Ajuste administrativo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- RN-015: os sete tipos de meta que o planner pode sortear. `progress_source` é
-- o evento que move o contador — é o que liga a meta ao resto do sistema sem
-- um `switch` gigante no service.
INSERT INTO goal_types (slug, name, progress_source) VALUES
  ('acumular-mel',        'Acumular mel',            'coin_balance'),
  ('alcancar-patrimonio', 'Alcançar patrimônio',     'patrimony_total'),
  ('concluir-favo',       'Concluir um favo',        'hive_completed'),
  ('concluir-celulas',    'Concluir células',        'cell_completed'),
  ('manter-sequencia',    'Manter sequência',        'streak_days'),
  ('guardar-no-cofre',    'Guardar no cofre',        'vault_balance'),
  ('atingir-nivel',       'Atingir nível',           'user_level')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, progress_source = novo.progress_source;

-- RN-017: meta vencida vira "expirada", nunca sumindo nem punindo.
INSERT INTO goal_statuses (slug, name) VALUES
  ('ativa',     'Ativa'),
  ('concluida', 'Concluída'),
  ('expirada',  'Expirada'),
  ('renovada',  'Renovada')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- RN-014: quem tem menos dias disponíveis recebe menos metas, com prazo maior e
-- recompensa multiplicada. Quem joga todo dia recebe mais metas, mais curtas.
-- Recompensa por dificuldade: base de 100 de mel e 60 de pólen para a meta
-- simples, multiplicada pelo fator de cada dificuldade. Mexer no ritmo do jogo é
-- editar estas linhas e rodar o seed — nenhum destes números vive em código.
INSERT INTO goal_difficulties (slug, name, reward_multiplier, reward_coins, reward_points, default_days) VALUES
  ('alta',    'Alta',    2.000, 200, 120, 28),
  ('media',   'Média',   1.500, 150,  90, 14),
  ('simples', 'Simples', 1.000, 100,  60,  7)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, reward_multiplier = novo.reward_multiplier,
  reward_coins = novo.reward_coins, reward_points = novo.reward_points,
  default_days = novo.default_days;

-- RN-014, a outra metade: quantas metas ativas cada faixa de dias recebe. O
-- prazo e a recompensa vêm da dificuldade apontada aqui, então esta tabela diz
-- só duas coisas — a faixa de dias e o número de metas. Semana vazia não tem
-- linha de propósito: a RF-ONB-03 exige pelo menos um dia, e semana sem dia é
-- erro de preenchimento, não um plano de jogo.
INSERT INTO goal_plan_rules (min_weekdays, max_weekdays, active_goals, difficulty_id)
SELECT dados.minimo, dados.maximo, dados.metas, dificuldade.id
  FROM (
    SELECT 1 AS minimo, 2 AS maximo, 1 AS metas, 'alta'    AS dificuldade
    UNION ALL SELECT 3, 4, 2, 'media'
    UNION ALL SELECT 5, 7, 3, 'simples'
  ) AS dados
  JOIN goal_difficulties dificuldade ON dificuldade.slug = dados.dificuldade
ON DUPLICATE KEY UPDATE
  active_goals = dados.metas, difficulty_id = dificuldade.id;

-- RN-015: o tamanho do alvo de cada tipo de meta.
--
-- A conta é `base_per_session x (minutos_por_sessao / 10) x dias x semanas do
-- prazo`, arredondada para `rounding_step` e presa entre o mínimo e o máximo. A
-- sessão de referência é de 10 minutos, que é o padrão do perfil.
--
-- Só os tipos que o MVP consegue medir aparecem aqui: mel acumulado e nível.
-- Patrimônio, favo, células, sequência e cofre entram quando as etapas que os
-- constroem existirem (E05, E08, E09) — e o planner passa a sorteá-los sozinho,
-- sem alteração de código, porque ele pergunta quais tipos têm régua.
--
-- Os números são calibragem inicial, não medição: 25 de mel por sessão de 10
-- minutos é da ordem do que duas tarefas do dia pagam hoje. O teto do mel é
-- deliberadamente baixo perto do que a fórmula produziria numa semana cheia de
-- sessões longas, porque o jogo ainda não tem de onde pagar tanto — a economia
-- de verdade é a E06 e a E07.
--
-- O nível pede um degrau por meta — dois, no máximo, quando o tipo se repete no
-- mesmo plano: a curva de XP é lenta nos primeiros níveis, e uma meta de "suba
-- três níveis nesta semana" seria impossível por construção.
-- Enquanto a E06 não creditar XP em jogo, a meta de nível fica parada — está na
-- dívida técnica, com dono naquela etapa.
--
-- Ajustar isto depois do playtest é editar estas linhas e rodar o seed.
INSERT INTO goal_target_rules (goal_type_id, base_per_session, min_increment, max_increment, rounding_step)
SELECT tipo.id, dados.base, dados.minimo, dados.maximo, dados.passo
  FROM (
    SELECT 'acumular-mel' AS tipo, 25.000 AS base,  50 AS minimo, 500 AS maximo, 25 AS passo
    UNION ALL SELECT 'atingir-nivel',      0.100,       1,          1,           1
  ) AS dados
  JOIN goal_types tipo ON tipo.slug = dados.tipo
ON DUPLICATE KEY UPDATE
  base_per_session = dados.base, min_increment = dados.minimo,
  max_increment = dados.maximo, rounding_step = dados.passo;

INSERT INTO task_scopes (slug, name) VALUES
  ('diaria',  'Diária'),
  ('semanal', 'Semanal')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- RN-046: compromissos curtos fora da trilha, que rendem pólen e um pouco de mel.
INSERT INTO task_types (slug, name, scope_id, progress_source, default_target, reward_points, reward_coins)
SELECT dados.slug, dados.name, escopo.id, dados.progress_source, dados.alvo, dados.polen, dados.mel
  FROM (
    SELECT 'concluir-3-celulas'  AS slug, 'Conclua 3 células hoje'        AS name, 'diaria'  AS escopo, 'cell_completed' AS progress_source, 3   AS alvo, 15 AS polen, 20 AS mel
    UNION ALL SELECT 'depositar-no-cofre', 'Deposite 50 de mel no cofre',        'diaria',  'vault_deposit',   50,  10, 15
    UNION ALL SELECT 'jogar-3-dias',       'Jogue em 3 dias diferentes',         'semanal', 'active_days',      3,  40, 60
    UNION ALL SELECT 'concluir-favo-semana','Conclua um favo esta semana',       'semanal', 'hive_completed',   1,  50, 80
  ) AS dados
  JOIN task_scopes escopo ON escopo.slug = dados.escopo
ON DUPLICATE KEY UPDATE
  name = dados.name, progress_source = dados.progress_source,
  default_target = dados.alvo, reward_points = dados.polen, reward_coins = dados.mel;

-- RN-020: dia não marcado é "neutro" e precisa aparecer assim no calendário.
INSERT INTO streak_event_types (slug, name) VALUES
  ('cumprido',  'Dia cumprido'),
  ('perdido',   'Dia perdido'),
  ('protegido', 'Protegido pelo escudo'),
  ('neutro',    'Dia neutro')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO item_categories (slug, name) VALUES
  ('moradia',     'Moradia'),
  ('transporte',  'Transporte'),
  ('tecnologia',  'Tecnologia'),
  ('negocios',    'Negócios'),
  ('cosmeticos',  'Cosméticos'),
  ('utilitarios', 'Utilitários')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- RN-034: os cinco comportamentos econômicos. Um item pode ter mais de um.
INSERT INTO item_behaviors (slug, name, description) VALUES
  ('neutro',     'Neutro',        'Não muda de valor nem gera custo'),
  ('valoriza',   'Valoriza',      'Ganha valor a cada ciclo'),
  ('deprecia',   'Deprecia',      'Perde valor a cada ciclo, respeitando um piso'),
  ('custo_fixo', 'Custo fixo',    'Cobra mel do saldo a cada ciclo'),
  ('gera_renda', 'Gera renda',    'Credita mel no saldo a cada ciclo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, description = novo.description;

INSERT INTO item_requirement_types (slug, name) VALUES
  ('nivel-minimo',      'Nível mínimo'),
  ('favo-concluido',    'Favo concluído'),
  ('item-prerequisito', 'Item pré-requisito'),
  ('patrimonio-minimo', 'Patrimônio mínimo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

-- RN-037: dois ciclos inadimplente e o item é vendido automaticamente.
INSERT INTO inventory_statuses (slug, name) VALUES
  ('ativo',        'Ativo'),
  ('inadimplente', 'Inadimplente'),
  ('vendido',      'Vendido')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO vault_transaction_types (slug, name) VALUES
  ('deposito',   'Depósito'),
  ('saque',      'Saque'),
  ('rendimento', 'Rendimento do ciclo'),
  ('bonus-meta', 'Bônus por bater a meta do cofre')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO audit_actor_types (slug, name) VALUES
  ('usuario', 'Usuário'),
  ('admin',   'Administrador'),
  ('sistema', 'Sistema')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;
