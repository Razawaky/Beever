-- 022 — A conquista passa a dizer o que destrava ela.
--
-- `achievements` guardava nome, descrição e bônus, e nada sobre a regra. O
-- desbloqueio funcionava porque o `streakService` montava o slug com o número
-- dentro (`sequencia-7`), então o slug carregava a regra por coincidência.
--
-- Isso não se estende às outras quatro famílias que a RF-GAM-01 pede: `favo-3`
-- não diz "três favos concluídos", e nada no banco diria. Com as duas colunas, a
-- regra fica onde o resto das regras de recompensa já mora (RN-006), e o slug
-- volta a ser só um nome estável.
--
-- `criterion_type` é texto e não tabela de domínio de propósito: o conjunto é
-- pequeno, muda junto com o código que sabe medir cada um, e uma tabela a mais
-- só acrescentaria join a toda leitura de conquista.
--
-- Nasce com o critério da sequência preenchido a partir do slug atual, para as
-- cinco conquistas que já existem continuarem funcionando sem seed novo.
--
-- REVERSÃO: ALTER TABLE achievements DROP KEY idx_achievements_criterio,
-- DROP COLUMN criterion_target, DROP COLUMN criterion_type.

ALTER TABLE achievements
  ADD COLUMN criterion_type  VARCHAR(40) NOT NULL DEFAULT 'manual' AFTER description,
  ADD COLUMN criterion_target BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER criterion_type,
  ADD KEY idx_achievements_criterio (criterion_type, criterion_target);

UPDATE achievements
   SET criterion_type = 'sequencia-dias',
       criterion_target = CAST(SUBSTRING(slug, 11) AS UNSIGNED)
 WHERE slug LIKE 'sequencia-%';
