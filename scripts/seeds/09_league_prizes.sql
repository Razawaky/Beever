-- Prêmio do pódio da liga semanal (RF-GAM-02).
--
-- Só as três primeiras posições pagam, e o valor é modesto de propósito: a liga
-- é reconhecimento, não fonte de renda. Ganhar a semana rende menos que fechar
-- um favo, porque o favo é aprendizado e a liga é comparação.
--
-- Ninguém é rebaixado nem perde nada por ficar de fora do pódio — é o "sem
-- rebaixamento punitivo" da RF-GAM-02, e a ausência de linha negativa aqui é
-- parte disso.

INSERT INTO league_prizes (final_rank, reward_coins) VALUES
  (1, 300),
  (2, 200),
  (3, 100)
AS novo
ON DUPLICATE KEY UPDATE reward_coins = novo.reward_coins;
