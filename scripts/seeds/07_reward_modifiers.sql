-- Fatores de recompensa (RN-006, RN-008 e RN-044).
--
-- `repeticao-de-celula`: repetir célula já concluída paga 25% do XP e zero mel.
-- O pólen também zera — a regra fala em impedir farming, e pólen que se repete
-- à vontade é o mesmo atalho que o mel. Se o produto decidir pagar pólen na
-- repetição, é um UPDATE aqui, sem deploy.
--
-- `bonus-de-meta-do-cofre`: bater a meta do cofre paga 5% do alvo em mel, e o
-- bônus cai dentro do próprio cofre. O percentual é pequeno de propósito — o
-- prêmio de guardar é o rendimento; o bônus é a comemoração.

INSERT INTO reward_modifiers (slug, name, xp_factor, points_factor, coins_factor)
VALUES ('repeticao-de-celula', 'Repetição de célula já concluída', 0.250, 0.000, 0.000),
       ('meta-renovada',       'Meta renovada depois de vencer',   0.500, 0.500, 0.500),
       ('bonus-de-meta-do-cofre', 'Bônus por bater a meta do cofre', 0.000, 0.000, 0.050)
ON DUPLICATE KEY UPDATE
  name          = VALUES(name),
  xp_factor     = VALUES(xp_factor),
  points_factor = VALUES(points_factor),
  coins_factor  = VALUES(coins_factor);
