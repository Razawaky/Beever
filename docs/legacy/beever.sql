-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 02/01/2026 às 21:39
-- Versão do servidor: 8.0.44-0ubuntu0.24.04.2
-- Versão do PHP: 8.3.6

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
-- Estrutura para tabela `compra`
--

CREATE TABLE `compra` (
  `id` int NOT NULL,
  `id_user_compra` int NOT NULL,
  `id_item` int NOT NULL,
  `quanti` int NOT NULL,
  `preco` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `conteudos`
--

CREATE TABLE `conteudos` (
  `id` int NOT NULL,
  `id_user_criou_conteudo` int NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `corpo` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `data_publicacao` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `cronograma`
--

CREATE TABLE `cronograma` (
  `id` int NOT NULL,
  `id_user_cronograma` int NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date NOT NULL,
  `horario` time NOT NULL,
  `dia` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `inventario`
--

CREATE TABLE `inventario` (
  `id` int NOT NULL,
  `id_user_inv` int NOT NULL,
  `id_item_inv` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `item`
--

CREATE TABLE `item` (
  `id` int NOT NULL,
  `id_user_criacao` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `valor` int NOT NULL,
  `tipo` int NOT NULL,
  `data_criacao` date NOT NULL,
  `status` enum('Ativo','Desativado') COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `jogos`
--

CREATE TABLE `jogos` (
  `id` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `id_conteudo` int NOT NULL,
  `min_score` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `log_acesso_perfil`
--

CREATE TABLE `log_acesso_perfil` (
  `id` int NOT NULL,
  `id_perfil` int NOT NULL,
  `nome_perfil` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `ultimo_login` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `log_acesso_user`
--

CREATE TABLE `log_acesso_user` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `ultimo_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `log_acesso_user`
--

INSERT INTO `log_acesso_user` (`id`, `id_user`, `nome`, `email`, `ultimo_login`) VALUES
(1, 6, 'Carlos Eduardo', 'oedu@gmail.com', '2025-10-23 15:56:30'),
(2, 6, 'Carlos Eduardo', 'oedu@gmail.com', '2025-10-23 15:57:04'),
(3, 6, 'Carlos Eduardo', 'oedu0810@gmail.com', '2025-10-23 15:57:04'),
(4, 6, 'Carlos Eduardo', 'oedu@gmail.com', '2025-10-23 15:57:04'),
(5, 6, 'Carlos Eduardo Silva Oliveira', 'oedu@gmail.com', '2025-10-23 15:57:04'),
(6, 9, 'Teste Santana', 'testesantana@gmail.com', '2025-10-23 16:19:24'),
(7, 9, 'Teste Santana', 'testesantana@gmail.com', '2025-10-23 16:19:24'),
(8, 9, 'Teste Santana', 'testesantana@gmail.com', '2025-10-23 16:19:24'),
(9, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:12:24'),
(10, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:13:42'),
(11, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:13:46'),
(12, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:35:32'),
(13, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:54:59'),
(14, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:58:36'),
(15, 10, 'Maria', 'maria@gmail.com', '2025-10-28 15:59:32'),
(16, 10, 'Maria', 'maria@gmail.com', '2025-10-28 19:33:44'),
(17, 10, 'Maria', 'maria@gmail.com', '2025-10-28 19:36:41'),
(18, 10, 'Maria', 'maria@gmail.com', '2025-10-28 21:04:37'),
(19, 10, 'Maria', 'maria@gmail.com', '2025-10-28 21:05:36'),
(20, 10, 'Maria', 'maria@gmail.com', '2025-10-28 21:06:19'),
(21, 10, 'Maria', 'maria@gmail.com', '2025-10-28 21:06:47');

-- --------------------------------------------------------

--
-- Estrutura para tabela `log_perfil`
--

CREATE TABLE `log_perfil` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `email_user` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `id_perfil` int NOT NULL,
  `nome_perfil` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `deletadoEm` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `log_perfil`
--

INSERT INTO `log_perfil` (`id`, `id_user`, `email_user`, `id_perfil`, `nome_perfil`, `deletadoEm`) VALUES
(3, 9, 'testesantana@gmail.com', 3, 'Criança1', '2025-10-25 00:37:27');

-- --------------------------------------------------------

--
-- Estrutura para tabela `log_user`
--

CREATE TABLE `log_user` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `acao` enum('DELETADO','ATUALIZADO','CRIADO','INATIVADO') COLLATE utf8mb4_general_ci NOT NULL,
  `data_acao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `log_user`
--

INSERT INTO `log_user` (`id`, `id_user`, `nome`, `email`, `acao`, `data_acao`) VALUES
(1, 9, 'Teste Santana', 'testesantana@gmail.com', 'INATIVADO', '2025-10-23 16:20:52'),
(2, 6, 'Carlos EduardoSilva Oliveira', 'oedu@gmail.com', 'INATIVADO', '2025-11-03 21:48:04');

-- --------------------------------------------------------

--
-- Estrutura para tabela `metas`
--

CREATE TABLE `metas` (
  `id` int NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `data_criacao` date NOT NULL,
  `data_final` date NOT NULL,
  `status` enum('Ativo','Desativado') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_cronograma` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `nivel`
--

CREATE TABLE `nivel` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `nivel` int NOT NULL,
  `xp_atual` int NOT NULL,
  `xp_proximo_nivel` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `perfil`
--

CREATE TABLE `perfil` (
  `id` int NOT NULL,
  `id_user` int NOT NULL,
  `nome_perfil` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `senha_perfil` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data_nasc` date NOT NULL,
  `moedas` int NOT NULL DEFAULT '0',
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_login` datetime DEFAULT NULL,
  `avatar_img` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `perfil`
--

INSERT INTO `perfil` (`id`, `id_user`, `nome_perfil`, `senha_perfil`, `data_nasc`, `moedas`, `data_criacao`, `ultimo_login`, `avatar_img`) VALUES
(9, 30, 'Julio', '$2b$10$OHbtRSI3gv6SPsz3nb7p7enRzfALg9r8w5JcLX9amGnCLRLzhtXYC', '2021-12-12', 0, '2025-11-27 07:43:29', '2025-11-27 07:43:36', NULL),
(10, 29, 'Duarte', '$2b$10$LaIBtsZeoBHTOgaghPi6pe2B/WrQUT7BaIj2HT4snH3sqfp3zFw5O', '2222-02-22', 12, '2025-11-27 14:09:12', '2025-11-27 16:08:15', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `sessao`
--

CREATE TABLE `sessao` (
  `id` int NOT NULL,
  `id_user_sessao` int NOT NULL,
  `id_jogos` int DEFAULT NULL,
  `data_inicio` datetime DEFAULT CURRENT_TIMESTAMP,
  `ultimo_ativo` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_fim` datetime DEFAULT NULL,
  `pontos_obtidos` int DEFAULT '0',
  `moedas_ganhas` int DEFAULT '0',
  `id_sessao_cookie` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `sessao`
--

INSERT INTO `sessao` (`id`, `id_user_sessao`, `id_jogos`, `data_inicio`, `ultimo_ativo`, `data_fim`, `pontos_obtidos`, `moedas_ganhas`, `id_sessao_cookie`) VALUES
(13, 29, NULL, '2025-11-26 23:45:59', '2025-11-26 23:45:59', NULL, 0, 0, 'ad76e67c-7a23-4552-abae-f1ca1a761d37'),
(14, 29, NULL, '2025-11-26 23:54:49', '2025-11-26 23:54:49', NULL, 0, 0, '7403ca34-d2bb-439e-91ec-571a27adc266'),
(15, 29, NULL, '2025-11-27 00:03:45', '2025-11-27 00:03:45', NULL, 0, 0, '0cc045fa-b464-4087-8b95-09a7a75c7db7'),
(16, 30, NULL, '2025-11-27 07:40:56', '2025-11-27 07:40:56', NULL, 0, 0, '92695d6c-33fe-4baa-af9c-40465807fb75'),
(17, 30, NULL, '2025-11-27 07:43:11', '2025-11-27 07:43:11', NULL, 0, 0, '4e8b958c-7c4b-48f3-a7e3-46a4bf5f5c99'),
(18, 30, NULL, '2025-11-27 07:48:16', '2025-11-27 07:48:16', NULL, 0, 0, '487eab9b-cad0-43ea-89cc-ab9342b120f3'),
(19, 30, NULL, '2025-11-27 12:33:43', '2025-11-27 12:33:43', NULL, 0, 0, 'db81284c-2657-48b9-bfce-1911e7e7619b'),
(20, 30, NULL, '2025-11-27 12:34:06', '2025-11-27 12:34:06', NULL, 0, 0, 'b2961752-14f7-4701-8aad-b5e6ad818b3b'),
(21, 29, NULL, '2025-11-27 12:41:32', '2025-11-27 12:41:32', NULL, 0, 0, '9a4687a6-513a-48cc-a313-4d1e8d38f754'),
(22, 29, NULL, '2025-11-27 12:42:34', '2025-11-27 12:42:34', NULL, 0, 0, '786a6de1-27eb-4d96-bcbf-19ef773ec956'),
(23, 29, NULL, '2025-11-27 12:47:55', '2025-11-27 12:47:55', NULL, 0, 0, '7598c530-e0cc-440d-9e3f-6cc648ed0536'),
(24, 29, NULL, '2025-11-27 12:53:42', '2025-11-27 12:53:42', NULL, 0, 0, '0157d31a-5699-4107-adf5-f68dc6fd31c3'),
(25, 29, NULL, '2025-11-27 14:08:19', '2025-11-27 14:08:19', NULL, 0, 0, '9cd70fef-77b9-4528-aae7-e8d343d84035'),
(26, 29, NULL, '2025-11-27 14:19:37', '2025-11-27 14:19:37', NULL, 0, 0, '9cd70fef-77b9-4528-aae7-e8d343d84035'),
(27, 29, NULL, '2025-11-27 15:42:34', '2025-11-27 15:42:34', NULL, 0, 0, '2392addd-7c7a-4fb8-980b-2efae4701f21'),
(28, 29, NULL, '2025-11-27 15:58:40', '2025-11-27 15:58:40', NULL, 0, 0, '2392addd-7c7a-4fb8-980b-2efae4701f21'),
(29, 31, NULL, '2025-11-27 16:05:44', '2025-11-27 16:05:44', NULL, 0, 0, '0cbd16ee-0081-468a-a070-6ef8e3b25cc2'),
(30, 29, NULL, '2025-11-27 16:07:24', '2025-11-27 16:07:24', NULL, 0, 0, '0cbd16ee-0081-468a-a070-6ef8e3b25cc2');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('0cbd16ee-0081-468a-a070-6ef8e3b25cc2', 1764271696, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2025-11-27T19:28:15.888Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":29,\"email\":\"carlos@gmail.com\",\"perfilId\":10}'),
('2392addd-7c7a-4fb8-980b-2efae4701f21', 1764271128, '{\"cookie\":{\"originalMaxAge\":1200000,\"expires\":\"2025-11-27T19:02:40.488Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":29,\"email\":\"carlos@gmail.com\",\"perfilId\":10}');

-- --------------------------------------------------------

--
-- Estrutura para tabela `tarefa`
--

CREATE TABLE `tarefa` (
  `id` int NOT NULL,
  `id_user_tarefa` int NOT NULL,
  `id_meta` int NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `data_criacao` datetime NOT NULL,
  `data_inicio` date NOT NULL,
  `data_prazo` date NOT NULL,
  `status` enum('Ativo','Desativado') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `prioridade` enum('Baixa','Media','Alta') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `progresso` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuario`
--

CREATE TABLE `usuario` (
  `id` int NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `data_nasc` date NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_login` datetime DEFAULT NULL,
  `status` enum('Inativo','Ativo') COLLATE utf8mb4_general_ci NOT NULL,
  `tipo_usuario` enum('Comum','Administrador') COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuario`
--

INSERT INTO `usuario` (`id`, `nome`, `email`, `data_nasc`, `senha`, `data_criacao`, `ultimo_login`, `status`, `tipo_usuario`) VALUES
(29, 'Carlos', 'carlos@gmail.com', '2004-10-08', '$2b$10$nAY8Zc4vjiMjNTsaVziSWemchqHwTqDK/kZROH1oZ0DXi9nkHunRS', '2025-11-26 23:45:57', '2025-11-27 16:07:24', 'Ativo', 'Comum'),
(30, 'Santana', 'santana@gmail.com', '2006-10-23', '$2b$10$P3HUQov5XoLBeG9PtN3gqug7wK/Nxmxv5bXEMhJe4vQpqRs.9QXqq', '2025-11-27 07:40:54', '2025-11-27 12:34:06', 'Ativo', 'Comum'),
(31, 'Thiago Bergamaschi', 'thiago@gmail.com', '2000-05-13', '$2b$10$dmTX3XgBAvSWrcUL1NlijegtBrqtigePefQur8W9dKHPBwDWfX8Ma', '2025-11-27 16:05:39', '2025-11-27 16:05:44', 'Ativo', 'Comum');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `compra`
--
ALTER TABLE `compra`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_compra` (`id_user_compra`),
  ADD KEY `id_item` (`id_item`);

--
-- Índices de tabela `conteudos`
--
ALTER TABLE `conteudos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_criou_conteudo` (`id_user_criou_conteudo`);

--
-- Índices de tabela `cronograma`
--
ALTER TABLE `cronograma`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_cronograma` (`id_user_cronograma`);

--
-- Índices de tabela `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_inv` (`id_user_inv`),
  ADD KEY `id_item_inv` (`id_item_inv`);

--
-- Índices de tabela `item`
--
ALTER TABLE `item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_criacao` (`id_user_criacao`);

--
-- Índices de tabela `jogos`
--
ALTER TABLE `jogos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_conteudo` (`id_conteudo`);

--
-- Índices de tabela `log_acesso_perfil`
--
ALTER TABLE `log_acesso_perfil`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_perfil` (`id_perfil`);

--
-- Índices de tabela `log_acesso_user`
--
ALTER TABLE `log_acesso_user`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`);

--
-- Índices de tabela `log_perfil`
--
ALTER TABLE `log_perfil`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_perfil` (`id_perfil`);

--
-- Índices de tabela `log_user`
--
ALTER TABLE `log_user`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`);

--
-- Índices de tabela `metas`
--
ALTER TABLE `metas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_cronograma` (`id_cronograma`);

--
-- Índices de tabela `nivel`
--
ALTER TABLE `nivel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`);

--
-- Índices de tabela `perfil`
--
ALTER TABLE `perfil`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user` (`id_user`);

--
-- Índices de tabela `sessao`
--
ALTER TABLE `sessao`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_sessao` (`id_user_sessao`);

--
-- Índices de tabela `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Índices de tabela `tarefa`
--
ALTER TABLE `tarefa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_user_tarefa` (`id_user_tarefa`),
  ADD KEY `id_meta` (`id_meta`);

--
-- Índices de tabela `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `compra`
--
ALTER TABLE `compra`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `conteudos`
--
ALTER TABLE `conteudos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `cronograma`
--
ALTER TABLE `cronograma`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `log_user`
--
ALTER TABLE `log_user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `perfil`
--
ALTER TABLE `perfil`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `sessao`
--
ALTER TABLE `sessao`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de tabela `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
