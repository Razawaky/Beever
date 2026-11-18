-- 027 — Catálogo de avatares usado no perfil.
--
-- Antes havia quatro opções e duas apontavam para PNG que não existem mais. O
-- perfil agora oferece dez imagens do próprio projeto, todas em WebP, sem
-- upload: a escolha continua sendo um slug conferido contra esta tabela.
--
-- `ON DUPLICATE KEY UPDATE` preserva o `id` (e portanto o `avatar_id` de quem já
-- escolheu) e só corrige rótulo e arquivo.
--
-- REVERSÃO: DELETE FROM avatars WHERE slug IN ('beenie-sentada', 'beenie-ensinando',
--   'beenie-show', 'beenie-coolpose', 'beenie-musica', 'beenie-tempo');
--   UPDATE avatars SET image_path = '/img/beenie_howdy.png' WHERE slug = 'beenie-classico';
--   UPDATE avatars SET image_path = '/img/beenie_vem.png' WHERE slug = 'beenie-explorador';
--   UPDATE avatars SET image_path = '/img/beenie_1real.png' WHERE slug = 'beenie-dourado';
--   UPDATE avatars SET image_path = '/img/babybee.png' WHERE slug = 'babybee';

INSERT INTO avatars (slug, name, image_path) VALUES
  ('beenie-classico',   'Beenie acenando',      '/img/beenie_howdy.webp'),
  ('beenie-explorador', 'Beenie a caminho',     '/img/beenie_vem.webp'),
  ('beenie-dourado',    'Beenie da moeda',      '/img/beenie_1real.webp'),
  ('babybee',           'Abelhinha',            '/img/babybee.webp'),
  ('beenie-sentada',    'Beenie convidando',    '/img/beenie_sentado_sexy.webp'),
  ('beenie-ensinando',  'Beenie ensinando',     '/img/beenie_ensinando.webp'),
  ('beenie-show',       'Beenie apresentando',  '/img/beenie_show.webp'),
  ('beenie-coolpose',   'Beenie estilosa',      '/img/beenie_coolpose.webp'),
  ('beenie-musica',     'Beenie com música',    '/img/beenie_music.webp'),
  ('beenie-tempo',      'Beenie do tempo',      '/img/beenie_time.webp')
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, image_path = novo.image_path, is_active = 1;
