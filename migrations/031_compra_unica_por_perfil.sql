-- 031 — Item único por perfil: cada usuário só pode comprar um item uma vez.
--
-- A regra é por avatar/perfil (user_id). A unicidade é garantida no banco
-- para evitar compra duplicada por corrida/reenvio fora da idempotência.
--
-- REVERSÃO: ALTER TABLE purchases DROP INDEX uq_purchases_user_item;

-- Remove duplicatas antigas, se existirem, mantendo a compra mais antiga.
DELETE p1
  FROM purchases p1
  JOIN purchases p2
    ON p1.user_id = p2.user_id
   AND p1.item_id = p2.item_id
   AND p1.id > p2.id;

ALTER TABLE purchases
  ADD UNIQUE KEY uq_purchases_user_item (user_id, item_id);
