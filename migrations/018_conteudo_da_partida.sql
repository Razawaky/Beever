-- 018 — A partida passa a guardar qual atividade foi jogada.
--
-- Até aqui `game_sessions` sabia a célula e não sabia o conteúdo: a correção
-- relia "a versão atual da célula" no momento de fechar. Publicar uma versão
-- nova enquanto uma criança jogava fazia as respostas dela serem corrigidas
-- contra outra pergunta, e nada no sistema acusava.
--
-- A T-12.5 torna isso regra em vez de azar, porque a célula passa a ter um
-- acervo e a partida sorteia um item dele. Sem esta coluna o sorteio não teria
-- como ser corrigido.
--
-- Nasce nula por causa das partidas antigas, que não têm como saber o que
-- jogaram. Partida nova sempre grava. `ON DELETE RESTRICT` porque conteúdo
-- jogado não pode sumir do histórico.
--
-- REVERSÃO: ALTER TABLE game_sessions DROP FOREIGN KEY fk_game_sessions_content,
-- depois DROP COLUMN content_id.

ALTER TABLE game_sessions
  ADD COLUMN content_id BIGINT UNSIGNED DEFAULT NULL AFTER cell_id,
  ADD CONSTRAINT fk_game_sessions_content FOREIGN KEY (content_id) REFERENCES contents (id) ON DELETE RESTRICT;
