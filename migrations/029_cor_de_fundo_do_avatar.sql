-- Adiciona cor de fundo escolhida para a bolinha/imagem do avatar do perfil.
-- Permite personalizar o fundo (até 12 cores definidas na aplicação).

ALTER TABLE profiles
  ADD COLUMN avatar_background VARCHAR(16) NULL AFTER avatar_id;
