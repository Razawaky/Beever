-- Fatores de recompensa (RN-006 e RN-008).
--
-- `repeticao-de-celula`: repetir célula já concluída paga 25% do XP e zero mel.
-- O pólen também zera — a regra fala em impedir farming, e pólen que se repete
-- à vontade é o mesmo atalho que o mel. Se o produto decidir pagar pólen na
-- repetição, é um UPDATE aqui, sem deploy.

INSERT INTO reward_modifiers (slug, name, xp_factor, points_factor, coins_factor)
VALUES ('repeticao-de-celula', 'Repetição de célula já concluída', 0.250, 0.000, 0.000)
ON DUPLICATE KEY UPDATE
  name          = VALUES(name),
  xp_factor     = VALUES(xp_factor),
  points_factor = VALUES(points_factor),
  coins_factor  = VALUES(coins_factor);
