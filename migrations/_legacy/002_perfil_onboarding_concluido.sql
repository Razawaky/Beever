-- O cadastro cria a conta e o perfil na hora, mas o apelido definitivo e o
-- nível inicial só existem depois do onboarding. Login e cadastro precisam
-- saber se essa etapa já foi concluída para decidir para onde redirecionar
-- (onboarding ou painel).
ALTER TABLE perfil
  ADD COLUMN onboarding_concluido TINYINT(1) NOT NULL DEFAULT 0 AFTER pontos;
