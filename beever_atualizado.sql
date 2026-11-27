-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Tempo de geração: 30/10/2026 às 14:10
-- Versão do servidor: 8.4.11
-- Versão do PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `beever`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `achievements`
--

CREATE TABLE `achievements` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) NOT NULL,
  `criterion_type` varchar(40) NOT NULL DEFAULT 'manual',
  `criterion_target` bigint UNSIGNED NOT NULL DEFAULT '0',
  `icon_path` varchar(255) DEFAULT NULL,
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `achievements`
--

INSERT INTO `achievements` (`id`, `slug`, `name`, `description`, `criterion_type`, `criterion_target`, `icon_path`, `reward_coins`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'sequencia-7', 'Uma semana inteira', 'Sete dias seguidos de colmeia. O começo de tudo.', 'sequencia-dias', 7, NULL, 100, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'sequencia-14', 'Duas semanas', 'Catorze dias seguidos. Já virou hábito.', 'sequencia-dias', 14, NULL, 200, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'sequencia-30', 'Um mês de constância', 'Trinta dias seguidos. Dá para comprar um Escudo com isso.', 'sequencia-dias', 30, NULL, 400, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 'sequencia-60', 'Dois meses firmes', 'Sessenta dias seguidos. Pouca gente chega aqui.', 'sequencia-dias', 60, NULL, 800, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 'sequencia-100', 'Cem dias', 'Cem dias seguidos. Você é lenda da colmeia.', 'sequencia-dias', 100, NULL, 1500, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 'favo-1', 'Primeiro favo fechado', 'Você terminou um favo inteiro da trilha.', 'favos-concluidos', 1, NULL, 100, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(7, 'favo-3', 'Três favos', 'Três favos fechados. A trilha já tem história.', 'favos-concluidos', 3, NULL, 250, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(8, 'favo-6', 'Seis favos', 'Seis favos fechados. Metade do caminho.', 'favos-concluidos', 6, NULL, 500, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(9, 'favo-12', 'Doze favos', 'Doze favos fechados. Colmeia inteira na mão.', 'favos-concluidos', 12, NULL, 1000, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(10, 'celulas-10', 'Dez atividades', 'Dez células concluídas. Está pegando o jeito.', 'celulas-concluidas', 10, NULL, 100, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(11, 'celulas-30', 'Trinta atividades', 'Trinta células concluídas. Isso é constância.', 'celulas-concluidas', 30, NULL, 250, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(12, 'celulas-75', 'Setenta e cinco', 'Setenta e cinco células. Poucos chegam tão longe.', 'celulas-concluidas', 75, NULL, 500, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(13, 'celulas-150', 'Cento e cinquenta', 'Cento e cinquenta células concluídas.', 'celulas-concluidas', 150, NULL, 1000, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(14, 'patrimonio-500', 'Primeiro patrimônio', 'Quinhentos de patrimônio. Você tem alguma coisa.', 'patrimonio-total', 500, NULL, 100, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(15, 'patrimonio-2000', 'Dois mil', 'Dois mil de patrimônio somando tudo o que é seu.', 'patrimonio-total', 2000, NULL, 250, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(16, 'patrimonio-5000', 'Cinco mil', 'Cinco mil de patrimônio. Isso dá segurança.', 'patrimonio-total', 5000, NULL, 500, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(17, 'patrimonio-10000', 'Dez mil', 'Dez mil de patrimônio. Colmeia próspera.', 'patrimonio-total', 10000, NULL, 1000, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(18, 'cofre-100', 'Primeiro cofrinho', 'Cem de mel guardados no cofre.', 'cofre-guardado', 100, NULL, 100, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(19, 'cofre-500', 'Guardando de verdade', 'Quinhentos de mel no cofre, rendendo toda semana.', 'cofre-guardado', 500, NULL, 250, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(20, 'cofre-1500', 'Reserva formada', 'Mil e quinhentos guardados. Isso é uma reserva.', 'cofre-guardado', 1500, NULL, 500, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(21, 'cofre-4000', 'Cofre cheio', 'Quatro mil de mel no cofre. Paciência rende.', 'cofre-guardado', 4000, NULL, 1000, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `admins`
--

CREATE TABLE `admins` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `admins`
--

INSERT INTO `admins` (`id`, `user_id`, `created_at`, `updated_at`) VALUES
(2, 4, '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `age_bands`
--

CREATE TABLE `age_bands` (
  `id` bigint UNSIGNED NOT NULL,
  `code` char(1) NOT NULL,
  `name` varchar(60) NOT NULL,
  `min_age` tinyint UNSIGNED NOT NULL,
  `max_age` tinyint UNSIGNED NOT NULL,
  `is_economy_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_upkeep_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_depreciation_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `age_bands`
--

INSERT INTO `age_bands` (`id`, `code`, `name`, `min_age`, `max_age`, `is_economy_enabled`, `is_upkeep_enabled`, `is_depreciation_enabled`, `created_at`, `updated_at`) VALUES
(1, 'A', 'Faixa A — primeiros passos', 6, 8, 1, 0, 0, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'B', 'Faixa B — explorando', 9, 11, 1, 1, 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'C', 'Faixa C — planejando', 12, 15, 1, 1, 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `audit_actor_types`
--

CREATE TABLE `audit_actor_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `audit_actor_types`
--

INSERT INTO `audit_actor_types` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'usuario', 'Usuário', '2026-09-17 23:43:41'),
(2, 'admin', 'Administrador', '2026-09-17 23:43:41'),
(3, 'sistema', 'Sistema', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `actor_type_id` bigint UNSIGNED NOT NULL,
  `actor_id` bigint UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(60) NOT NULL,
  `entity_id` bigint UNSIGNED DEFAULT NULL,
  `before_state` json DEFAULT NULL,
  `after_state` json DEFAULT NULL,
  `ip_hash` char(64) DEFAULT NULL,
  `request_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `actor_type_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `ip_hash`, `request_id`, `created_at`) VALUES
(1, 1, 3, 'conta.criada', 'user', 3, NULL, '{\"faixaEtaria\": \"C\", \"consentimentoDeResponsavel\": false}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '91ca23fa-cacf-4fac-89e6-cf29c69fcc93', '2026-09-17 23:44:25'),
(2, 1, 3, 'onboarding.concluido', 'profile', 3, NULL, '{\"avatar\": \"babybee\", \"objetivo\": \"aprender-a-guardar\", \"nivelInicial\": 5, \"diasDisponiveis\": 3}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '59a2d6be-2318-46b8-93a4-4ac44ad1de05', '2026-09-17 23:53:34'),
(3, 1, 3, 'xp.ponto-de-partida', 'user_level', 3, '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0}', '{\"xp\": 1120, \"mel\": 0, \"nivel\": 5, \"polen\": 0, \"nivelInicial\": 5, \"nivelEscolhido\": \"intermediate\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '59a2d6be-2318-46b8-93a4-4ac44ad1de05', '2026-09-17 23:53:34'),
(4, 1, 3, 'meta.criada', 'goal', 4, NULL, '{\"alvo\": 6, \"tipo\": \"atingir-nivel\", \"origem\": \"planejador\", \"titulo\": \"Chegue ao nível 6\", \"dificuldade\": \"media\", \"diasDisponiveis\": 3, \"recompensaMoedas\": 150, \"recompensaPontos\": 90}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '59a2d6be-2318-46b8-93a4-4ac44ad1de05', '2026-09-17 23:53:34'),
(5, 1, 3, 'meta.criada', 'goal', 5, NULL, '{\"alvo\": 1, \"tipo\": \"concluir-favo\", \"origem\": \"planejador\", \"titulo\": \"Chegue a 1 favos concluídos\", \"dificuldade\": \"media\", \"diasDisponiveis\": 3, \"recompensaMoedas\": 150, \"recompensaPontos\": 90}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '59a2d6be-2318-46b8-93a4-4ac44ad1de05', '2026-09-17 23:53:34'),
(6, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ac34c28f-0804-416e-989a-05672d7f4a68', '2026-09-18 00:41:41'),
(7, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '62a3e1e4-cd7d-42c6-b6d8-9212f3a769e4', '2026-09-18 00:41:49'),
(8, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '2e9288a3-b4f2-46f2-8811-a88cde656e13', '2026-09-18 00:42:18'),
(9, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'f72a8179-116d-4d0a-bb7b-fa56334b316f', '2026-09-18 00:43:02'),
(10, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '4c05309d-0c48-4e2f-a4e7-97414f709e78', '2026-09-18 00:43:22'),
(11, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '11d7194e-831a-4302-b579-68faae92bed9', '2026-09-19 20:43:31'),
(12, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '3ee7cb13-9726-4324-8783-8a83d1e19362', '2026-09-20 00:23:23'),
(13, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'fbe49e67-0a4f-49ec-a63b-b5a543b9e27d', '2026-09-20 01:37:21'),
(14, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'd3e0230c-02c6-4733-af90-863b888a65e6', '2026-09-20 01:37:36'),
(15, 1, 3, 'sessao.logout', 'user', 3, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '0b1b8a2f-a9ee-4484-8065-7a68a72c654c', '2026-09-20 02:47:20'),
(16, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '32a1a677-7993-4f5e-9e85-66d22bb4bece', '2026-09-20 14:54:02'),
(17, 3, NULL, 'ciclo.economico', 'economic_cycle', 3, '{\"xp\": 1120, \"mel\": 0, \"nivel\": 5, \"polen\": 0}', '{\"xp\": 1120, \"mel\": 0, \"nivel\": 5, \"polen\": 0, \"ciclos\": [1], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '51aa7adf-4a17-4ee6-82f6-e6af85344f5d', '2026-09-20 14:54:02'),
(18, 3, NULL, 'tarefa.gerada', 'task', 3, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-09-21 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '51aa7adf-4a17-4ee6-82f6-e6af85344f5d', '2026-09-20 14:54:02'),
(19, 3, NULL, 'tarefa.gerada', 'task', 4, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-09-21 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '51aa7adf-4a17-4ee6-82f6-e6af85344f5d', '2026-09-20 14:54:02'),
(20, 3, NULL, 'tarefa.gerada', 'task', 5, NULL, '{\"alvo\": 3, \"tipo\": \"jogar-3-dias\", \"prazo\": \"2026-09-27 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '51aa7adf-4a17-4ee6-82f6-e6af85344f5d', '2026-09-20 14:54:02'),
(21, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '03972ae1-0bf3-419f-a9a8-76572e0cc2c3', '2026-09-20 16:37:14'),
(22, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '7306cb58-b9ae-43ea-b6e6-9a5877253d55', '2026-09-20 16:38:58'),
(23, 3, NULL, 'ciclo.economico', 'economic_cycle', 1, '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0}', '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0, \"ciclos\": [1], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '2d5e0a54-1da7-40e4-859b-084215717020', '2026-09-20 16:38:58'),
(24, 3, NULL, 'tarefa.gerada', 'task', 6, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-09-21 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '2d5e0a54-1da7-40e4-859b-084215717020', '2026-09-20 16:38:58'),
(25, 3, NULL, 'tarefa.gerada', 'task', 7, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-09-21 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '2d5e0a54-1da7-40e4-859b-084215717020', '2026-09-20 16:38:58'),
(26, 3, NULL, 'tarefa.gerada', 'task', 8, NULL, '{\"alvo\": 3, \"tipo\": \"jogar-3-dias\", \"prazo\": \"2026-09-27 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '2d5e0a54-1da7-40e4-859b-084215717020', '2026-09-20 16:38:58'),
(27, 2, 1, 'sessao.logout', 'user', 1, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'efd70723-d774-4cd6-92d5-5ced5a69e4e1', '2026-09-20 16:39:55'),
(28, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8915de79-a246-4bd9-9568-4016f6ff1dd8', '2026-09-20 16:40:51'),
(29, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '90631613-dcfb-4edd-8f9a-02d350e2e7c0', '2026-09-20 16:40:57'),
(30, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'd37cceb9-8f0e-4174-a421-e0d0d9db1dbd', '2026-09-20 16:41:14'),
(31, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'a42579de-71ce-4286-879a-9bde29fd7884', '2026-09-20 16:41:22'),
(32, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '488c6672-ef52-47db-add1-8ff7dc106f23', '2026-09-20 16:41:34'),
(33, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '922d1663-6906-46da-a2ad-561bc216dd65', '2026-09-20 16:41:46'),
(34, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '5915248f-9fc9-4470-b406-776fb6690ab5', '2026-09-20 16:42:28'),
(35, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'e49abc77-37e7-429f-803a-0e95ffef04a6', '2026-09-20 19:09:02'),
(36, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '3811db03-4af5-4444-b9e5-c3703a91287a', '2026-09-20 19:09:28'),
(37, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'a0eae0b0-da09-47b5-84c2-89e4d69ef3e7', '2026-09-20 20:19:17'),
(38, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '56625a1a-1afa-4dc7-8176-20604fd95080', '2026-09-20 20:19:27'),
(39, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'f9561c30-0183-4430-ac64-86afe15e9099', '2026-09-20 20:19:47'),
(40, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'dcf19450-ecde-41d2-8362-901e342d4b98', '2026-09-20 21:02:15'),
(41, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'b3327533-7438-42dc-8633-4ac9d7e2339c', '2026-09-21 00:19:30'),
(42, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '197fc2d8-7590-4d23-8d3b-df46cd0b75f2', '2026-09-21 00:19:45'),
(43, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '29efcb9e-3d98-45ed-be19-e8c6ca487242', '2026-09-21 00:20:04'),
(44, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'e510d1f2-b2b0-4ed4-a005-2feb1a267bc0', '2026-09-21 00:20:22'),
(45, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8ae7b1ac-a4b4-4d39-9d1d-f1573ad63b86', '2026-09-21 00:20:47'),
(46, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '5da5cd2d-2b84-430b-be21-06a250ff9591', '2026-09-21 00:22:16'),
(47, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '59e55ca2-f6e3-413e-9156-6ee3dea99197', '2026-09-21 00:22:34'),
(48, 2, 1, 'sessao.login', 'user', 1, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6ae8afd1-9ed7-4497-b140-2965dc69a922', '2026-09-21 17:40:54'),
(49, 3, NULL, 'tarefa.gerada', 'task', 9, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-09-22 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8bde6891-2b4d-45e5-b8d8-493bae25a8f6', '2026-09-21 17:40:54'),
(50, 3, NULL, 'tarefa.gerada', 'task', 10, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-09-22 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8bde6891-2b4d-45e5-b8d8-493bae25a8f6', '2026-09-21 17:40:54'),
(51, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'a4618b30-4f15-4675-9244-0a39e6cfe878', '2026-09-21 18:07:31'),
(52, 3, NULL, 'tarefa.gerada', 'task', 11, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-09-22 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'e1139e79-3d1c-45ae-a68e-cd7f1f294fcc', '2026-09-21 18:07:31'),
(53, 3, NULL, 'tarefa.gerada', 'task', 12, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-09-22 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'e1139e79-3d1c-45ae-a68e-cd7f1f294fcc', '2026-09-21 18:07:31'),
(54, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '9c7f0aab-5279-4ebc-bd44-3f464c655e38', '2026-09-21 19:53:08'),
(55, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '3bd0ea7c-3cf1-4b5f-800f-be7ed8754c35', '2026-10-04 02:01:38'),
(56, 3, NULL, 'tarefa.gerada', 'task', 16, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-04 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '154f3c34-0993-4647-b7f3-67f87e53c31d', '2026-10-04 02:01:38'),
(57, 3, NULL, 'tarefa.gerada', 'task', 17, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-04 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '154f3c34-0993-4647-b7f3-67f87e53c31d', '2026-10-04 02:01:38'),
(58, 3, NULL, 'tarefa.gerada', 'task', 18, NULL, '{\"alvo\": 1, \"tipo\": \"concluir-favo-semana\", \"prazo\": \"2026-10-04 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '154f3c34-0993-4647-b7f3-67f87e53c31d', '2026-10-04 02:01:38'),
(59, 3, NULL, 'ciclo.economico', 'economic_cycle', 4, '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0}', '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0, \"ciclos\": [1], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '331c7801-047d-4707-b763-733a119a3fbc', '2026-10-04 03:00:36'),
(60, 3, NULL, 'tarefa.gerada', 'task', 19, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-05 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '331c7801-047d-4707-b763-733a119a3fbc', '2026-10-04 03:00:36'),
(61, 3, NULL, 'tarefa.gerada', 'task', 20, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-05 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '331c7801-047d-4707-b763-733a119a3fbc', '2026-10-04 03:00:36'),
(62, 3, NULL, 'tarefa.gerada', 'task', 21, NULL, '{\"alvo\": 3, \"tipo\": \"jogar-3-dias\", \"prazo\": \"2026-10-11 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '331c7801-047d-4707-b763-733a119a3fbc', '2026-10-04 03:00:36'),
(63, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'c0d901b4-8111-46af-a5d9-3f8672c07fa2', '2026-10-04 14:59:04'),
(64, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'f6a5eab3-0745-4127-88b8-647d983a263c', '2026-10-04 15:21:04'),
(65, 2, 4, 'sessao.logout', 'user', 4, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '1b4e0e0e-2c75-4942-9729-72459db46a8c', '2026-10-04 15:36:29'),
(66, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8b07b1d1-9334-4647-afdc-71d42aeaa4a3', '2026-10-04 15:36:39'),
(67, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '96075ead-8ff8-4b92-88b0-356e9113a11d', '2026-10-07 22:20:04'),
(68, 3, NULL, 'tarefa.gerada', 'task', 22, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-08 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'b9406ecc-449b-41f9-96af-cb9a2336fb60', '2026-10-07 22:20:04'),
(69, 3, NULL, 'tarefa.gerada', 'task', 23, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-08 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'b9406ecc-449b-41f9-96af-cb9a2336fb60', '2026-10-07 22:20:04'),
(70, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'c466d9a3-7f4d-4145-9d17-8b78cb799428', '2026-10-08 18:15:22'),
(71, 3, NULL, 'tarefa.gerada', 'task', 24, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-09 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '7e92529e-84fc-410d-8113-aeb9601e682e', '2026-10-08 18:15:22'),
(72, 3, NULL, 'tarefa.gerada', 'task', 25, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-09 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '7e92529e-84fc-410d-8113-aeb9601e682e', '2026-10-08 18:15:22'),
(73, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '40abddd1-d0d5-49f3-a335-d3dcb45aacc1', '2026-10-08 20:02:24'),
(74, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '3190864d-6ea3-43e2-9185-40bc85d76046', '2026-10-13 00:26:09'),
(75, 3, NULL, 'ciclo.economico', 'economic_cycle', 4, '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0}', '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0, \"ciclos\": [2], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'bc89fb70-5bb5-4341-9af5-6e102444a031', '2026-10-13 00:26:09'),
(76, 3, NULL, 'tarefa.gerada', 'task', 26, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-13 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'bc89fb70-5bb5-4341-9af5-6e102444a031', '2026-10-13 00:26:09'),
(77, 3, NULL, 'tarefa.gerada', 'task', 27, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-13 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'bc89fb70-5bb5-4341-9af5-6e102444a031', '2026-10-13 00:26:09'),
(78, 3, NULL, 'tarefa.gerada', 'task', 28, NULL, '{\"alvo\": 3, \"tipo\": \"jogar-3-dias\", \"prazo\": \"2026-10-18 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'bc89fb70-5bb5-4341-9af5-6e102444a031', '2026-10-13 00:26:09'),
(79, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'dfcbc4c7-bb95-4141-a565-ce81072df1d5', '2026-10-13 01:57:08'),
(80, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'da49d100-d835-4d05-b98c-429ea02206fb', '2026-10-13 01:57:29'),
(81, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'fe717470-4c81-4517-81a9-d81a0647d82f', '2026-10-25 15:29:41'),
(82, 3, NULL, 'ciclo.economico', 'economic_cycle', 4, '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0}', '{\"xp\": 0, \"mel\": 0, \"nivel\": 1, \"polen\": 0, \"ciclos\": [3, 4], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '193ce408-45c8-4009-82d6-d83a9cf66873', '2026-10-25 15:29:41'),
(83, 3, NULL, 'tarefa.gerada', 'task', 29, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-26 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '193ce408-45c8-4009-82d6-d83a9cf66873', '2026-10-25 15:29:41'),
(84, 3, NULL, 'tarefa.gerada', 'task', 30, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-26 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '193ce408-45c8-4009-82d6-d83a9cf66873', '2026-10-25 15:29:41'),
(85, 3, NULL, 'tarefa.gerada', 'task', 31, NULL, '{\"alvo\": 1, \"tipo\": \"concluir-favo-semana\", \"prazo\": \"2026-11-01 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '193ce408-45c8-4009-82d6-d83a9cf66873', '2026-10-25 15:29:41'),
(86, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6ed9449d-296b-432a-a4df-454d7d784404', '2026-10-25 16:38:16'),
(87, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ee29924e-8fe2-4dbe-8cfb-8686a599328a', '2026-10-26 16:34:59'),
(88, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '0b1e102b-c544-47e7-8d0f-feb113797fbf', '2026-10-26 16:35:17'),
(89, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '78c2b6db-dffe-41cc-a997-1731d3fce675', '2026-10-26 16:36:18'),
(90, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'b18ce0c0-1d9d-4172-ada3-47913cc86be8', '2026-10-26 16:36:50'),
(91, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '46d11658-4cf3-41ce-a157-7278216d12a5', '2026-10-26 16:37:20'),
(92, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ad6aacfb-d531-4481-be8e-92015075d2ec', '2026-10-26 16:37:58'),
(93, 3, NULL, 'tarefa.gerada', 'task', 32, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-27 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '7145a247-ac35-4ee5-938b-31e662c3030b', '2026-10-26 16:37:58'),
(94, 3, NULL, 'tarefa.gerada', 'task', 33, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-27 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '7145a247-ac35-4ee5-938b-31e662c3030b', '2026-10-26 16:37:58'),
(95, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'e9b2e4b7-786b-4888-9c50-c28866b9746c', '2026-10-28 16:24:43'),
(96, 3, NULL, 'tarefa.gerada', 'task', 34, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-29 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ec031758-9ee7-430c-a2df-cdead7198cbb', '2026-10-28 16:24:44'),
(97, 3, NULL, 'tarefa.gerada', 'task', 35, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-29 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ec031758-9ee7-430c-a2df-cdead7198cbb', '2026-10-28 16:24:44'),
(98, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'cb84b59d-e683-48d3-8417-453e109ddbc4', '2026-10-29 21:12:40'),
(99, 3, NULL, 'tarefa.gerada', 'task', 36, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-30 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '45eb400a-3139-47ea-a0ae-f4ffcb4d45b8', '2026-10-29 21:12:40'),
(100, 3, NULL, 'tarefa.gerada', 'task', 37, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-30 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '45eb400a-3139-47ea-a0ae-f4ffcb4d45b8', '2026-10-29 21:12:40'),
(101, 2, 4, 'sessao.logout', 'user', 4, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'bf43c253-0bd1-49f1-82cd-ce8ee0247a64', '2026-10-29 21:23:26'),
(102, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '733ad0b2-2d0c-499d-aafd-213ae42f94b5', '2026-10-29 21:23:31'),
(103, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ed1115a1-803f-41fe-b52f-f30d3ff716de', '2026-10-29 21:23:34'),
(104, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '58e1779b-ee7a-419f-b792-8e1065face51', '2026-10-29 21:23:45'),
(105, 2, 4, 'sessao.logout', 'user', 4, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'ec9a87fd-fc62-4e4e-aff6-254461508f98', '2026-10-29 22:11:35'),
(106, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6d5c265e-936e-4fd6-8a19-1aeba54003ba', '2026-10-29 22:16:45'),
(107, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '186555aa-57a7-4455-aca9-301689e81291', '2026-10-29 22:16:57'),
(108, 2, 4, 'sessao.logout', 'user', 4, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '74a3757d-aa55-4531-b853-2e4a00931d98', '2026-10-29 22:17:08'),
(109, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '5da2433c-8002-4b7e-a5bc-783f1923f508', '2026-10-29 22:24:49'),
(110, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '20861bbd-5f8f-4072-82ea-29addfc0e706', '2026-10-29 22:25:41'),
(111, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '87a3409e-9ad5-4d88-970f-e7e14436e0bb', '2026-10-29 22:26:03'),
(112, 3, NULL, 'ciclo.economico', 'economic_cycle', 3, '{\"xp\": 1120, \"mel\": 0, \"nivel\": 5, \"polen\": 0}', '{\"xp\": 1120, \"mel\": 0, \"nivel\": 5, \"polen\": 0, \"ciclos\": [2, 3, 4, 5, 6], \"pulados\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '021e25c6-0d1c-477a-90e2-e252eef31e20', '2026-10-29 22:26:03'),
(113, 1, 3, 'meta.expirada', 'goal', 4, '{\"alvo\": 6, \"status\": \"ativa\", \"progresso\": 5}', '{\"status\": \"expirada\", \"recompensaPaga\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '021e25c6-0d1c-477a-90e2-e252eef31e20', '2026-10-29 22:26:03'),
(114, 1, 3, 'meta.expirada', 'goal', 5, '{\"alvo\": 1, \"status\": \"ativa\", \"progresso\": 0}', '{\"status\": \"expirada\", \"recompensaPaga\": 0}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '021e25c6-0d1c-477a-90e2-e252eef31e20', '2026-10-29 22:26:03'),
(115, 1, 3, 'meta.criada', 'goal', 8, NULL, '{\"alvo\": 6, \"tipo\": \"concluir-celulas\", \"origem\": \"planejador\", \"titulo\": \"Chegue a 6 células concluídas\", \"dificuldade\": \"media\", \"diasDisponiveis\": 3, \"recompensaMoedas\": 150, \"recompensaPontos\": 90}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '021e25c6-0d1c-477a-90e2-e252eef31e20', '2026-10-29 22:26:03'),
(116, 1, 3, 'meta.criada', 'goal', 9, NULL, '{\"alvo\": 150, \"tipo\": \"acumular-mel\", \"origem\": \"planejador\", \"titulo\": \"Chegue a 150 de mel\", \"dificuldade\": \"media\", \"diasDisponiveis\": 3, \"recompensaMoedas\": 150, \"recompensaPontos\": 90}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '021e25c6-0d1c-477a-90e2-e252eef31e20', '2026-10-29 22:26:03'),
(117, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8fa80cc2-ab6c-4641-ad65-7005f1aa416d', '2026-10-29 23:44:10'),
(118, 2, 4, 'sessao.login', 'user', 4, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '1057e354-6a56-4dea-8f64-21a5a6e8ebec', '2026-10-30 13:10:56'),
(119, 3, NULL, 'tarefa.gerada', 'task', 38, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-31 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'c0d2907a-9e8c-4b42-8f1f-91db79fa4d8e', '2026-10-30 13:10:57'),
(120, 3, NULL, 'tarefa.gerada', 'task', 39, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-31 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', 'c0d2907a-9e8c-4b42-8f1f-91db79fa4d8e', '2026-10-30 13:10:57'),
(121, 2, 4, 'sessao.logout', 'user', 4, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '44cdd1a1-9c3e-461e-b50b-35362f1316ae', '2026-10-30 13:12:33'),
(122, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '1827a339-1b1b-4900-92f9-69e74a4facb9', '2026-10-30 13:13:02'),
(123, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '124fb830-1785-4736-a40d-07c5dd35a2a8', '2026-10-30 13:13:35'),
(124, 3, NULL, 'tarefa.gerada', 'task', 40, NULL, '{\"alvo\": 50, \"tipo\": \"depositar-no-cofre\", \"prazo\": \"2026-10-31 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6d8b674e-e2f9-47a4-9123-06b085604db5', '2026-10-30 13:13:35'),
(125, 3, NULL, 'tarefa.gerada', 'task', 41, NULL, '{\"alvo\": 3, \"tipo\": \"concluir-3-celulas\", \"prazo\": \"2026-10-31 03:00:00\", \"escopo\": \"diaria\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6d8b674e-e2f9-47a4-9123-06b085604db5', '2026-10-30 13:13:35'),
(126, 3, NULL, 'tarefa.gerada', 'task', 42, NULL, '{\"alvo\": 3, \"tipo\": \"jogar-3-dias\", \"prazo\": \"2026-11-01 03:00:00\", \"escopo\": \"semanal\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '6d8b674e-e2f9-47a4-9123-06b085604db5', '2026-10-30 13:13:35'),
(127, 1, 3, 'sessao.logout', 'user', 3, NULL, NULL, '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '3bb04afe-a0d1-4e30-b951-7f0fab0095b7', '2026-10-30 13:33:31'),
(128, 1, 6, 'conta.criada', 'user', 6, NULL, '{\"faixaEtaria\": \"C\", \"consentimentoDeResponsavel\": false}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '88059d72-a3ff-4851-be66-db20f8a03110', '2026-10-30 13:34:33'),
(129, 1, 6, 'sessao.login', 'user', 6, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '04ab80bc-8b16-4d32-a7f8-857fb01e404a', '2026-10-30 13:34:45'),
(130, 1, 6, 'sessao.login', 'user', 6, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '1dfc21b9-013b-48a1-a9c9-19adae19b9f2', '2026-10-30 13:35:17'),
(131, 1, 3, 'sessao.login', 'user', 3, NULL, '{\"metodo\": \"senha\"}', '05cc2f36ce74fb5f65490c226e172297e2fdabd237782a22c35700fe02f6bc34', '8df2e871-14d9-4867-b11a-47b0b50cd237', '2026-10-30 14:00:07');

--
-- Acionadores `audit_logs`
--
DELIMITER $$
CREATE TRIGGER `trg_audit_logs_sem_delete` BEFORE DELETE ON `audit_logs` FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: apagar registro de auditoria nao e permitido (RNF-17)'
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_audit_logs_sem_update` BEFORE UPDATE ON `audit_logs` FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: alterar registro de auditoria nao e permitido (RNF-17)'
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `avatars`
--

CREATE TABLE `avatars` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(60) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `avatars`
--

INSERT INTO `avatars` (`id`, `slug`, `name`, `image_path`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'beenie-classico', 'Beenie', '/img/beenie_howdy.png', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'beenie-explorador', 'Beenie explorador', '/img/beenie_vem.png', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'beenie-dourado', 'Beenie dourado', '/img/beenie_1real.png', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(4, 'babybee', 'Abelhinha', '/img/babybee.png', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cells`
--

CREATE TABLE `cells` (
  `id` bigint UNSIGNED NOT NULL,
  `hive_id` bigint UNSIGNED NOT NULL,
  `game_type_id` bigint UNSIGNED NOT NULL,
  `age_band_id` bigint UNSIGNED NOT NULL,
  `order_index` smallint UNSIGNED NOT NULL,
  `title` varchar(120) NOT NULL,
  `estimated_seconds` int UNSIGNED NOT NULL DEFAULT '300',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `cells`
--

INSERT INTO `cells` (`id`, `hive_id`, `game_type_id`, `age_band_id`, `order_index`, `title`, `estimated_seconds`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 'O que é mel?', 180, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 1, 2, 1, 2, 'Ganhar e gastar', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 1, 6, 1, 3, 'Preciso ou quero?', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 1, 3, 1, 4, 'Meu primeiro orçamento', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 2, 1, 1, 1, 'Por que guardar?', 180, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 2, 4, 1, 2, 'O cofre do tempo', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(7, 2, 5, 1, 3, 'Comparando preços', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(8, 2, 3, 1, 4, 'Planejando a semana', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(9, 3, 1, 2, 1, 'Contando o troco', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(10, 3, 5, 2, 2, 'Qual é a melhor compra?', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(11, 3, 2, 2, 3, 'Gasto fixo ou variável?', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(12, 3, 3, 2, 4, 'A conta do mês', 360, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(13, 4, 3, 2, 1, 'Quanto sobra?', 360, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(14, 4, 6, 2, 2, 'Primeiro o quê?', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(15, 4, 1, 2, 3, 'Imprevisto na porta', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(16, 4, 4, 2, 4, 'Guardar antes de gastar', 360, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(17, 5, 4, 3, 1, 'O juro que trabalha por você', 420, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(18, 5, 1, 3, 2, 'O juro que trabalha contra', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(19, 5, 5, 3, 3, 'À vista ou parcelado?', 360, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(20, 5, 6, 3, 4, 'Esperar vale quanto?', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(21, 6, 2, 3, 1, 'Gastar, guardar, render', 360, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(22, 6, 1, 3, 2, 'O que é patrimônio', 300, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(23, 6, 4, 3, 3, 'Montando a reserva', 420, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(24, 6, 3, 3, 4, 'A escolha de um ano', 420, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(25, 3, 7, 2, 5, 'Complete a frase do mel', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(26, 3, 8, 2, 6, 'A tarde de sábado', 240, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cell_progress`
--

CREATE TABLE `cell_progress` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `cell_id` bigint UNSIGNED NOT NULL,
  `stars` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `attempts` int UNSIGNED NOT NULL DEFAULT '0',
  `errors` int UNSIGNED NOT NULL DEFAULT '0',
  `best_score` int UNSIGNED NOT NULL DEFAULT '0',
  `first_completed_at` datetime DEFAULT NULL,
  `last_completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `cell_progress`
--

INSERT INTO `cell_progress` (`id`, `user_id`, `cell_id`, `stars`, `attempts`, `errors`, `best_score`, `first_completed_at`, `last_completed_at`, `created_at`, `updated_at`) VALUES
(6, 5, 1, 3, 1, 0, 100, '2026-09-28 02:00:43', '2026-09-28 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(7, 5, 2, 3, 1, 1, 90, '2026-09-29 02:00:43', '2026-09-29 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(8, 5, 3, 3, 1, 0, 100, '2026-10-01 02:00:43', '2026-10-01 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(9, 5, 4, 2, 1, 2, 75, '2026-10-03 02:00:43', '2026-10-03 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(10, 5, 5, 2, 1, 3, 70, '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `coin_ledger`
--

CREATE TABLE `coin_ledger` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `amount` bigint NOT NULL,
  `reason_id` bigint UNSIGNED NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `balance_after` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `coin_ledger`
--

INSERT INTO `coin_ledger` (`id`, `user_id`, `amount`, `reason_id`, `reference_type`, `reference_id`, `balance_after`, `created_at`) VALUES
(10, 5, 25, 1, 'cell', NULL, 25, '2026-09-28 02:00:43'),
(11, 5, 25, 1, 'cell', NULL, 50, '2026-09-29 02:00:43'),
(12, 5, 25, 1, 'cell', NULL, 75, '2026-10-01 02:00:43'),
(13, 5, 12, 1, 'cell', NULL, 87, '2026-10-03 02:00:43'),
(14, 5, 12, 1, 'cell', NULL, 99, '2026-10-04 02:00:43'),
(15, 5, 150, 2, 'goal', NULL, 249, '2026-10-04 02:00:43'),
(16, 5, 20, 3, 'task', NULL, 269, '2026-10-04 02:00:43'),
(17, 5, -200, 10, 'purchase', NULL, 69, '2026-10-04 02:00:43'),
(18, 5, -50, 8, 'vault', NULL, 19, '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `contents`
--

CREATE TABLE `contents` (
  `id` bigint UNSIGNED NOT NULL,
  `cell_id` bigint UNSIGNED NOT NULL,
  `version` smallint UNSIGNED NOT NULL DEFAULT '1',
  `body` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `contents`
--

INSERT INTO `contents` (`id`, `cell_id`, `version`, `body`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '{\"tipo\": \"quiz\", \"perguntas\": [{\"correta\": 0, \"enunciado\": \"O mel é a moeda do Beever. Para que ele serve?\", \"alternativas\": [\"Comprar coisas na loja\", \"Subir de nível\", \"Nada\"]}, {\"correta\": 0, \"enunciado\": \"De onde vem o mel?\", \"alternativas\": [\"De concluir atividades\", \"De pedir para o Beenie\", \"Ele aparece sozinho\"]}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 2, 1, '{\"tipo\": \"arraste\", \"cartas\": [{\"texto\": \"Mesada do mês\", \"categoria\": \"entra\"}, {\"texto\": \"Presente da vovó\", \"categoria\": \"entra\"}, {\"texto\": \"Comprar figurinhas\", \"categoria\": \"sai\"}, {\"texto\": \"Pagar o lanche\", \"categoria\": \"sai\"}], \"enunciado\": \"O dinheiro entrou ou saiu?\", \"categorias\": [{\"id\": \"entra\", \"nome\": \"Dinheiro que entra\"}, {\"id\": \"sai\", \"nome\": \"Dinheiro que sai\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 11, 1, '{\"tipo\": \"arraste\", \"cartas\": [{\"texto\": \"Mensalidade da escola\", \"categoria\": \"fixo\"}, {\"texto\": \"Aluguel da casa\", \"categoria\": \"fixo\"}, {\"texto\": \"Sorvete no fim de semana\", \"categoria\": \"variavel\"}, {\"texto\": \"Conta de luz\", \"categoria\": \"variavel\"}], \"enunciado\": \"Esse gasto é sempre igual ou muda de valor?\", \"categorias\": [{\"id\": \"fixo\", \"nome\": \"Gasto fixo\"}, {\"id\": \"variavel\", \"nome\": \"Gasto variável\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 21, 1, '{\"tipo\": \"arraste\", \"cartas\": [{\"texto\": \"Comprar um doce\", \"categoria\": \"gastar\"}, {\"texto\": \"Ingresso do cinema\", \"categoria\": \"gastar\"}, {\"texto\": \"Cofrinho embaixo da cama\", \"categoria\": \"guardar\"}, {\"texto\": \"Poupança que rende juros\", \"categoria\": \"render\"}, {\"texto\": \"Dinheiro investido no banco\", \"categoria\": \"render\"}], \"enunciado\": \"Para onde vai esse dinheiro?\", \"categorias\": [{\"id\": \"gastar\", \"nome\": \"Gastar agora\"}, {\"id\": \"guardar\", \"nome\": \"Guardar parado\"}, {\"id\": \"render\", \"nome\": \"Fazer render\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 4, 1, '{\"tipo\": \"orcamento\", \"passo\": 5, \"total\": 50, \"enunciado\": \"Você tem 50 de mel para a semana. Divida sem quebrar nenhuma regra.\", \"categorias\": [{\"id\": \"guardar\", \"dica\": \"Guarde pelo menos 20\", \"nome\": \"Guardar\", \"maximo\": 50, \"minimo\": 20}, {\"id\": \"lanche\", \"dica\": \"Entre 10 e 20\", \"nome\": \"Lanche\", \"maximo\": 20, \"minimo\": 10}, {\"id\": \"brinquedo\", \"dica\": \"No máximo 15\", \"nome\": \"Brinquedo\", \"maximo\": 15, \"minimo\": 0}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 8, 1, '{\"tipo\": \"orcamento\", \"passo\": 5, \"total\": 40, \"enunciado\": \"São 40 de mel para a semana inteira. Onde cada parte vai?\", \"categorias\": [{\"id\": \"guardar\", \"dica\": \"Guarde pelo menos 15\", \"nome\": \"Guardar\", \"maximo\": 40, \"minimo\": 15}, {\"id\": \"passeio\", \"dica\": \"Entre 5 e 15\", \"nome\": \"Passeio\", \"maximo\": 15, \"minimo\": 5}, {\"id\": \"presente\", \"dica\": \"No máximo 20\", \"nome\": \"Presente\", \"maximo\": 20, \"minimo\": 0}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(7, 12, 1, '{\"tipo\": \"orcamento\", \"passo\": 10, \"total\": 200, \"enunciado\": \"A casa recebeu 200 de mel no mês. Feche a conta sem furar nenhuma regra.\", \"categorias\": [{\"id\": \"contas\", \"dica\": \"Entre 80 e 120\", \"nome\": \"Contas da casa\", \"maximo\": 120, \"minimo\": 80}, {\"id\": \"comida\", \"dica\": \"Entre 40 e 80\", \"nome\": \"Comida\", \"maximo\": 80, \"minimo\": 40}, {\"id\": \"lazer\", \"dica\": \"No máximo 40\", \"nome\": \"Lazer\", \"maximo\": 40, \"minimo\": 0}, {\"id\": \"guardar\", \"dica\": \"Guarde pelo menos 20\", \"nome\": \"Guardar\", \"maximo\": 100, \"minimo\": 20}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(8, 13, 1, '{\"tipo\": \"orcamento\", \"passo\": 10, \"total\": 150, \"enunciado\": \"Entraram 150 de mel no mês. Quanto vai sobrar depende de você.\", \"categorias\": [{\"id\": \"fixos\", \"dica\": \"Entre 60 e 90\", \"nome\": \"Gastos fixos\", \"maximo\": 90, \"minimo\": 60}, {\"id\": \"variaveis\", \"dica\": \"Entre 20 e 50\", \"nome\": \"Gastos variáveis\", \"maximo\": 50, \"minimo\": 20}, {\"id\": \"guardar\", \"dica\": \"Guarde pelo menos 30\", \"nome\": \"Guardar\", \"maximo\": 80, \"minimo\": 30}, {\"id\": \"imprevisto\", \"dica\": \"Entre 10 e 30\", \"nome\": \"Imprevisto\", \"maximo\": 30, \"minimo\": 10}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(9, 24, 1, '{\"tipo\": \"orcamento\", \"passo\": 10, \"total\": 500, \"enunciado\": \"São 500 de mel para o ano. Decida o que fica de pé no fim dele.\", \"categorias\": [{\"id\": \"moradia\", \"dica\": \"Entre 150 e 250\", \"nome\": \"Moradia\", \"maximo\": 250, \"minimo\": 150}, {\"id\": \"estudo\", \"dica\": \"Entre 50 e 150\", \"nome\": \"Estudo\", \"maximo\": 150, \"minimo\": 50}, {\"id\": \"lazer\", \"dica\": \"No máximo 80\", \"nome\": \"Lazer\", \"maximo\": 80, \"minimo\": 0}, {\"id\": \"reserva\", \"dica\": \"Pelo menos 100\", \"nome\": \"Reserva de emergência\", \"maximo\": 200, \"minimo\": 100}, {\"id\": \"investimento\", \"dica\": \"Entre 50 e 150\", \"nome\": \"Investimento\", \"maximo\": 150, \"minimo\": 50}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(10, 6, 1, '{\"meta\": 60, \"tipo\": \"cofre\", \"ciclos\": 4, \"enunciado\": \"Entram 20 de mel por semana. Guarde o que puder: o que fica no cofre rende 10% toda semana.\", \"nomeDoCiclo\": \"semana\", \"taxaPorCiclo\": 10, \"minimoPorCiclo\": 5, \"entradaPorCiclo\": 20}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(11, 16, 1, '{\"meta\": 180, \"tipo\": \"cofre\", \"ciclos\": 5, \"enunciado\": \"Entram 50 de mel por mês, e o cofre rende 5% ao mês. Chegue a 180 em cinco meses.\", \"nomeDoCiclo\": \"mês\", \"taxaPorCiclo\": 5, \"minimoPorCiclo\": 10, \"entradaPorCiclo\": 50}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(12, 17, 1, '{\"meta\": 480, \"tipo\": \"cofre\", \"ciclos\": 6, \"enunciado\": \"Entram 100 de mel por mês, e o cofre rende 4% ao mês. Guardar cedo rende mais do que guardar tarde.\", \"nomeDoCiclo\": \"mês\", \"taxaPorCiclo\": 4, \"minimoPorCiclo\": 20, \"entradaPorCiclo\": 100}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(13, 23, 1, '{\"meta\": 400, \"tipo\": \"cofre\", \"ciclos\": 6, \"enunciado\": \"Entram 80 de mel por semana e o cofre rende 2% por semana, como o cofre de verdade. Monte a reserva.\", \"nomeDoCiclo\": \"semana\", \"taxaPorCiclo\": 2, \"minimoPorCiclo\": 20, \"entradaPorCiclo\": 80}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(14, 7, 1, '{\"tipo\": \"mercado\", \"rodadas\": [{\"opcoes\": [{\"preco\": 5, \"texto\": \"Saquinho com 10 balas\", \"quantidade\": 10}, {\"preco\": 12, \"texto\": \"Saquinho com 30 balas\", \"quantidade\": 30}], \"unidade\": \"bala\", \"enunciado\": \"Qual saquinho de bala vale mais a pena?\"}, {\"opcoes\": [{\"preco\": 6, \"texto\": \"Garrafa de 1 litro\", \"quantidade\": 1}, {\"preco\": 10, \"texto\": \"Garrafa de 2 litros\", \"quantidade\": 2}, {\"preco\": 4, \"texto\": \"Copinho de meio litro\", \"quantidade\": 0.5}], \"unidade\": \"litro\", \"enunciado\": \"E o suco?\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(15, 10, 1, '{\"tipo\": \"mercado\", \"rodadas\": [{\"opcoes\": [{\"preco\": 6, \"texto\": \"Pacote de 1 kg\", \"quantidade\": 1}, {\"preco\": 25, \"texto\": \"Pacote de 5 kg\", \"quantidade\": 5}], \"unidade\": \"kg\", \"enunciado\": \"Qual pacote de arroz custa menos por quilo?\"}, {\"opcoes\": [{\"preco\": 12, \"texto\": \"Caixa de 800 g em promoção\", \"quantidade\": 0.8}, {\"preco\": 28, \"texto\": \"Caixa de 2 kg\", \"quantidade\": 2}, {\"preco\": 8, \"texto\": \"Sachê de 500 g\", \"quantidade\": 0.5}], \"unidade\": \"kg\", \"enunciado\": \"E o sabão em pó?\"}, {\"opcoes\": [{\"preco\": 5, \"texto\": \"Caixa de 1 litro\", \"quantidade\": 1}, {\"preco\": 33, \"texto\": \"Fardo com 6 litros\", \"quantidade\": 6}], \"unidade\": \"litro\", \"enunciado\": \"O maior nem sempre é o mais barato. Qual leite vale mais a pena?\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(16, 19, 1, '{\"tipo\": \"mercado\", \"rodadas\": [{\"opcoes\": [{\"preco\": 240, \"texto\": \"À vista, 240 de uma vez\", \"quantidade\": 1}, {\"preco\": 280, \"texto\": \"10 parcelas de 28\", \"quantidade\": 1}, {\"preco\": 260, \"texto\": \"4 parcelas de 65\", \"quantidade\": 1}], \"unidade\": \"tênis\", \"enunciado\": \"O mesmo tênis, à vista ou parcelado. Qual sai mais barato no total?\"}, {\"opcoes\": [{\"preco\": 900, \"texto\": \"À vista, 900\", \"quantidade\": 1}, {\"preco\": 984, \"texto\": \"12 parcelas de 82\", \"quantidade\": 1}], \"unidade\": \"celular\", \"enunciado\": \"E o celular?\"}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(17, 3, 1, '{\"tipo\": \"ordene\", \"itens\": [{\"id\": \"comida\", \"ordem\": 1, \"texto\": \"Comida em casa\"}, {\"id\": \"escola\", \"ordem\": 2, \"texto\": \"Material da escola\"}, {\"id\": \"brinquedo\", \"ordem\": 3, \"texto\": \"Brinquedo novo\"}], \"enunciado\": \"O dinheiro está curto. O que você resolve primeiro?\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(18, 14, 1, '{\"tipo\": \"ordene\", \"itens\": [{\"id\": \"luz\", \"ordem\": 1, \"texto\": \"Conta de luz, que vence amanhã\"}, {\"id\": \"mercado\", \"ordem\": 2, \"texto\": \"Compra do mês\"}, {\"id\": \"guardar\", \"ordem\": 3, \"texto\": \"Guardar um pouco\"}, {\"id\": \"cinema\", \"ordem\": 4, \"texto\": \"Cinema no fim de semana\"}], \"enunciado\": \"Chegou o dinheiro do mês. Em que ordem você resolve cada coisa?\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(19, 20, 1, '{\"tipo\": \"ordene\", \"itens\": [{\"id\": \"divida\", \"ordem\": 1, \"texto\": \"Pagar a dívida que cobra juro\"}, {\"id\": \"reserva\", \"ordem\": 2, \"texto\": \"Montar a reserva de emergência\"}, {\"id\": \"investir\", \"ordem\": 3, \"texto\": \"Investir o que sobrar\"}, {\"id\": \"celular\", \"ordem\": 4, \"texto\": \"Trocar o celular que ainda funciona\"}], \"enunciado\": \"Sobrou dinheiro. O que rende mais no fim das contas?\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(20, 5, 1, '{\"tipo\": \"placeholder\", \"texto\": \"Conteúdo em produção.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(21, 9, 1, '{\"tipo\": \"placeholder\", \"texto\": \"Conteúdo em produção.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(22, 15, 1, '{\"tipo\": \"placeholder\", \"texto\": \"Conteúdo em produção.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(23, 18, 1, '{\"tipo\": \"placeholder\", \"texto\": \"Conteúdo em produção.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(24, 22, 1, '{\"tipo\": \"placeholder\", \"texto\": \"Conteúdo em produção.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(25, 25, 1, '{\"tipo\": \"listas-suspensas\", \"lacunas\": [{\"texto\": \"O mel serve para...\", \"opcoes\": [\"comprar coisas na loja\", \"subir de nível\", \"nada\"], \"correta\": 0}, {\"texto\": \"O que guardo no cofre...\", \"opcoes\": [\"desaparece\", \"rende a cada semana\", \"vira pólen\"], \"correta\": 1}], \"enunciado\": \"Complete a frase sobre o mel que você ganha jogando.\"}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(26, 26, 1, '{\"tipo\": \"quadrinho-interativo\", \"paineis\": [{\"texto\": \"É sábado, e você tem 20 de mel guardado.\"}, {\"texto\": \"Na loja tem um doce por 5 e um patinete por 20. O que você faz?\", \"correta\": 0, \"escolhas\": [\"Compro o doce e guardo o resto\", \"Gasto tudo no patinete\", \"Não compro nada hoje\"]}, {\"texto\": \"Na semana seguinte aparece um livro por 15. Você ainda tem mel?\", \"correta\": 0, \"escolhas\": [\"Sim, porque sobrou da vez passada\", \"Não, gastei tudo\"]}]}', 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `economic_cycles`
--

CREATE TABLE `economic_cycles` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `cycle_number` int UNSIGNED NOT NULL,
  `processed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `summary` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `economic_cycles`
--

INSERT INTO `economic_cycles` (`id`, `user_id`, `cycle_number`, `processed_at`, `summary`, `created_at`) VALUES
(2, 3, 1, '2026-09-20 14:54:02', '{\"custo\": 0, \"renda\": 0, \"numero\": 1, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-09-20 14:54:02'),
(4, 5, 1, '2026-10-03 02:00:43', '{\"renda\": 0, \"custos\": 0, \"depreciacao\": [{\"de\": 200, \"item\": \"patinete\", \"para\": 198}], \"valorizacao\": [], \"vendas_forcadas\": []}', '2026-10-04 02:00:43'),
(5, 4, 1, '2026-10-04 03:00:36', '{\"custo\": 0, \"renda\": 0, \"numero\": 1, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-04 03:00:36'),
(6, 4, 2, '2026-10-13 00:26:09', '{\"custo\": 0, \"renda\": 0, \"numero\": 2, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-13 00:26:09'),
(7, 4, 3, '2026-10-25 15:29:41', '{\"custo\": 0, \"renda\": 0, \"numero\": 3, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-25 15:29:41'),
(8, 4, 4, '2026-10-25 15:29:41', '{\"custo\": 0, \"renda\": 0, \"numero\": 4, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-25 15:29:41'),
(9, 3, 2, '2026-10-29 22:26:03', '{\"custo\": 0, \"renda\": 0, \"numero\": 2, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-29 22:26:03'),
(10, 3, 3, '2026-10-29 22:26:03', '{\"custo\": 0, \"renda\": 0, \"numero\": 3, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-29 22:26:03'),
(11, 3, 4, '2026-10-29 22:26:03', '{\"custo\": 0, \"renda\": 0, \"numero\": 4, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-29 22:26:03'),
(12, 3, 5, '2026-10-29 22:26:03', '{\"custo\": 0, \"renda\": 0, \"numero\": 5, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-29 22:26:03'),
(13, 3, 6, '2026-10-29 22:26:03', '{\"custo\": 0, \"renda\": 0, \"numero\": 6, \"vendidos\": [], \"depreciacao\": 0, \"metaDoCofre\": null, \"valorizacao\": 0, \"inadimplentes\": [], \"rendimentoDoCofre\": 0}', '2026-10-29 22:26:03');

-- --------------------------------------------------------

--
-- Estrutura para tabela `game_sessions`
--

CREATE TABLE `game_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `cell_id` bigint UNSIGNED NOT NULL,
  `content_id` bigint UNSIGNED DEFAULT NULL,
  `status_id` bigint UNSIGNED NOT NULL,
  `token` char(36) NOT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `duration_seconds` int UNSIGNED DEFAULT NULL,
  `errors` int UNSIGNED NOT NULL DEFAULT '0',
  `stars` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `xp_awarded` int UNSIGNED NOT NULL DEFAULT '0',
  `points_awarded` int UNSIGNED NOT NULL DEFAULT '0',
  `coins_awarded` bigint NOT NULL DEFAULT '0',
  `is_replay` tinyint(1) NOT NULL DEFAULT '0',
  `saved_state` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `game_sessions`
--

INSERT INTO `game_sessions` (`id`, `user_id`, `cell_id`, `content_id`, `status_id`, `token`, `started_at`, `finished_at`, `duration_seconds`, `errors`, `stars`, `xp_awarded`, `points_awarded`, `coins_awarded`, `is_replay`, `saved_state`, `created_at`, `updated_at`) VALUES
(6, 5, 1, NULL, 2, '6824924e-bf97-11f1-838f-62923bff912c', '2026-09-28 01:56:43', '2026-09-28 02:00:43', 240, 0, 3, 35, 20, 25, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(7, 5, 2, NULL, 2, '68249673-bf97-11f1-838f-62923bff912c', '2026-09-29 01:56:43', '2026-09-29 02:00:43', 240, 1, 3, 35, 20, 25, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(8, 5, 3, NULL, 2, '68249802-bf97-11f1-838f-62923bff912c', '2026-10-01 01:56:43', '2026-10-01 02:00:43', 240, 0, 3, 35, 20, 25, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(9, 5, 4, NULL, 2, '68249918-bf97-11f1-838f-62923bff912c', '2026-10-03 01:56:43', '2026-10-03 02:00:43', 240, 2, 2, 20, 10, 12, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(10, 5, 5, NULL, 2, '68249a27-bf97-11f1-838f-62923bff912c', '2026-10-04 01:56:43', '2026-10-04 02:00:43', 240, 3, 2, 20, 10, 12, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(13, 4, 1, 1, 1, 'af58d531-6c95-4905-bd43-15a2d55d76c7', '2026-10-04 02:36:21', NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, '2026-10-04 02:36:21', '2026-10-04 02:36:21'),
(14, 3, 1, 1, 1, '087b0d33-2112-4b54-a54e-43a25dcfee53', '2026-10-29 22:26:22', NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, '2026-10-29 22:26:22', '2026-10-29 22:26:22');

-- --------------------------------------------------------

--
-- Estrutura para tabela `game_session_statuses`
--

CREATE TABLE `game_session_statuses` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `game_session_statuses`
--

INSERT INTO `game_session_statuses` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'aberta', 'Aberta', '2026-09-17 23:43:40'),
(2, 'concluida', 'Concluída', '2026-09-17 23:43:40'),
(3, 'abandonada', 'Abandonada', '2026-09-17 23:43:40'),
(4, 'expirada', 'Expirada', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `game_types`
--

CREATE TABLE `game_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `game_types`
--

INSERT INTO `game_types` (`id`, `slug`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'quiz-do-favo', 'Quiz do Favo', 'Perguntas de múltipla escolha sobre o conteúdo da célula', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'arraste-e-classifique', 'Arraste e Classifique', 'Separa itens em categorias, com alternativa por clique e teclado', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'monte-o-orcamento', 'Monte o Orçamento', 'Distribui uma quantia entre necessidades e desejos', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(4, 'cofre-do-tempo', 'Cofre do Tempo', 'Simula juros compostos ao longo de ciclos', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(5, 'mercado-esperto', 'Mercado Esperto', 'Compara preços e decide a melhor compra', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(6, 'ordene-a-prioridade', 'Ordene a Prioridade', 'Coloca gastos em ordem de importância', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(7, 'listas-suspensas', 'Listas Suspensas', 'Completa a frase escolhendo em cada lacuna', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(8, 'quadrinho-interativo', 'Quadrinho Interativo', 'História em painéis, com escolhas no meio do caminho', 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goals`
--

CREATE TABLE `goals` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `goal_type_id` bigint UNSIGNED NOT NULL,
  `status_id` bigint UNSIGNED NOT NULL,
  `difficulty_id` bigint UNSIGNED NOT NULL,
  `title` varchar(160) NOT NULL,
  `target_value` bigint NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `reward_points` int UNSIGNED NOT NULL DEFAULT '0',
  `starts_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `renewed_from_goal_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `goals`
--

INSERT INTO `goals` (`id`, `user_id`, `goal_type_id`, `status_id`, `difficulty_id`, `title`, `target_value`, `current_value`, `reward_coins`, `reward_points`, `starts_at`, `due_at`, `completed_at`, `renewed_from_goal_id`, `created_at`, `updated_at`) VALUES
(4, 3, 7, 3, 2, 'Chegue ao nível 6', 6, 5, 150, 90, '2026-09-17 23:53:34', '2026-10-01 23:53:35', NULL, NULL, '2026-09-17 23:53:34', '2026-10-29 22:26:03'),
(5, 3, 3, 3, 2, 'Chegue a 1 favos concluídos', 1, 0, 150, 90, '2026-09-17 23:53:34', '2026-10-01 23:53:35', NULL, NULL, '2026-09-17 23:53:34', '2026-10-29 22:26:03'),
(6, 5, 4, 2, 2, 'Conclua 3 células', 3, 3, 150, 0, '2026-09-24 02:00:43', '2026-10-08 02:00:43', '2026-10-04 02:00:43', NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(7, 5, 1, 1, 2, 'Junte 300 de mel', 300, 19, 200, 0, '2026-10-02 02:00:43', '2026-10-16 02:00:43', NULL, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(8, 3, 4, 1, 2, 'Chegue a 6 células concluídas', 6, 0, 150, 90, '2026-10-29 22:26:03', '2026-11-12 22:26:03', NULL, NULL, '2026-10-29 22:26:03', '2026-10-29 22:26:03'),
(9, 3, 1, 1, 2, 'Chegue a 150 de mel', 150, 0, 150, 90, '2026-10-29 22:26:03', '2026-11-12 22:26:03', NULL, NULL, '2026-10-29 22:26:03', '2026-10-29 22:26:03');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goal_difficulties`
--

CREATE TABLE `goal_difficulties` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `reward_multiplier` decimal(6,3) NOT NULL DEFAULT '1.000',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `reward_points` int UNSIGNED NOT NULL DEFAULT '0',
  `default_days` smallint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `goal_difficulties`
--

INSERT INTO `goal_difficulties` (`id`, `slug`, `name`, `reward_multiplier`, `reward_coins`, `reward_points`, `default_days`, `created_at`, `updated_at`) VALUES
(1, 'alta', 'Alta', 2.000, 200, 120, 28, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'media', 'Média', 1.500, 150, 90, 14, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'simples', 'Simples', 1.000, 100, 60, 7, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goal_plan_rules`
--

CREATE TABLE `goal_plan_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `min_weekdays` tinyint UNSIGNED NOT NULL,
  `max_weekdays` tinyint UNSIGNED NOT NULL,
  `active_goals` tinyint UNSIGNED NOT NULL,
  `difficulty_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `goal_plan_rules`
--

INSERT INTO `goal_plan_rules` (`id`, `min_weekdays`, `max_weekdays`, `active_goals`, `difficulty_id`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 1, 1, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 3, 4, 2, 2, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 5, 7, 3, 3, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goal_statuses`
--

CREATE TABLE `goal_statuses` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `goal_statuses`
--

INSERT INTO `goal_statuses` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'ativa', 'Ativa', '2026-09-17 23:43:40'),
(2, 'concluida', 'Concluída', '2026-09-17 23:43:40'),
(3, 'expirada', 'Expirada', '2026-09-17 23:43:40'),
(4, 'renovada', 'Renovada', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goal_target_rules`
--

CREATE TABLE `goal_target_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `goal_type_id` bigint UNSIGNED NOT NULL,
  `base_per_session` decimal(10,3) NOT NULL,
  `min_increment` bigint NOT NULL,
  `max_increment` bigint NOT NULL,
  `rounding_step` bigint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `goal_target_rules`
--

INSERT INTO `goal_target_rules` (`id`, `goal_type_id`, `base_per_session`, `min_increment`, `max_increment`, `rounding_step`, `created_at`, `updated_at`) VALUES
(1, 1, 25.000, 50, 500, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 7, 0.100, 1, 1, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 4, 1.000, 2, 12, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 3, 0.100, 1, 1, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 5, 0.250, 2, 3, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `goal_types`
--

CREATE TABLE `goal_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `progress_source` varchar(60) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `goal_types`
--

INSERT INTO `goal_types` (`id`, `slug`, `name`, `progress_source`, `created_at`, `updated_at`) VALUES
(1, 'acumular-mel', 'Acumular mel', 'coin_balance', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'alcancar-patrimonio', 'Alcançar patrimônio', 'patrimony_total', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'concluir-favo', 'Concluir um favo', 'hive_completed', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(4, 'concluir-celulas', 'Concluir células', 'cell_completed', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(5, 'manter-sequencia', 'Manter sequência', 'streak_days', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(6, 'guardar-no-cofre', 'Guardar no cofre', 'vault_balance', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(7, 'atingir-nivel', 'Atingir nível', 'user_level', '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `guardian_consents`
--

CREATE TABLE `guardian_consents` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `guardian_email` varchar(190) NOT NULL,
  `consented_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_hash` char(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `guardian_consents`
--

INSERT INTO `guardian_consents` (`id`, `user_id`, `guardian_email`, `consented_at`, `ip_hash`, `created_at`) VALUES
(2, 5, 'responsavel@beever.dev', '2026-10-04 02:00:43', NULL, '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `hives`
--

CREATE TABLE `hives` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `title` varchar(120) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `order_index` smallint UNSIGNED NOT NULL,
  `age_band_id` bigint UNSIGNED NOT NULL,
  `unlock_percent` tinyint UNSIGNED NOT NULL DEFAULT '80',
  `required_patrimony` bigint NOT NULL DEFAULT '0',
  `required_item_id` bigint UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `hives`
--

INSERT INTO `hives` (`id`, `slug`, `title`, `description`, `order_index`, `age_band_id`, `unlock_percent`, `required_patrimony`, `required_item_id`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 'primeiros-passos', 'Primeiros passos', 'De onde vem o dinheiro e para onde ele vai.', 1, 1, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'guardar-e-gastar', 'Guardar e gastar', 'A diferença entre o que você precisa e o que você quer.', 2, 1, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'dinheiro-no-dia-a-dia', 'Dinheiro no dia a dia', 'Trocos, preços e escolhas de todo dia.', 1, 2, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 'planejar-o-mes', 'Planejar o mês', 'Combinar o que entra com o que sai, sem susto no fim.', 2, 2, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 'o-tempo-e-o-juro', 'O tempo e o juro', 'Por que esperar pode valer dinheiro — e por que dever custa caro.', 1, 3, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 'construir-patrimonio', 'Construir patrimônio', 'A diferença entre gastar, guardar e fazer render.', 2, 3, 80, 0, NULL, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `hive_progress`
--

CREATE TABLE `hive_progress` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `hive_id` bigint UNSIGNED NOT NULL,
  `completed_cells` smallint UNSIGNED NOT NULL DEFAULT '0',
  `total_cells` smallint UNSIGNED NOT NULL DEFAULT '0',
  `percent` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `hive_progress`
--

INSERT INTO `hive_progress` (`id`, `user_id`, `hive_id`, `completed_cells`, `total_cells`, `percent`, `completed_at`, `created_at`, `updated_at`) VALUES
(7, 5, 1, 4, 4, 100, '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(8, 5, 2, 1, 4, 25, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(9, 5, 3, 0, 6, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(10, 5, 4, 0, 4, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(11, 5, 5, 0, 4, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(12, 5, 6, 0, 4, 0, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `idempotency_keys`
--

CREATE TABLE `idempotency_keys` (
  `id` bigint UNSIGNED NOT NULL,
  `idempotency_key` varchar(190) NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `operation` varchar(80) NOT NULL,
  `response_hash` char(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `initial_goals`
--

CREATE TABLE `initial_goals` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `label` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `initial_goals`
--

INSERT INTO `initial_goals` (`id`, `slug`, `label`, `created_at`, `updated_at`) VALUES
(1, 'comprar-algo', 'Quero comprar algo', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'aprender-a-guardar', 'Quero aprender a guardar', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'entender-juros', 'Quero entender juros', '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `inventory`
--

CREATE TABLE `inventory` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `purchase_id` bigint UNSIGNED DEFAULT NULL,
  `status_id` bigint UNSIGNED NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `overdue_cycles` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `is_equipped` tinyint(1) NOT NULL DEFAULT '0',
  `acquired_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sold_at` datetime DEFAULT NULL,
  `sold_value` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `inventory`
--

INSERT INTO `inventory` (`id`, `user_id`, `item_id`, `purchase_id`, `status_id`, `current_value`, `overdue_cycles`, `is_equipped`, `acquired_at`, `sold_at`, `sold_value`, `created_at`, `updated_at`) VALUES
(2, 5, 7, 2, 1, 198, 0, 0, '2026-09-27 02:00:43', NULL, NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `inventory_statuses`
--

CREATE TABLE `inventory_statuses` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `inventory_statuses`
--

INSERT INTO `inventory_statuses` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'ativo', 'Ativo', '2026-09-17 23:43:41'),
(2, 'inadimplente', 'Inadimplente', '2026-09-17 23:43:41'),
(3, 'vendido', 'Vendido', '2026-09-17 23:43:41'),
(4, 'consumido', 'Consumido', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `items`
--

CREATE TABLE `items` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description_kid` varchar(500) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `price` bigint NOT NULL,
  `counts_in_patrimony` tinyint(1) NOT NULL DEFAULT '1',
  `valuation_rate` decimal(6,3) NOT NULL DEFAULT '0.000',
  `valuation_floor_pct` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `valuation_cap_pct` smallint UNSIGNED NOT NULL DEFAULT '100',
  `upkeep_cost` bigint NOT NULL DEFAULT '0',
  `income_per_cycle` bigint NOT NULL DEFAULT '0',
  `upgrade_of_item_id` bigint UNSIGNED DEFAULT NULL,
  `is_consumable` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `items`
--

INSERT INTO `items` (`id`, `slug`, `name`, `description_kid`, `image_path`, `category_id`, `price`, `counts_in_patrimony`, `valuation_rate`, `valuation_floor_pct`, `valuation_cap_pct`, `upkeep_cost`, `income_per_cycle`, `upgrade_of_item_id`, `is_consumable`, `is_active`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 'cantinho-na-colmeia', 'Cantinho na colmeia', 'Seu primeiro espaço só seu. Ganha um pouquinho de valor toda semana.', NULL, 1, 300, 1, 0.500, 100, 200, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'quarto-proprio', 'Quarto próprio', 'Mais espaço para você. Vale mais com o tempo, mas tem contas para pagar.', NULL, 1, 900, 1, 0.700, 100, 200, 10, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'casa-pequena', 'Casa pequena', 'Uma casa de verdade. Valoriza sempre, e custa para manter.', NULL, 1, 2500, 1, 1.000, 100, 200, 30, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 'casa-media', 'Casa média', 'Maior que a pequena, com contas maiores também.', NULL, 1, 6000, 1, 1.000, 100, 200, 60, 0, 3, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 'casa-grande', 'Casa grande', 'A maior da colmeia. Valoriza rápido, mas as contas pesam.', NULL, 1, 15000, 1, 1.200, 100, 200, 120, 0, 4, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 'terreno', 'Terreno', 'Um pedaço de terra. Não tem conta para pagar e valoriza bem.', NULL, 1, 4000, 1, 1.500, 100, 200, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(7, 'patinete', 'Patinete', 'Rápido e barato. Perde um pouco de valor toda semana.', NULL, 2, 200, 1, -1.000, 50, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(8, 'bicicleta', 'Bicicleta', 'Boa para todo dia. Perde valor e pede manutenção.', NULL, 2, 500, 1, -1.000, 30, 100, 5, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(9, 'skate-eletrico', 'Skate elétrico', 'Divertido, mas perde valor rápido e gasta bateria.', NULL, 2, 1200, 1, -2.000, 30, 100, 15, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(10, 'moto', 'Moto', 'Chega mais longe. Também perde valor e custa todo ciclo.', NULL, 2, 3500, 1, -2.000, 30, 100, 40, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(11, 'carro-popular', 'Carro popular', 'Confortável, mas é o campeão de custo: perde valor e cobra caro.', NULL, 2, 8000, 1, -2.500, 40, 100, 90, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(12, 'carro-esportivo', 'Carro esportivo', 'O mais rápido e o mais caro de manter. Pense bem antes.', NULL, 2, 20000, 1, -3.000, 30, 100, 200, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(13, 'garagem', 'Garagem', 'Lugar para guardar o que tem rodas. Valoriza junto com a casa.', NULL, 2, 1000, 1, 0.300, 100, 200, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(14, 'fone-de-ouvido', 'Fone de ouvido', 'Som só para você. Perde valor rapidinho.', NULL, 3, 150, 1, -2.000, 30, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(15, 'celular', 'Celular', 'O que mais perde valor na loja. Ano que vem já vale bem menos.', NULL, 3, 1500, 1, -4.000, 20, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(16, 'tablet', 'Tablet', 'Tela grande para estudar e jogar. Perde valor rápido.', NULL, 3, 2000, 1, -3.500, 30, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(17, 'videogame', 'Videogame', 'Diversão garantida, com assinatura para pagar todo ciclo.', NULL, 3, 2800, 1, -3.000, 30, 100, 20, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(18, 'notebook', 'Notebook', 'Serve para tudo. Ainda assim perde valor com o tempo.', NULL, 3, 4500, 1, -3.000, 30, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(19, 'barraquinha-de-limonada', 'Barraquinha de limonada', 'Seu primeiro negócio: trabalha por você e traz mel toda semana.', NULL, 4, 800, 1, 0.000, 100, 100, 0, 40, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(20, 'caixa-de-abelhas', 'Caixa de abelhas', 'Produz mel de verdade. Rende bem e pede um cuidado por ciclo.', NULL, 4, 2000, 1, 0.000, 100, 100, 20, 120, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(21, 'loja-de-mel', 'Loja de mel', 'O maior negócio da colmeia. Renda alta, custo alto.', NULL, 4, 6500, 1, 0.000, 100, 100, 80, 450, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(22, 'horta-comunitaria', 'Horta comunitária', 'Planta hoje, colhe todo ciclo. Precisa de terreno.', NULL, 4, 3000, 1, 0.000, 100, 100, 40, 200, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(23, 'cofrinho-reforcado', 'Cofrinho reforçado', 'Deixa o seu cofre render 1 ponto percentual a mais por ciclo.', NULL, 4, 1200, 1, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(24, 'oculos-escuros', 'Óculos escuros', 'Estilo para o seu Beenie. Não muda seu patrimônio.', NULL, 5, 150, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(25, 'chapeu-de-explorador', 'Chapéu de explorador', 'Para encarar qualquer favo. Enfeite, não investimento.', NULL, 5, 200, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(26, 'antenas-coloridas', 'Antenas coloridas', 'Antenas de todas as cores. Só beleza.', NULL, 5, 250, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(27, 'moldura-de-avatar', 'Moldura de avatar', 'Uma borda especial na sua foto.', NULL, 5, 300, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(28, 'emote-de-comemoracao', 'Emote de comemoração', 'Comemore cada célula concluída com estilo.', NULL, 5, 350, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(29, 'capa-de-heroi', 'Capa de herói', 'Uma capa que voa junto com você.', NULL, 5, 400, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(30, 'tema-da-colmeia', 'Tema da colmeia', 'Muda o visual do app entre dia, noite e floresta.', NULL, 5, 500, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(31, 'trilha-sonora-alternativa', 'Trilha sonora alternativa', 'Outra música para acompanhar seus jogos.', NULL, 5, 600, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(32, 'asas-brilhantes', 'Asas brilhantes', 'Asas que brilham quando você sobe de nível.', NULL, 5, 900, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(33, 'skin-dourada', 'Skin dourada do mascote', 'O Beenie todo dourado. O cosmético mais raro.', NULL, 5, 1200, 0, 0.000, 100, 100, 0, 0, NULL, 0, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(34, 'dica-extra', 'Dica Extra', 'Elimina uma alternativa errada no quiz. Vale uma vez.', NULL, 6, 100, 0, 0.000, 100, 100, 0, 0, NULL, 1, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(35, 'passe-de-revisao', 'Passe de Revisão', 'Repete uma célula com o mel valendo de novo. Vale uma vez.', NULL, 6, 250, 0, 0.000, 100, 100, 0, 0, NULL, 1, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(36, 'escudo-de-sequencia', 'Escudo de Sequência', 'Protege um dia marcado que você perdeu. Guarde até dois.', NULL, 6, 400, 0, 0.000, 100, 100, 0, 0, NULL, 1, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(37, 'mel-dobrado', 'Mel Dobrado (24 h)', 'Ganhe o dobro de mel por um dia inteiro.', NULL, 6, 500, 0, 0.000, 100, 100, 0, 0, NULL, 1, 1, NULL, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `item_behaviors`
--

CREATE TABLE `item_behaviors` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `item_behaviors`
--

INSERT INTO `item_behaviors` (`id`, `slug`, `name`, `description`, `created_at`) VALUES
(1, 'neutro', 'Neutro', 'Não muda de valor nem gera custo', '2026-09-17 23:43:41'),
(2, 'valoriza', 'Valoriza', 'Ganha valor a cada ciclo', '2026-09-17 23:43:41'),
(3, 'deprecia', 'Deprecia', 'Perde valor a cada ciclo, respeitando um piso', '2026-09-17 23:43:41'),
(4, 'custo_fixo', 'Custo fixo', 'Cobra mel do saldo a cada ciclo', '2026-09-17 23:43:41'),
(5, 'gera_renda', 'Gera renda', 'Credita mel no saldo a cada ciclo', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `item_behaviors_map`
--

CREATE TABLE `item_behaviors_map` (
  `item_id` bigint UNSIGNED NOT NULL,
  `behavior_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `item_behaviors_map`
--

INSERT INTO `item_behaviors_map` (`item_id`, `behavior_id`, `created_at`) VALUES
(1, 2, '2026-10-04 02:00:43'),
(2, 2, '2026-10-04 02:00:43'),
(2, 4, '2026-10-04 02:00:43'),
(3, 2, '2026-10-04 02:00:43'),
(3, 4, '2026-10-04 02:00:43'),
(4, 2, '2026-10-04 02:00:43'),
(4, 4, '2026-10-04 02:00:43'),
(5, 2, '2026-10-04 02:00:43'),
(5, 4, '2026-10-04 02:00:43'),
(6, 2, '2026-10-04 02:00:43'),
(7, 3, '2026-10-04 02:00:43'),
(8, 3, '2026-10-04 02:00:43'),
(8, 4, '2026-10-04 02:00:43'),
(9, 3, '2026-10-04 02:00:43'),
(9, 4, '2026-10-04 02:00:43'),
(10, 3, '2026-10-04 02:00:43'),
(10, 4, '2026-10-04 02:00:43'),
(11, 3, '2026-10-04 02:00:43'),
(11, 4, '2026-10-04 02:00:43'),
(12, 3, '2026-10-04 02:00:43'),
(12, 4, '2026-10-04 02:00:43'),
(13, 2, '2026-10-04 02:00:43'),
(14, 3, '2026-10-04 02:00:43'),
(15, 3, '2026-10-04 02:00:43'),
(16, 3, '2026-10-04 02:00:43'),
(17, 3, '2026-10-04 02:00:43'),
(17, 4, '2026-10-04 02:00:43'),
(18, 3, '2026-10-04 02:00:43'),
(19, 5, '2026-10-04 02:00:43'),
(20, 4, '2026-10-04 02:00:43'),
(20, 5, '2026-10-04 02:00:43'),
(21, 4, '2026-10-04 02:00:43'),
(21, 5, '2026-10-04 02:00:43'),
(22, 4, '2026-10-04 02:00:43'),
(22, 5, '2026-10-04 02:00:43'),
(23, 1, '2026-10-04 02:00:43'),
(24, 1, '2026-10-04 02:00:43'),
(25, 1, '2026-10-04 02:00:43'),
(26, 1, '2026-10-04 02:00:43'),
(27, 1, '2026-10-04 02:00:43'),
(28, 1, '2026-10-04 02:00:43'),
(29, 1, '2026-10-04 02:00:43'),
(30, 1, '2026-10-04 02:00:43'),
(31, 1, '2026-10-04 02:00:43'),
(32, 1, '2026-10-04 02:00:43'),
(33, 1, '2026-10-04 02:00:43'),
(34, 1, '2026-10-04 02:00:43'),
(35, 1, '2026-10-04 02:00:43'),
(36, 1, '2026-10-04 02:00:43'),
(37, 1, '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `item_categories`
--

CREATE TABLE `item_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `item_categories`
--

INSERT INTO `item_categories` (`id`, `slug`, `name`, `created_at`, `updated_at`) VALUES
(1, 'moradia', 'Moradia', '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'transporte', 'Transporte', '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'tecnologia', 'Tecnologia', '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 'negocios', 'Negócios', '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 'cosmeticos', 'Cosméticos', '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 'utilitarios', 'Utilitários', '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `item_requirements`
--

CREATE TABLE `item_requirements` (
  `id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `requirement_type_id` bigint UNSIGNED NOT NULL,
  `required_level` smallint UNSIGNED DEFAULT NULL,
  `required_hive_id` bigint UNSIGNED DEFAULT NULL,
  `required_item_id` bigint UNSIGNED DEFAULT NULL,
  `required_patrimony` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `item_requirements`
--

INSERT INTO `item_requirements` (`id`, `item_id`, `requirement_type_id`, `required_level`, `required_hive_id`, `required_item_id`, `required_patrimony`, `created_at`) VALUES
(23, 3, 1, 5, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(24, 6, 1, 8, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(25, 9, 1, 4, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(26, 10, 1, 6, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(27, 11, 1, 8, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(28, 12, 1, 12, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(29, 19, 1, 3, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(30, 20, 1, 5, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(31, 23, 1, 4, NULL, NULL, NULL, '2026-10-04 02:00:43'),
(38, 2, 3, NULL, NULL, 1, NULL, '2026-10-04 02:00:43'),
(39, 4, 3, NULL, NULL, 3, NULL, '2026-10-04 02:00:43'),
(40, 5, 3, NULL, NULL, 4, NULL, '2026-10-04 02:00:43'),
(41, 13, 3, NULL, NULL, 3, NULL, '2026-10-04 02:00:43'),
(42, 11, 3, NULL, NULL, 13, NULL, '2026-10-04 02:00:43'),
(43, 21, 3, NULL, NULL, 20, NULL, '2026-10-04 02:00:43'),
(44, 22, 3, NULL, NULL, 6, NULL, '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `item_requirement_types`
--

CREATE TABLE `item_requirement_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `item_requirement_types`
--

INSERT INTO `item_requirement_types` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'nivel-minimo', 'Nível mínimo', '2026-09-17 23:43:41'),
(2, 'favo-concluido', 'Favo concluído', '2026-09-17 23:43:41'),
(3, 'item-prerequisito', 'Item pré-requisito', '2026-09-17 23:43:41'),
(4, 'patrimonio-minimo', 'Patrimônio mínimo', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `leagues`
--

CREATE TABLE `leagues` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `league_members`
--

CREATE TABLE `league_members` (
  `id` bigint UNSIGNED NOT NULL,
  `league_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `points` int UNSIGNED NOT NULL DEFAULT '0',
  `final_rank` smallint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `league_prizes`
--

CREATE TABLE `league_prizes` (
  `final_rank` smallint UNSIGNED NOT NULL,
  `reward_coins` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `league_prizes`
--

INSERT INTO `league_prizes` (`final_rank`, `reward_coins`, `created_at`, `updated_at`) VALUES
(1, 300, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 200, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 100, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `levels`
--

CREATE TABLE `levels` (
  `id` bigint UNSIGNED NOT NULL,
  `level` smallint UNSIGNED NOT NULL,
  `required_xp` int UNSIGNED NOT NULL,
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `levels`
--

INSERT INTO `levels` (`id`, `level`, `required_xp`, `reward_coins`, `created_at`, `updated_at`) VALUES
(1, 1, 0, 0, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 2, 280, 50, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 3, 520, 75, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(4, 4, 800, 100, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(5, 5, 1120, 125, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(6, 6, 1470, 150, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(7, 7, 1850, 175, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(8, 8, 2260, 200, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(9, 9, 2700, 225, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(10, 10, 3160, 250, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(11, 11, 3650, 275, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(12, 12, 4160, 300, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(13, 13, 4690, 325, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(14, 14, 5240, 350, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(15, 15, 5810, 375, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(16, 16, 6400, 400, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(17, 17, 7010, 425, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(18, 18, 7640, 450, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(19, 19, 8280, 475, '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(20, 20, 8940, 500, '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `patrimony_snapshots`
--

CREATE TABLE `patrimony_snapshots` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `snapshot_date` date NOT NULL,
  `wallet_coins` bigint NOT NULL DEFAULT '0',
  `vault_balance` bigint NOT NULL DEFAULT '0',
  `items_value` bigint NOT NULL DEFAULT '0',
  `total_value` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `patrimony_snapshots`
--

INSERT INTO `patrimony_snapshots` (`id`, `user_id`, `snapshot_date`, `wallet_coins`, `vault_balance`, `items_value`, `total_value`, `created_at`) VALUES
(1, 3, '2026-09-17', 0, 0, 0, 0, '2026-09-17 23:53:35'),
(3, 3, '2026-09-19', 0, 0, 0, 0, '2026-09-19 20:43:31'),
(5, 3, '2026-09-20', 0, 0, 0, 0, '2026-09-20 14:54:02'),
(9, 3, '2026-09-21', 0, 0, 0, 0, '2026-09-21 18:07:32'),
(10, 4, '2026-10-03', 0, 0, 0, 0, '2026-10-04 02:01:38'),
(12, 4, '2026-10-04', 0, 0, 0, 0, '2026-10-04 03:00:35'),
(13, 4, '2026-10-07', 0, 0, 0, 0, '2026-10-07 22:20:05'),
(15, 4, '2026-10-08', 0, 0, 0, 0, '2026-10-08 18:15:22'),
(17, 4, '2026-10-12', 0, 0, 0, 0, '2026-10-13 00:26:09'),
(18, 4, '2026-10-25', 0, 0, 0, 0, '2026-10-25 15:29:41'),
(19, 4, '2026-10-26', 0, 0, 0, 0, '2026-10-26 16:37:59'),
(20, 4, '2026-10-28', 0, 0, 0, 0, '2026-10-28 16:24:44'),
(22, 4, '2026-10-29', 0, 0, 0, 0, '2026-10-29 21:12:40'),
(24, 3, '2026-10-29', 0, 0, 0, 0, '2026-10-29 22:26:03'),
(25, 4, '2026-10-30', 0, 0, 0, 0, '2026-10-30 13:10:57'),
(27, 3, '2026-10-30', 0, 0, 0, 0, '2026-10-30 13:13:35');

-- --------------------------------------------------------

--
-- Estrutura para tabela `point_ledger`
--

CREATE TABLE `point_ledger` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `amount` int NOT NULL,
  `reason_id` bigint UNSIGNED NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `balance_after` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `point_ledger`
--

INSERT INTO `point_ledger` (`id`, `user_id`, `amount`, `reason_id`, `reference_type`, `reference_id`, `balance_after`, `created_at`) VALUES
(7, 5, 20, 1, 'cell', NULL, 20, '2026-09-28 02:00:43'),
(8, 5, 20, 1, 'cell', NULL, 40, '2026-09-29 02:00:43'),
(9, 5, 20, 1, 'cell', NULL, 60, '2026-10-01 02:00:43'),
(10, 5, 10, 1, 'cell', NULL, 70, '2026-10-03 02:00:43'),
(11, 5, 10, 1, 'cell', NULL, 80, '2026-10-04 02:00:43'),
(12, 5, 15, 3, 'task', NULL, 95, '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `profiles`
--

CREATE TABLE `profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `age_band_id` bigint UNSIGNED DEFAULT NULL,
  `avatar_id` bigint UNSIGNED DEFAULT NULL,
  `initial_goal_id` bigint UNSIGNED DEFAULT NULL,
  `onboarding_step` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  `session_minutes` tinyint UNSIGNED NOT NULL DEFAULT '10',
  `is_sound_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `has_reduced_motion` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `profiles`
--

INSERT INTO `profiles` (`id`, `user_id`, `age_band_id`, `avatar_id`, `initial_goal_id`, `onboarding_step`, `timezone`, `session_minutes`, `is_sound_enabled`, `has_reduced_motion`, `created_at`, `updated_at`) VALUES
(3, 3, 3, 4, 2, 7, 'America/Sao_Paulo', 10, 1, 0, '2026-09-17 23:44:25', '2026-09-17 23:53:34'),
(4, 4, 3, 1, 3, 0, 'America/Sao_Paulo', 20, 1, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(5, 5, 1, 4, 1, 0, 'America/Sao_Paulo', 10, 1, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(6, 6, 3, NULL, NULL, 0, 'America/Sao_Paulo', 10, 1, 0, '2026-10-30 13:34:33', '2026-10-30 13:34:33');

-- --------------------------------------------------------

--
-- Estrutura para tabela `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `item_id` bigint UNSIGNED NOT NULL,
  `quantity` int UNSIGNED NOT NULL DEFAULT '1',
  `price_at_purchase` bigint NOT NULL,
  `discount_applied` bigint NOT NULL DEFAULT '0',
  `total_price` bigint NOT NULL,
  `purchased_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `purchases`
--

INSERT INTO `purchases` (`id`, `user_id`, `item_id`, `quantity`, `price_at_purchase`, `discount_applied`, `total_price`, `purchased_at`, `created_at`) VALUES
(2, 5, 7, 1, 200, 0, 200, '2026-09-27 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `reward_configs`
--

CREATE TABLE `reward_configs` (
  `id` bigint UNSIGNED NOT NULL,
  `game_type_id` bigint UNSIGNED NOT NULL,
  `age_band_id` bigint UNSIGNED NOT NULL,
  `stars` tinyint UNSIGNED NOT NULL,
  `xp_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `points_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `coins_amount` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `reward_configs`
--

INSERT INTO `reward_configs` (`id`, `game_type_id`, `age_band_id`, `stars`, `xp_amount`, `points_amount`, `coins_amount`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 2, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 2, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 2, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(5, 2, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(6, 2, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(7, 2, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(8, 2, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(9, 2, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(10, 4, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(11, 4, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(12, 4, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(13, 4, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(14, 4, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(15, 4, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(16, 4, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(17, 4, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(18, 4, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(19, 7, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(20, 7, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(21, 7, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(22, 7, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(23, 7, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(24, 7, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(25, 7, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(26, 7, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(27, 7, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(28, 5, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(29, 5, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(30, 5, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(31, 5, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(32, 5, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(33, 5, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(34, 5, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(35, 5, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(36, 5, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(37, 3, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(38, 3, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(39, 3, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(40, 3, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(41, 3, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(42, 3, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(43, 3, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(44, 3, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(45, 3, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(46, 6, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(47, 6, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(48, 6, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(49, 6, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(50, 6, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(51, 6, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(52, 6, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(53, 6, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(54, 6, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(55, 8, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(56, 8, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(57, 8, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(58, 8, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(59, 8, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(60, 8, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(61, 8, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(62, 8, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(63, 8, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(64, 1, 1, 3, 35, 20, 25, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(65, 1, 2, 3, 42, 24, 30, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(66, 1, 3, 3, 53, 30, 38, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(67, 1, 1, 2, 20, 10, 12, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(68, 1, 2, 2, 24, 12, 14, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(69, 1, 3, 2, 30, 15, 18, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(70, 1, 1, 1, 10, 5, 5, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(71, 1, 2, 1, 12, 6, 6, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(72, 1, 3, 1, 15, 8, 8, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `reward_modifiers`
--

CREATE TABLE `reward_modifiers` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `xp_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `points_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `coins_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `reward_modifiers`
--

INSERT INTO `reward_modifiers` (`id`, `slug`, `name`, `xp_factor`, `points_factor`, `coins_factor`, `created_at`, `updated_at`) VALUES
(1, 'repeticao-de-celula', 'Repetição de célula já concluída', 0.250, 0.000, 0.000, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'meta-renovada', 'Meta renovada depois de vencer', 0.500, 0.500, 0.500, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'bonus-de-meta-do-cofre', 'Bônus por bater a meta do cofre', 0.000, 0.000, 0.050, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `reward_reasons`
--

CREATE TABLE `reward_reasons` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `reward_reasons`
--

INSERT INTO `reward_reasons` (`id`, `slug`, `name`, `created_at`, `updated_at`) VALUES
(1, 'conclusao-celula', 'Conclusão de célula', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(2, 'conclusao-meta', 'Conclusão de meta', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(3, 'conclusao-tarefa', 'Conclusão de tarefa', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(4, 'marco-de-sequencia', 'Marco de sequência', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(5, 'subida-de-nivel', 'Subida de nível', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(6, 'renda-passiva', 'Renda passiva de item', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(7, 'rendimento-cofre', 'Rendimento do cofre', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(8, 'deposito-cofre', 'Depósito no cofre', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(9, 'saque-cofre', 'Saque do cofre', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(10, 'compra', 'Compra na loja', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(11, 'custo-fixo', 'Custo fixo de item', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(12, 'venda-item', 'Venda de item', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(13, 'venda-por-inadimplencia', 'Venda forçada por inadimplência', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(14, 'premio-de-liga', 'Prêmio do pódio da liga semanal', '2026-09-17 23:43:40', '2026-09-17 23:43:40'),
(15, 'ajuste-administrativo', 'Ajuste administrativo', '2026-09-17 23:43:40', '2026-09-17 23:43:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `schedules`
--

CREATE TABLE `schedules` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `weekday` tinyint UNSIGNED NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `schedules`
--

INSERT INTO `schedules` (`id`, `user_id`, `weekday`, `is_available`, `created_at`, `updated_at`) VALUES
(8, 3, 0, 1, '2026-09-17 23:44:43', '2026-09-17 23:44:43'),
(9, 3, 1, 1, '2026-09-17 23:44:43', '2026-09-17 23:44:43'),
(10, 3, 2, 0, '2026-09-17 23:44:43', '2026-09-17 23:44:43'),
(11, 3, 3, 0, '2026-09-17 23:44:44', '2026-09-17 23:44:44'),
(12, 3, 4, 0, '2026-09-17 23:44:44', '2026-09-17 23:44:44'),
(13, 3, 5, 1, '2026-09-17 23:44:44', '2026-09-17 23:44:44'),
(14, 3, 6, 0, '2026-09-17 23:44:44', '2026-09-17 23:44:44'),
(22, 5, 0, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(23, 5, 1, 1, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(24, 5, 2, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(25, 5, 3, 1, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(26, 5, 4, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(27, 5, 5, 1, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(28, 5, 6, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `versao` varchar(255) NOT NULL,
  `checksum` char(64) DEFAULT NULL,
  `aplicada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `schema_migrations`
--

INSERT INTO `schema_migrations` (`versao`, `checksum`, `aplicada_em`) VALUES
('001_core_users.sql', 'd9f2625407350a0ce45aedb8e5268932895e1f2c421cee3b855d851e0672c408', '2026-09-17 23:43:26'),
('002_content_hives_cells.sql', '8291b28e0c7c95f4d5c59837c5274b587c42444e4750e6c0ca71150410225128', '2026-09-17 23:43:27'),
('003_rewards_ledgers.sql', '760d5575cc95c391be4de2f13589ebff68e209a39dfbeb72dbb66d3bc745d970', '2026-09-17 23:43:27'),
('004_goals_tasks_streaks.sql', '5a9ee483c09e9310f8bc7d88686b08438d9f0fd0706c4671780e219f8b0a4e45', '2026-09-17 23:43:28'),
('005_economy_items_inventory.sql', '13d859debfd2c9f776a045f4d9b2ffd79597087f93300b9e13791100ce26b057', '2026-09-17 23:43:29'),
('006_audit_operational.sql', 'ee2cdabda4fb87fb2b496125c15bfc3fc291e11e4280e67cde44993ff075ace0', '2026-09-17 23:43:29'),
('007_gamification.sql', 'dcd9b9afb395a1e3ecd04c97a14baa07de2bcf272fae0c72e77044c36cf4488f', '2026-09-17 23:43:29'),
('008_audit_immutability.sql', 'eda52a64d3255b8164e7162d3ddfb7f27eede8c84f11041d0b72e72d3ea1d288', '2026-09-17 23:43:29'),
('009_audit_request_id.sql', 'fead8f22e83dd3571c7ce0859c4bd41e700b189de314d9220e9cda694b3eea0e', '2026-09-17 23:43:30'),
('010_goal_rewards.sql', '3aca29825cd6a118fb2b913033b63bd5cb2ce426492f08fc45ef0ff2ec39c28e', '2026-09-17 23:43:30'),
('011_onboarding_step.sql', '81c305847b1d81e0984c0293485ae330bf8bd6d1c206fddcd140bd4c4d8f35a4', '2026-09-17 23:43:30'),
('012_session_minutes_opcoes.sql', 'c8f6bdd5d120f75f7043e2c709a8e7291480503dd6001a4941848b1d657a3dc5', '2026-09-17 23:43:30'),
('013_planejador_de_metas.sql', '035c317d503112508c91d0c50907454036e84ac6a4c0d38ff67ffa43055158b9', '2026-09-17 23:43:30'),
('014_reward_modifiers.sql', '9d7d681f1de4027071b539b04d40c025b32b6588fcd6e9e908e5c3954f678690', '2026-09-17 23:43:30'),
('015_estado_de_partida.sql', 'a95bce6100df8624366774a1c4a552cd8592b4eade35fb52d5ddae28b1aa33ad', '2026-09-17 23:43:31'),
('016_faixa_sem_depreciacao.sql', 'bfc188eedf241c57704f41ebdcddc2b171ebb09343c5e2b88abfaa8368429f4a', '2026-09-17 23:43:31'),
('017_ilustracao_do_item.sql', 'c057d83a5404da8da8eb74e227ffc5bc73f99174544ed279c09a4ba2d6bff84e', '2026-09-17 23:43:31'),
('018_conteudo_da_partida.sql', 'f090075a2295110a81988940ae90b7096bfffa93476fdccc51dc8ecafa5f02f1', '2026-09-17 23:43:31'),
('019_indices_da_auditoria.sql', '416fb0da5f7d199955a112a07187b0240ff57dbb2c9579b45f963c309e25a167', '2026-09-17 23:43:31'),
('020_ordem_unica_do_favo.sql', '5d56218b4d50604198814316710d8d77d71a69f2e6369612df9fb98e5f88c1c7', '2026-09-17 23:43:31'),
('021_indices_das_metricas.sql', 'c234d670ec8795b82e0f74de88c7809ee514b5cb95e7f223e0ab46b63687dc44', '2026-09-17 23:43:31'),
('022_criterio_da_conquista.sql', '7809a9d5cc5eb5b34572a186aa76439106a1501177a839924faf2dee2c4a1b24', '2026-09-17 23:43:32'),
('023_liga_semanal.sql', '6afec99acda425c476f08d136165f0ec91b7e58741dc9e80d5939c599f2804e6', '2026-09-17 23:43:32'),
('024_password_reset_tokens.sql', '0a787c02e1fd2ee252d221d68e418e4a81c50634a701bf1485c375c5bcf90008', '2026-09-17 23:43:32'),
('025_login_google.sql', '8f6a7bda6b625d0905e982ad14e6bcedc1ed3ea22d1538a534f1369bd745e6c2', '2026-09-17 23:43:32');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('237a272e-280d-4c41-994b-2424613684c4', 1793368485, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:54:45.061Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"usuarioId\":6,\"email\":\"carlos@gmail.com\",\"ehAdmin\":false,\"perfilId\":6,\"onboardingConcluido\":false}'),
('3a67deb4-6f7f-476c-a1a1-fcbecafb001e', 1793367159, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:32:38.648Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"149786eb7c382de530e580d41da12edca29d0e635b8bed114f28514e92f0d9a4\"}'),
('54131e20-72d4-4b6f-b114-361811059ef3', 1793370008, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T14:20:08.058Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"usuarioId\":3,\"email\":\"gumkyy.santana@gmail.com\",\"ehAdmin\":false,\"perfilId\":3,\"onboardingConcluido\":true,\"csrfToken\":\"0807d34d293b0fbf912bbd3667d74d2f1d980ffba0a2d4fe5e55698a69b08d5e\"}'),
('7085c653-eba5-4260-9432-5f46ff37ea09', 1793367182, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:33:01.718Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"54f457b9a1508b8323519715db295daa5da59dd24a7e564f98a9ea8e332416bb\"}'),
('74c8722e-8d49-49bd-90c5-f7b5c16647df', 1793367137, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:32:17.038Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"652701635d94a4db99dbd6ba8c4622a3d0b42f742dbde8cd37aba77e1dc757ca\"}'),
('a681425e-1f31-4b2e-a4ce-6838db8f2709', 1793368485, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:54:45.069Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"22bf02568394eed37c3bcd854dab41cdadf60d0373fc7a961634b4d856a5278e\"}'),
('b2f8e117-8968-4be6-972b-ea442211c0e9', 1793368518, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:55:17.776Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"usuarioId\":6,\"email\":\"carlos@gmail.com\",\"ehAdmin\":false,\"perfilId\":6,\"onboardingConcluido\":false,\"csrfToken\":\"65962f3396e32ea169e2e62e1eb36629cf2d8c01c791a9ee4db642d5aebf6efb\"}'),
('c24ae80a-f5f0-44e2-9141-efefa26f43f8', 1793367175, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:32:55.485Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"2a7517be92d6047973610e4554e9775f7a244e6316bd2d338b9a96f34ed43e69\"}'),
('c3a7eeb5-0ba5-4913-b8c5-4533a60b01f7', 1793368474, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:54:33.821Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfToken\":\"cfc06c760e80879752dac66793b494d7e9d63320b575353834442c6232f4b9bf\"}'),
('d133f066-81f9-4503-9555-9df6e6a5610b', 1793367182, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:33:02.109Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"usuarioId\":3,\"email\":\"gumkyy.santana@gmail.com\",\"ehAdmin\":false,\"perfilId\":3,\"onboardingConcluido\":true}'),
('fde0657d-ef18-4a75-9385-7dceaaf7f5a1', 1793368474, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2026-10-30T13:54:33.812Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"usuarioId\":6,\"email\":\"carlos@gmail.com\",\"ehAdmin\":false,\"perfilId\":6,\"onboardingConcluido\":false}');

-- --------------------------------------------------------

--
-- Estrutura para tabela `streaks`
--

CREATE TABLE `streaks` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `current_days` smallint UNSIGNED NOT NULL DEFAULT '0',
  `best_days` smallint UNSIGNED NOT NULL DEFAULT '0',
  `shields_available` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `last_counted_date` date DEFAULT NULL,
  `last_evaluated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `streaks`
--

INSERT INTO `streaks` (`id`, `user_id`, `current_days`, `best_days`, `shields_available`, `last_counted_date`, `last_evaluated_at`, `created_at`, `updated_at`) VALUES
(2, 3, 0, 0, 0, NULL, '2026-10-30 13:33:19', '2026-09-17 23:53:34', '2026-10-30 13:33:19'),
(1056, 5, 3, 3, 0, '2026-10-04', '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(1057, 4, 0, 0, 0, NULL, '2026-10-30 13:12:17', '2026-10-04 02:01:38', '2026-10-30 13:12:17');

-- --------------------------------------------------------

--
-- Estrutura para tabela `streak_events`
--

CREATE TABLE `streak_events` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `event_date` date NOT NULL,
  `event_type_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `streak_events`
--

INSERT INTO `streak_events` (`id`, `user_id`, `event_date`, `event_type_id`, `created_at`) VALUES
(6, 3, '2026-09-17', 4, '2026-09-19 20:43:31'),
(7, 3, '2026-09-18', 2, '2026-09-19 20:43:31'),
(8, 3, '2026-09-19', 4, '2026-09-20 14:54:02'),
(10, 3, '2026-09-20', 2, '2026-09-21 18:07:31'),
(11, 5, '2026-09-30', 1, '2026-10-04 02:00:43'),
(12, 5, '2026-10-01', 4, '2026-10-04 02:00:43'),
(13, 5, '2026-10-02', 1, '2026-10-04 02:00:43'),
(14, 5, '2026-10-03', 4, '2026-10-04 02:00:43'),
(15, 5, '2026-10-04', 1, '2026-10-04 02:00:43'),
(18, 4, '2026-10-03', 2, '2026-10-04 03:00:36'),
(19, 4, '2026-10-04', 2, '2026-10-07 22:20:04'),
(20, 4, '2026-10-05', 2, '2026-10-07 22:20:04'),
(21, 4, '2026-10-06', 2, '2026-10-07 22:20:04'),
(22, 4, '2026-10-07', 2, '2026-10-08 18:15:22'),
(23, 4, '2026-10-08', 2, '2026-10-13 00:26:09'),
(24, 4, '2026-10-09', 2, '2026-10-13 00:26:09'),
(25, 4, '2026-10-10', 2, '2026-10-13 00:26:09'),
(26, 4, '2026-10-11', 2, '2026-10-13 00:26:09'),
(27, 4, '2026-10-12', 2, '2026-10-25 15:29:41'),
(28, 4, '2026-10-13', 2, '2026-10-25 15:29:41'),
(29, 4, '2026-10-14', 2, '2026-10-25 15:29:41'),
(30, 4, '2026-10-15', 2, '2026-10-25 15:29:41'),
(31, 4, '2026-10-16', 2, '2026-10-25 15:29:41'),
(32, 4, '2026-10-17', 2, '2026-10-25 15:29:41'),
(33, 4, '2026-10-18', 2, '2026-10-25 15:29:41'),
(34, 4, '2026-10-19', 2, '2026-10-25 15:29:41'),
(35, 4, '2026-10-20', 2, '2026-10-25 15:29:41'),
(36, 4, '2026-10-21', 2, '2026-10-25 15:29:41'),
(37, 4, '2026-10-22', 2, '2026-10-25 15:29:41'),
(38, 4, '2026-10-23', 2, '2026-10-25 15:29:41'),
(39, 4, '2026-10-24', 2, '2026-10-25 15:29:41'),
(40, 4, '2026-10-25', 2, '2026-10-26 16:37:58'),
(41, 4, '2026-10-26', 2, '2026-10-28 16:24:43'),
(42, 4, '2026-10-27', 2, '2026-10-28 16:24:43'),
(43, 4, '2026-10-28', 2, '2026-10-29 21:12:40'),
(44, 3, '2026-09-21', 2, '2026-10-29 22:26:03'),
(45, 3, '2026-09-22', 4, '2026-10-29 22:26:03'),
(46, 3, '2026-09-23', 4, '2026-10-29 22:26:03'),
(47, 3, '2026-09-24', 4, '2026-10-29 22:26:03'),
(48, 3, '2026-09-25', 2, '2026-10-29 22:26:03'),
(49, 3, '2026-09-26', 4, '2026-10-29 22:26:03'),
(50, 3, '2026-09-27', 2, '2026-10-29 22:26:03'),
(51, 3, '2026-09-28', 2, '2026-10-29 22:26:03'),
(52, 3, '2026-09-29', 4, '2026-10-29 22:26:03'),
(53, 3, '2026-09-30', 4, '2026-10-29 22:26:03'),
(54, 3, '2026-10-01', 4, '2026-10-29 22:26:03'),
(55, 3, '2026-10-02', 2, '2026-10-29 22:26:03'),
(56, 3, '2026-10-03', 4, '2026-10-29 22:26:03'),
(57, 3, '2026-10-04', 2, '2026-10-29 22:26:03'),
(58, 3, '2026-10-05', 2, '2026-10-29 22:26:03'),
(59, 3, '2026-10-06', 4, '2026-10-29 22:26:03'),
(60, 3, '2026-10-07', 4, '2026-10-29 22:26:03'),
(61, 3, '2026-10-08', 4, '2026-10-29 22:26:03'),
(62, 3, '2026-10-09', 2, '2026-10-29 22:26:03'),
(63, 3, '2026-10-10', 4, '2026-10-29 22:26:03'),
(64, 3, '2026-10-11', 2, '2026-10-29 22:26:03'),
(65, 3, '2026-10-12', 2, '2026-10-29 22:26:03'),
(66, 3, '2026-10-13', 4, '2026-10-29 22:26:03'),
(67, 3, '2026-10-14', 4, '2026-10-29 22:26:03'),
(68, 3, '2026-10-15', 4, '2026-10-29 22:26:03'),
(69, 3, '2026-10-16', 2, '2026-10-29 22:26:03'),
(70, 3, '2026-10-17', 4, '2026-10-29 22:26:03'),
(71, 3, '2026-10-18', 2, '2026-10-29 22:26:03'),
(72, 3, '2026-10-19', 2, '2026-10-29 22:26:03'),
(73, 3, '2026-10-20', 4, '2026-10-29 22:26:03'),
(74, 3, '2026-10-21', 4, '2026-10-29 22:26:03'),
(75, 3, '2026-10-22', 4, '2026-10-29 22:26:03'),
(76, 3, '2026-10-23', 2, '2026-10-29 22:26:03'),
(77, 3, '2026-10-24', 4, '2026-10-29 22:26:03'),
(78, 3, '2026-10-25', 2, '2026-10-29 22:26:03'),
(79, 3, '2026-10-26', 2, '2026-10-29 22:26:03'),
(80, 3, '2026-10-27', 4, '2026-10-29 22:26:03'),
(81, 3, '2026-10-28', 4, '2026-10-29 22:26:03'),
(82, 4, '2026-10-29', 2, '2026-10-30 13:10:56'),
(83, 3, '2026-10-29', 4, '2026-10-30 13:13:35');

-- --------------------------------------------------------

--
-- Estrutura para tabela `streak_event_types`
--

CREATE TABLE `streak_event_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `streak_event_types`
--

INSERT INTO `streak_event_types` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'cumprido', 'Dia cumprido', '2026-09-17 23:43:41'),
(2, 'perdido', 'Dia perdido', '2026-09-17 23:43:41'),
(3, 'protegido', 'Protegido pelo escudo', '2026-09-17 23:43:41'),
(4, 'neutro', 'Dia neutro', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `task_type_id` bigint UNSIGNED NOT NULL,
  `status_id` bigint UNSIGNED NOT NULL,
  `target_value` bigint NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `reward_points` int UNSIGNED NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `due_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `tasks`
--

INSERT INTO `tasks` (`id`, `user_id`, `task_type_id`, `status_id`, `target_value`, `current_value`, `reward_points`, `reward_coins`, `due_at`, `completed_at`, `created_at`, `updated_at`) VALUES
(3, 3, 2, 3, 50, 0, 10, 15, '2026-09-21 03:00:00', NULL, '2026-09-20 14:54:02', '2026-09-21 18:07:31'),
(4, 3, 1, 3, 3, 0, 15, 20, '2026-09-21 03:00:00', NULL, '2026-09-20 14:54:02', '2026-09-21 18:07:31'),
(5, 3, 3, 3, 3, 0, 40, 60, '2026-09-27 03:00:00', NULL, '2026-09-20 14:54:02', '2026-10-29 22:26:03'),
(11, 3, 1, 3, 3, 0, 15, 20, '2026-09-22 03:00:00', NULL, '2026-09-21 18:07:31', '2026-10-29 22:26:03'),
(12, 3, 2, 3, 50, 0, 10, 15, '2026-09-22 03:00:00', NULL, '2026-09-21 18:07:31', '2026-10-29 22:26:03'),
(13, 5, 1, 2, 3, 3, 15, 20, '2026-10-05 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(14, 5, 3, 1, 3, 2, 40, 60, '2026-10-08 02:00:43', NULL, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(16, 4, 1, 3, 3, 0, 15, 20, '2026-10-04 03:00:00', NULL, '2026-10-04 02:01:38', '2026-10-04 03:00:36'),
(17, 4, 2, 3, 50, 0, 10, 15, '2026-10-04 03:00:00', NULL, '2026-10-04 02:01:38', '2026-10-04 03:00:36'),
(18, 4, 4, 3, 1, 0, 50, 80, '2026-10-04 03:00:00', NULL, '2026-10-04 02:01:38', '2026-10-04 03:00:36'),
(19, 4, 2, 3, 50, 0, 10, 15, '2026-10-05 03:00:00', NULL, '2026-10-04 03:00:36', '2026-10-07 22:20:04'),
(20, 4, 1, 3, 3, 0, 15, 20, '2026-10-05 03:00:00', NULL, '2026-10-04 03:00:36', '2026-10-07 22:20:04'),
(21, 4, 3, 3, 3, 0, 40, 60, '2026-10-11 03:00:00', NULL, '2026-10-04 03:00:36', '2026-10-13 00:26:09'),
(22, 4, 1, 3, 3, 0, 15, 20, '2026-10-08 03:00:00', NULL, '2026-10-07 22:20:04', '2026-10-08 18:15:22'),
(23, 4, 2, 3, 50, 0, 10, 15, '2026-10-08 03:00:00', NULL, '2026-10-07 22:20:04', '2026-10-08 18:15:22'),
(24, 4, 2, 3, 50, 0, 10, 15, '2026-10-09 03:00:00', NULL, '2026-10-08 18:15:22', '2026-10-13 00:26:09'),
(25, 4, 1, 3, 3, 0, 15, 20, '2026-10-09 03:00:00', NULL, '2026-10-08 18:15:22', '2026-10-13 00:26:09'),
(26, 4, 2, 3, 50, 0, 10, 15, '2026-10-13 03:00:00', NULL, '2026-10-13 00:26:09', '2026-10-25 15:29:41'),
(27, 4, 1, 3, 3, 0, 15, 20, '2026-10-13 03:00:00', NULL, '2026-10-13 00:26:09', '2026-10-25 15:29:41'),
(28, 4, 3, 3, 3, 0, 40, 60, '2026-10-18 03:00:00', NULL, '2026-10-13 00:26:09', '2026-10-25 15:29:41'),
(29, 4, 1, 3, 3, 0, 15, 20, '2026-10-26 03:00:00', NULL, '2026-10-25 15:29:41', '2026-10-26 16:37:58'),
(30, 4, 2, 3, 50, 0, 10, 15, '2026-10-26 03:00:00', NULL, '2026-10-25 15:29:41', '2026-10-26 16:37:58'),
(31, 4, 4, 1, 1, 0, 50, 80, '2026-11-01 03:00:00', NULL, '2026-10-25 15:29:41', '2026-10-25 15:29:41'),
(32, 4, 2, 3, 50, 0, 10, 15, '2026-10-27 03:00:00', NULL, '2026-10-26 16:37:58', '2026-10-28 16:24:43'),
(33, 4, 1, 3, 3, 0, 15, 20, '2026-10-27 03:00:00', NULL, '2026-10-26 16:37:58', '2026-10-28 16:24:43'),
(34, 4, 2, 3, 50, 0, 10, 15, '2026-10-29 03:00:00', NULL, '2026-10-28 16:24:43', '2026-10-29 21:12:40'),
(35, 4, 1, 3, 3, 0, 15, 20, '2026-10-29 03:00:00', NULL, '2026-10-28 16:24:44', '2026-10-29 21:12:40'),
(36, 4, 1, 3, 3, 0, 15, 20, '2026-10-30 03:00:00', NULL, '2026-10-29 21:12:40', '2026-10-30 13:10:57'),
(37, 4, 2, 3, 50, 0, 10, 15, '2026-10-30 03:00:00', NULL, '2026-10-29 21:12:40', '2026-10-30 13:10:57'),
(38, 4, 2, 1, 50, 0, 10, 15, '2026-10-31 03:00:00', NULL, '2026-10-30 13:10:57', '2026-10-30 13:10:57'),
(39, 4, 1, 1, 3, 0, 15, 20, '2026-10-31 03:00:00', NULL, '2026-10-30 13:10:57', '2026-10-30 13:10:57'),
(40, 3, 2, 1, 50, 0, 10, 15, '2026-10-31 03:00:00', NULL, '2026-10-30 13:13:35', '2026-10-30 13:13:35'),
(41, 3, 1, 1, 3, 0, 15, 20, '2026-10-31 03:00:00', NULL, '2026-10-30 13:13:35', '2026-10-30 13:13:35'),
(42, 3, 3, 1, 3, 0, 40, 60, '2026-11-01 03:00:00', NULL, '2026-10-30 13:13:35', '2026-10-30 13:13:35');

-- --------------------------------------------------------

--
-- Estrutura para tabela `task_scopes`
--

CREATE TABLE `task_scopes` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `task_scopes`
--

INSERT INTO `task_scopes` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'diaria', 'Diária', '2026-09-17 23:43:41'),
(2, 'semanal', 'Semanal', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `task_types`
--

CREATE TABLE `task_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `scope_id` bigint UNSIGNED NOT NULL,
  `progress_source` varchar(60) NOT NULL,
  `default_target` bigint NOT NULL DEFAULT '1',
  `reward_points` int UNSIGNED NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `task_types`
--

INSERT INTO `task_types` (`id`, `slug`, `name`, `scope_id`, `progress_source`, `default_target`, `reward_points`, `reward_coins`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'concluir-3-celulas', 'Conclua 3 células hoje', 1, 'cell_completed', 3, 15, 20, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(2, 'depositar-no-cofre', 'Deposite 50 de mel no cofre', 1, 'vault_deposit', 50, 10, 15, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(3, 'jogar-3-dias', 'Jogue em 3 dias diferentes', 2, 'active_days', 3, 40, 60, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41'),
(4, 'concluir-favo-semana', 'Conclua um favo esta semana', 2, 'hive_completed', 1, 50, 80, 1, '2026-09-17 23:43:41', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `email` varchar(190) NOT NULL,
  `nickname` varchar(60) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `google_sub` varchar(255) DEFAULT NULL,
  `birth_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `onboarding_completed_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `users`
--

INSERT INTO `users` (`id`, `email`, `nickname`, `password_hash`, `google_sub`, `birth_date`, `is_active`, `onboarding_completed_at`, `last_login_at`, `created_at`, `updated_at`) VALUES
(3, 'gumkyy.santana@gmail.com', 'Santana', '$2b$10$DbLYyRB8UTyutHebec.r1uvkV27M7ukQ8xdmkoydGr9Z8tkuE2nki', NULL, '2006-10-23', 1, '2026-09-17 23:53:34', '2026-10-30 14:00:07', '2026-09-17 23:44:25', '2026-10-30 14:00:07'),
(4, 'admin@beever.dev', 'Prof', '$2b$10$i5SnqQwgaxMlf2Xp3.ti6OxGW.XBdAtwmy87PIKyFkxr/r0my9T3.', NULL, '1988-07-02', 1, '2026-10-04 02:00:43', '2026-10-30 13:10:56', '2026-10-04 02:00:43', '2026-10-30 13:10:56'),
(5, 'ana@beever.dev', 'Aninha', '$2b$10$1gqw5lUPC3M1EmyoYTW8GuSk5Vo2RnbUK/pYNf2jTgrvZulYJ96Ou', NULL, '2018-03-12', 1, '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(6, 'carlos@gmail.com', 'Carlos', '$2b$10$ZhZg5IRkCnfG7Ivr5YnhT.QCEFkONxtblIg0iLaGvprQ9Pv9dd4Ce', NULL, '2004-10-08', 1, NULL, '2026-10-30 13:35:17', '2026-10-30 13:34:33', '2026-10-30 13:35:17');

-- --------------------------------------------------------

--
-- Estrutura para tabela `user_achievements`
--

CREATE TABLE `user_achievements` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `achievement_id` bigint UNSIGNED NOT NULL,
  `unlocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `user_levels`
--

CREATE TABLE `user_levels` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `level` smallint UNSIGNED NOT NULL DEFAULT '1',
  `xp_total` int UNSIGNED NOT NULL DEFAULT '0',
  `xp_next_level` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `user_levels`
--

INSERT INTO `user_levels` (`id`, `user_id`, `level`, `xp_total`, `xp_next_level`, `created_at`, `updated_at`) VALUES
(3, 3, 5, 1120, 1470, '2026-09-17 23:44:25', '2026-09-17 23:53:34'),
(4, 4, 1, 0, 280, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(5, 5, 1, 195, 280, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(6, 6, 1, 0, 280, '2026-10-30 13:34:33', '2026-10-30 13:34:33');

-- --------------------------------------------------------

--
-- Estrutura para tabela `vaults`
--

CREATE TABLE `vaults` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `balance` bigint NOT NULL DEFAULT '0',
  `interest_rate` decimal(6,3) NOT NULL DEFAULT '2.000',
  `goal_amount` bigint DEFAULT NULL,
  `goal_due_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `vaults`
--

INSERT INTO `vaults` (`id`, `user_id`, `balance`, `interest_rate`, `goal_amount`, `goal_due_at`, `created_at`, `updated_at`) VALUES
(2, 5, 51, 2.000, 300, '2026-10-25 02:00:43', '2026-10-04 02:00:43', '2026-10-04 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `vault_transactions`
--

CREATE TABLE `vault_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `transaction_type_id` bigint UNSIGNED NOT NULL,
  `amount` bigint NOT NULL,
  `balance_after` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `vault_transactions`
--

INSERT INTO `vault_transactions` (`id`, `user_id`, `transaction_type_id`, `amount`, `balance_after`, `created_at`) VALUES
(3, 5, 1, 50, 50, '2026-10-02 02:00:43'),
(4, 5, 3, 1, 51, '2026-10-03 02:00:43');

-- --------------------------------------------------------

--
-- Estrutura para tabela `vault_transaction_types`
--

CREATE TABLE `vault_transaction_types` (
  `id` bigint UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `vault_transaction_types`
--

INSERT INTO `vault_transaction_types` (`id`, `slug`, `name`, `created_at`) VALUES
(1, 'deposito', 'Depósito', '2026-09-17 23:43:41'),
(2, 'saque', 'Saque', '2026-09-17 23:43:41'),
(3, 'rendimento', 'Rendimento do ciclo', '2026-09-17 23:43:41'),
(4, 'bonus-meta', 'Bônus por bater a meta do cofre', '2026-09-17 23:43:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `wallets`
--

CREATE TABLE `wallets` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `coins` bigint NOT NULL DEFAULT '0',
  `points_total` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `wallets`
--

INSERT INTO `wallets` (`id`, `user_id`, `coins`, `points_total`, `created_at`, `updated_at`) VALUES
(3, 3, 0, 0, '2026-09-17 23:44:25', '2026-09-17 23:44:25'),
(4, 4, 0, 0, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(5, 5, 19, 95, '2026-10-04 02:00:43', '2026-10-04 02:00:43'),
(6, 6, 0, 0, '2026-10-30 13:34:33', '2026-10-30 13:34:33');

-- --------------------------------------------------------

--
-- Estrutura para tabela `xp_ledger`
--

CREATE TABLE `xp_ledger` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `amount` int NOT NULL,
  `reason_id` bigint UNSIGNED NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint UNSIGNED DEFAULT NULL,
  `balance_after` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Despejando dados para a tabela `xp_ledger`
--

INSERT INTO `xp_ledger` (`id`, `user_id`, `amount`, `reason_id`, `reference_type`, `reference_id`, `balance_after`, `created_at`) VALUES
(8, 3, 1120, 15, 'onboarding', 3, 1120, '2026-09-17 23:53:34'),
(9, 5, 35, 1, 'cell', NULL, 35, '2026-09-28 02:00:43'),
(10, 5, 35, 1, 'cell', NULL, 70, '2026-09-29 02:00:43'),
(11, 5, 35, 1, 'cell', NULL, 105, '2026-10-01 02:00:43'),
(12, 5, 20, 1, 'cell', NULL, 125, '2026-10-03 02:00:43'),
(13, 5, 20, 1, 'cell', NULL, 145, '2026-10-04 02:00:43'),
(14, 5, 50, 2, 'goal', NULL, 195, '2026-10-04 02:00:43');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_achievements_slug` (`slug`),
  ADD KEY `idx_achievements_criterio` (`criterion_type`,`criterion_target`);

--
-- Índices de tabela `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_admins_user` (`user_id`);

--
-- Índices de tabela `age_bands`
--
ALTER TABLE `age_bands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_age_bands_code` (`code`);

--
-- Índices de tabela `audit_actor_types`
--
ALTER TABLE `audit_actor_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_audit_actor_types_slug` (`slug`);

--
-- Índices de tabela `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_actor_created` (`actor_id`,`created_at`),
  ADD KEY `fk_audit_logs_actor_type` (`actor_type_id`),
  ADD KEY `idx_audit_logs_request` (`request_id`),
  ADD KEY `idx_audit_logs_action_created` (`action`,`created_at`),
  ADD KEY `idx_audit_logs_created` (`created_at`);

--
-- Índices de tabela `avatars`
--
ALTER TABLE `avatars`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_avatars_slug` (`slug`);

--
-- Índices de tabela `cells`
--
ALTER TABLE `cells`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cells_hive_order` (`hive_id`,`order_index`),
  ADD KEY `idx_cells_game_type` (`game_type_id`),
  ADD KEY `fk_cells_age_band` (`age_band_id`);

--
-- Índices de tabela `cell_progress`
--
ALTER TABLE `cell_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cell_progress_user_cell` (`user_id`,`cell_id`),
  ADD KEY `fk_cell_progress_cell` (`cell_id`);

--
-- Índices de tabela `coin_ledger`
--
ALTER TABLE `coin_ledger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_coin_ledger_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_coin_ledger_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_coin_ledger_reason` (`reason_id`);

--
-- Índices de tabela `contents`
--
ALTER TABLE `contents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_contents_cell_version` (`cell_id`,`version`);

--
-- Índices de tabela `economic_cycles`
--
ALTER TABLE `economic_cycles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_economic_cycles_user_cycle` (`user_id`,`cycle_number`);

--
-- Índices de tabela `game_sessions`
--
ALTER TABLE `game_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_game_sessions_token` (`token`),
  ADD KEY `idx_game_sessions_user_started` (`user_id`,`started_at`),
  ADD KEY `fk_game_sessions_cell` (`cell_id`),
  ADD KEY `fk_game_sessions_content` (`content_id`),
  ADD KEY `idx_game_sessions_status_fim` (`status_id`,`finished_at`);

--
-- Índices de tabela `game_session_statuses`
--
ALTER TABLE `game_session_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_game_session_statuses_slug` (`slug`);

--
-- Índices de tabela `game_types`
--
ALTER TABLE `game_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_game_types_slug` (`slug`);

--
-- Índices de tabela `goals`
--
ALTER TABLE `goals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_goals_user_status_due` (`user_id`,`status_id`,`due_at`),
  ADD KEY `fk_goals_type` (`goal_type_id`),
  ADD KEY `fk_goals_status` (`status_id`),
  ADD KEY `fk_goals_difficulty` (`difficulty_id`),
  ADD KEY `fk_goals_renewed_from` (`renewed_from_goal_id`);

--
-- Índices de tabela `goal_difficulties`
--
ALTER TABLE `goal_difficulties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_goal_difficulties_slug` (`slug`);

--
-- Índices de tabela `goal_plan_rules`
--
ALTER TABLE `goal_plan_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_goal_plan_rules_faixa` (`min_weekdays`,`max_weekdays`),
  ADD KEY `idx_goal_plan_rules_difficulty` (`difficulty_id`);

--
-- Índices de tabela `goal_statuses`
--
ALTER TABLE `goal_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_goal_statuses_slug` (`slug`);

--
-- Índices de tabela `goal_target_rules`
--
ALTER TABLE `goal_target_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_goal_target_rules_type` (`goal_type_id`);

--
-- Índices de tabela `goal_types`
--
ALTER TABLE `goal_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_goal_types_slug` (`slug`);

--
-- Índices de tabela `guardian_consents`
--
ALTER TABLE `guardian_consents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_guardian_consents_user` (`user_id`);

--
-- Índices de tabela `hives`
--
ALTER TABLE `hives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hives_slug` (`slug`),
  ADD UNIQUE KEY `uq_hives_faixa_ordem` (`age_band_id`,`order_index`),
  ADD KEY `fk_hives_required_item` (`required_item_id`);

--
-- Índices de tabela `hive_progress`
--
ALTER TABLE `hive_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hive_progress_user_hive` (`user_id`,`hive_id`),
  ADD KEY `fk_hive_progress_hive` (`hive_id`);

--
-- Índices de tabela `idempotency_keys`
--
ALTER TABLE `idempotency_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_idempotency_keys_key` (`idempotency_key`),
  ADD KEY `idx_idempotency_keys_user` (`user_id`,`created_at`);

--
-- Índices de tabela `initial_goals`
--
ALTER TABLE `initial_goals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_initial_goals_slug` (`slug`);

--
-- Índices de tabela `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventory_user_status` (`user_id`,`status_id`),
  ADD KEY `idx_inventory_item` (`item_id`),
  ADD KEY `fk_inventory_purchase` (`purchase_id`),
  ADD KEY `fk_inventory_status` (`status_id`);

--
-- Índices de tabela `inventory_statuses`
--
ALTER TABLE `inventory_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_statuses_slug` (`slug`);

--
-- Índices de tabela `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_items_slug` (`slug`),
  ADD KEY `idx_items_category_active` (`category_id`,`is_active`),
  ADD KEY `fk_items_upgrade_of` (`upgrade_of_item_id`);

--
-- Índices de tabela `item_behaviors`
--
ALTER TABLE `item_behaviors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_behaviors_slug` (`slug`);

--
-- Índices de tabela `item_behaviors_map`
--
ALTER TABLE `item_behaviors_map`
  ADD PRIMARY KEY (`item_id`,`behavior_id`),
  ADD KEY `idx_item_behaviors_map_behavior` (`behavior_id`);

--
-- Índices de tabela `item_categories`
--
ALTER TABLE `item_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_categories_slug` (`slug`);

--
-- Índices de tabela `item_requirements`
--
ALTER TABLE `item_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_item_requirements_item` (`item_id`),
  ADD KEY `fk_item_requirements_type` (`requirement_type_id`),
  ADD KEY `fk_item_requirements_hive` (`required_hive_id`),
  ADD KEY `fk_item_requirements_item_ref` (`required_item_id`);

--
-- Índices de tabela `item_requirement_types`
--
ALTER TABLE `item_requirement_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_requirement_types_slug` (`slug`);

--
-- Índices de tabela `leagues`
--
ALTER TABLE `leagues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_leagues_semana_grupo` (`starts_on`,`name`);

--
-- Índices de tabela `league_members`
--
ALTER TABLE `league_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_league_members` (`league_id`,`user_id`),
  ADD KEY `idx_league_members_ranking` (`league_id`,`points`),
  ADD KEY `fk_league_members_user` (`user_id`);

--
-- Índices de tabela `league_prizes`
--
ALTER TABLE `league_prizes`
  ADD PRIMARY KEY (`final_rank`);

--
-- Índices de tabela `levels`
--
ALTER TABLE `levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_levels_level` (`level`);

--
-- Índices de tabela `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_password_reset_tokens_hash` (`token_hash`),
  ADD KEY `idx_password_reset_tokens_user` (`user_id`);

--
-- Índices de tabela `patrimony_snapshots`
--
ALTER TABLE `patrimony_snapshots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_patrimony_snapshots_user_date` (`user_id`,`snapshot_date`);

--
-- Índices de tabela `point_ledger`
--
ALTER TABLE `point_ledger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_point_ledger_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_point_ledger_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_point_ledger_reason` (`reason_id`),
  ADD KEY `idx_point_ledger_created_user` (`created_at`,`user_id`);

--
-- Índices de tabela `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_profiles_user` (`user_id`),
  ADD KEY `idx_profiles_age_band` (`age_band_id`),
  ADD KEY `fk_profiles_avatar` (`avatar_id`),
  ADD KEY `fk_profiles_initial_goal` (`initial_goal_id`);

--
-- Índices de tabela `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchases_user_date` (`user_id`,`purchased_at`),
  ADD KEY `fk_purchases_item` (`item_id`),
  ADD KEY `idx_purchases_data_item` (`purchased_at`,`item_id`);

--
-- Índices de tabela `reward_configs`
--
ALTER TABLE `reward_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reward_configs_combo` (`game_type_id`,`age_band_id`,`stars`),
  ADD KEY `fk_reward_configs_age_band` (`age_band_id`);

--
-- Índices de tabela `reward_modifiers`
--
ALTER TABLE `reward_modifiers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reward_modifiers_slug` (`slug`);

--
-- Índices de tabela `reward_reasons`
--
ALTER TABLE `reward_reasons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reward_reasons_slug` (`slug`);

--
-- Índices de tabela `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_schedules_user_weekday` (`user_id`,`weekday`);

--
-- Índices de tabela `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`versao`);

--
-- Índices de tabela `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Índices de tabela `streaks`
--
ALTER TABLE `streaks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_streaks_user` (`user_id`);

--
-- Índices de tabela `streak_events`
--
ALTER TABLE `streak_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_streak_events_user_date` (`user_id`,`event_date`),
  ADD KEY `fk_streak_events_type` (`event_type_id`),
  ADD KEY `idx_streak_events_data_tipo` (`event_date`,`event_type_id`);

--
-- Índices de tabela `streak_event_types`
--
ALTER TABLE `streak_event_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_streak_event_types_slug` (`slug`);

--
-- Índices de tabela `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tasks_user_status_due` (`user_id`,`status_id`,`due_at`),
  ADD KEY `fk_tasks_type` (`task_type_id`),
  ADD KEY `fk_tasks_status` (`status_id`);

--
-- Índices de tabela `task_scopes`
--
ALTER TABLE `task_scopes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_task_scopes_slug` (`slug`);

--
-- Índices de tabela `task_types`
--
ALTER TABLE `task_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_task_types_slug` (`slug`),
  ADD KEY `fk_task_types_scope` (`scope_id`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD UNIQUE KEY `uq_users_google_sub` (`google_sub`),
  ADD KEY `idx_users_active_last_login` (`is_active`,`last_login_at`);

--
-- Índices de tabela `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_achievements` (`user_id`,`achievement_id`),
  ADD KEY `fk_user_achievements_achievement` (`achievement_id`);

--
-- Índices de tabela `user_levels`
--
ALTER TABLE `user_levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_levels_user` (`user_id`);

--
-- Índices de tabela `vaults`
--
ALTER TABLE `vaults`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_vaults_user` (`user_id`);

--
-- Índices de tabela `vault_transactions`
--
ALTER TABLE `vault_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vault_transactions_user_created` (`user_id`,`created_at`),
  ADD KEY `fk_vault_transactions_type` (`transaction_type_id`);

--
-- Índices de tabela `vault_transaction_types`
--
ALTER TABLE `vault_transaction_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_vault_transaction_types_slug` (`slug`);

--
-- Índices de tabela `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wallets_user` (`user_id`);

--
-- Índices de tabela `xp_ledger`
--
ALTER TABLE `xp_ledger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_xp_ledger_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_xp_ledger_reference` (`reference_type`,`reference_id`),
  ADD KEY `fk_xp_ledger_reason` (`reason_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `achievements`
--
ALTER TABLE `achievements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `admins`
--
ALTER TABLE `admins`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `age_bands`
--
ALTER TABLE `age_bands`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `audit_actor_types`
--
ALTER TABLE `audit_actor_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=132;

--
-- AUTO_INCREMENT de tabela `avatars`
--
ALTER TABLE `avatars`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `cells`
--
ALTER TABLE `cells`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de tabela `cell_progress`
--
ALTER TABLE `cell_progress`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `coin_ledger`
--
ALTER TABLE `coin_ledger`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `contents`
--
ALTER TABLE `contents`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT de tabela `economic_cycles`
--
ALTER TABLE `economic_cycles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de tabela `game_sessions`
--
ALTER TABLE `game_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `game_session_statuses`
--
ALTER TABLE `game_session_statuses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `game_types`
--
ALTER TABLE `game_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `goals`
--
ALTER TABLE `goals`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `goal_difficulties`
--
ALTER TABLE `goal_difficulties`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `goal_plan_rules`
--
ALTER TABLE `goal_plan_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `goal_statuses`
--
ALTER TABLE `goal_statuses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `goal_target_rules`
--
ALTER TABLE `goal_target_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `goal_types`
--
ALTER TABLE `goal_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `guardian_consents`
--
ALTER TABLE `guardian_consents`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `hives`
--
ALTER TABLE `hives`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `hive_progress`
--
ALTER TABLE `hive_progress`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `idempotency_keys`
--
ALTER TABLE `idempotency_keys`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `initial_goals`
--
ALTER TABLE `initial_goals`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `inventory_statuses`
--
ALTER TABLE `inventory_statuses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `items`
--
ALTER TABLE `items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `item_behaviors`
--
ALTER TABLE `item_behaviors`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `item_categories`
--
ALTER TABLE `item_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `item_requirements`
--
ALTER TABLE `item_requirements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `item_requirement_types`
--
ALTER TABLE `item_requirement_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `leagues`
--
ALTER TABLE `leagues`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `league_members`
--
ALTER TABLE `league_members`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `levels`
--
ALTER TABLE `levels`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `patrimony_snapshots`
--
ALTER TABLE `patrimony_snapshots`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `point_ledger`
--
ALTER TABLE `point_ledger`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `profiles`
--
ALTER TABLE `profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `reward_configs`
--
ALTER TABLE `reward_configs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `reward_modifiers`
--
ALTER TABLE `reward_modifiers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `reward_reasons`
--
ALTER TABLE `reward_reasons`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de tabela `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `streaks`
--
ALTER TABLE `streaks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `streak_events`
--
ALTER TABLE `streak_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT de tabela `streak_event_types`
--
ALTER TABLE `streak_event_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `task_scopes`
--
ALTER TABLE `task_scopes`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `task_types`
--
ALTER TABLE `task_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `user_achievements`
--
ALTER TABLE `user_achievements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `user_levels`
--
ALTER TABLE `user_levels`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `vaults`
--
ALTER TABLE `vaults`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `vault_transactions`
--
ALTER TABLE `vault_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `vault_transaction_types`
--
ALTER TABLE `vault_transaction_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `xp_ledger`
--
ALTER TABLE `xp_ledger`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `fk_admins_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_actor_type` FOREIGN KEY (`actor_type_id`) REFERENCES `audit_actor_types` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `cells`
--
ALTER TABLE `cells`
  ADD CONSTRAINT `fk_cells_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_cells_game_type` FOREIGN KEY (`game_type_id`) REFERENCES `game_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_cells_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `cell_progress`
--
ALTER TABLE `cell_progress`
  ADD CONSTRAINT `fk_cell_progress_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cell_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `coin_ledger`
--
ALTER TABLE `coin_ledger`
  ADD CONSTRAINT `fk_coin_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_coin_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `contents`
--
ALTER TABLE `contents`
  ADD CONSTRAINT `fk_contents_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `economic_cycles`
--
ALTER TABLE `economic_cycles`
  ADD CONSTRAINT `fk_economic_cycles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `game_sessions`
--
ALTER TABLE `game_sessions`
  ADD CONSTRAINT `fk_game_sessions_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_game_sessions_content` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_game_sessions_status` FOREIGN KEY (`status_id`) REFERENCES `game_session_statuses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_game_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `goals`
--
ALTER TABLE `goals`
  ADD CONSTRAINT `fk_goals_difficulty` FOREIGN KEY (`difficulty_id`) REFERENCES `goal_difficulties` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_goals_renewed_from` FOREIGN KEY (`renewed_from_goal_id`) REFERENCES `goals` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_goals_status` FOREIGN KEY (`status_id`) REFERENCES `goal_statuses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_goals_type` FOREIGN KEY (`goal_type_id`) REFERENCES `goal_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `goal_plan_rules`
--
ALTER TABLE `goal_plan_rules`
  ADD CONSTRAINT `fk_goal_plan_rules_difficulty` FOREIGN KEY (`difficulty_id`) REFERENCES `goal_difficulties` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `goal_target_rules`
--
ALTER TABLE `goal_target_rules`
  ADD CONSTRAINT `fk_goal_target_rules_type` FOREIGN KEY (`goal_type_id`) REFERENCES `goal_types` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `guardian_consents`
--
ALTER TABLE `guardian_consents`
  ADD CONSTRAINT `fk_guardian_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `hives`
--
ALTER TABLE `hives`
  ADD CONSTRAINT `fk_hives_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_hives_required_item` FOREIGN KEY (`required_item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `hive_progress`
--
ALTER TABLE `hive_progress`
  ADD CONSTRAINT `fk_hive_progress_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_hive_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `idempotency_keys`
--
ALTER TABLE `idempotency_keys`
  ADD CONSTRAINT `fk_idempotency_keys_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `fk_inventory_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_inventory_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_inventory_status` FOREIGN KEY (`status_id`) REFERENCES `inventory_statuses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_inventory_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_items_upgrade_of` FOREIGN KEY (`upgrade_of_item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `item_behaviors_map`
--
ALTER TABLE `item_behaviors_map`
  ADD CONSTRAINT `fk_item_behaviors_map_behavior` FOREIGN KEY (`behavior_id`) REFERENCES `item_behaviors` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_item_behaviors_map_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `item_requirements`
--
ALTER TABLE `item_requirements`
  ADD CONSTRAINT `fk_item_requirements_hive` FOREIGN KEY (`required_hive_id`) REFERENCES `hives` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_item_requirements_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_item_requirements_item_ref` FOREIGN KEY (`required_item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_item_requirements_type` FOREIGN KEY (`requirement_type_id`) REFERENCES `item_requirement_types` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `league_members`
--
ALTER TABLE `league_members`
  ADD CONSTRAINT `fk_league_members_league` FOREIGN KEY (`league_id`) REFERENCES `leagues` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_league_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `patrimony_snapshots`
--
ALTER TABLE `patrimony_snapshots`
  ADD CONSTRAINT `fk_patrimony_snapshots_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `point_ledger`
--
ALTER TABLE `point_ledger`
  ADD CONSTRAINT `fk_point_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_point_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `profiles`
--
ALTER TABLE `profiles`
  ADD CONSTRAINT `fk_profiles_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_profiles_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `avatars` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_profiles_initial_goal` FOREIGN KEY (`initial_goal_id`) REFERENCES `initial_goals` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `fk_purchases_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_purchases_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `reward_configs`
--
ALTER TABLE `reward_configs`
  ADD CONSTRAINT `fk_reward_configs_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_reward_configs_game_type` FOREIGN KEY (`game_type_id`) REFERENCES `game_types` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `streaks`
--
ALTER TABLE `streaks`
  ADD CONSTRAINT `fk_streaks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `streak_events`
--
ALTER TABLE `streak_events`
  ADD CONSTRAINT `fk_streak_events_type` FOREIGN KEY (`event_type_id`) REFERENCES `streak_event_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_streak_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `goal_statuses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_tasks_type` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `task_types`
--
ALTER TABLE `task_types`
  ADD CONSTRAINT `fk_task_types_scope` FOREIGN KEY (`scope_id`) REFERENCES `task_scopes` (`id`) ON DELETE RESTRICT;

--
-- Restrições para tabelas `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD CONSTRAINT `fk_user_achievements_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_user_achievements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `user_levels`
--
ALTER TABLE `user_levels`
  ADD CONSTRAINT `fk_user_levels_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `vaults`
--
ALTER TABLE `vaults`
  ADD CONSTRAINT `fk_vaults_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `vault_transactions`
--
ALTER TABLE `vault_transactions`
  ADD CONSTRAINT `fk_vault_transactions_type` FOREIGN KEY (`transaction_type_id`) REFERENCES `vault_transaction_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_vault_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `wallets`
--
ALTER TABLE `wallets`
  ADD CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `xp_ledger`
--
ALTER TABLE `xp_ledger`
  ADD CONSTRAINT `fk_xp_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_xp_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
