-- 030 — Catálogo de avatares do perfil restrito aos 5 Beenies de img/perfil.
--
-- O perfil passa a oferecer apenas essas 5 imagens. Avatares antigos ficam
-- inativos (não aparecem no seletor), mas permanecem na tabela para não quebrar
-- perfis que já os referenciam.
--
-- REVERSÃO: UPDATE avatars SET is_active = 1 WHERE slug IN (
--   'beenie-classico','beenie-explorador','beenie-dourado','babybee',
--   'beenie-sentada','beenie-ensinando','beenie-show','beenie-coolpose',
--   'beenie-musica','beenie-tempo'
-- );
-- UPDATE avatars SET is_active = 0 WHERE slug IN (
--   'beenie-normal','beenie-beta','beenie-branco','beenie-preto','beenie-mae'
-- );

UPDATE avatars SET is_active = 0;

INSERT INTO avatars (slug, name, image_path, is_active) VALUES
  ('beenie-normal', 'Beenie',        '/img/perfil/perfil_beenie_normal.webp', 1),
  ('beenie-beta',   'Beenie Beta',   '/img/perfil/perfil_beenie_beta.webp',   1),
  ('beenie-branco', 'Beenie Branca', '/img/perfil/perfil_beenie_branco.webp', 1),
  ('beenie-preto',  'Beenie Preta',  '/img/perfil/perfil_beenie_preto.webp',  1),
  ('beenie-mae',    'Beenie Mãe',    '/img/perfil/perfil_beenie_mae.webp',    1)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name,
  image_path = novo.image_path,
  is_active = novo.is_active;
