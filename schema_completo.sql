-- MySQL dump 10.13  Distrib 8.4.11, for Linux (x86_64)
--
-- Host: localhost    Database: beever
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `achievements`
--

DROP TABLE IF EXISTS `achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `achievements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) NOT NULL,
  `criterion_type` varchar(40) NOT NULL DEFAULT 'manual',
  `criterion_target` bigint unsigned NOT NULL DEFAULT '0',
  `icon_path` varchar(255) DEFAULT NULL,
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_achievements_slug` (`slug`),
  KEY `idx_achievements_criterio` (`criterion_type`,`criterion_target`),
  CONSTRAINT `ck_achievements_reward` CHECK ((`reward_coins` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_user` (`user_id`),
  CONSTRAINT `fk_admins_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `age_bands`
--

DROP TABLE IF EXISTS `age_bands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `age_bands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` char(1) NOT NULL,
  `name` varchar(60) NOT NULL,
  `min_age` tinyint unsigned NOT NULL,
  `max_age` tinyint unsigned NOT NULL,
  `is_economy_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_upkeep_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_depreciation_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_age_bands_code` (`code`),
  CONSTRAINT `ck_age_bands_range` CHECK (((`min_age` >= 0) and (`max_age` >= `min_age`)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_actor_types`
--

DROP TABLE IF EXISTS `audit_actor_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_actor_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_audit_actor_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_type_id` bigint unsigned NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(60) NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `before_state` json DEFAULT NULL,
  `after_state` json DEFAULT NULL,
  `ip_hash` char(64) DEFAULT NULL,
  `request_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_actor_created` (`actor_id`,`created_at`),
  KEY `fk_audit_logs_actor_type` (`actor_type_id`),
  KEY `idx_audit_logs_request` (`request_id`),
  KEY `idx_audit_logs_action_created` (`action`,`created_at`),
  KEY `idx_audit_logs_created` (`created_at`),
  CONSTRAINT `fk_audit_logs_actor_type` FOREIGN KEY (`actor_type_id`) REFERENCES `audit_actor_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`beever`@`%`*/ /*!50003 TRIGGER `trg_audit_logs_sem_update` BEFORE UPDATE ON `audit_logs` FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: alterar registro de auditoria nao e permitido (RNF-17)' */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`beever`@`%`*/ /*!50003 TRIGGER `trg_audit_logs_sem_delete` BEFORE DELETE ON `audit_logs` FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'audit_logs e append-only: apagar registro de auditoria nao e permitido (RNF-17)' */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `avatars`
--

DROP TABLE IF EXISTS `avatars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avatars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(60) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_avatars_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cell_progress`
--

DROP TABLE IF EXISTS `cell_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cell_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `cell_id` bigint unsigned NOT NULL,
  `stars` tinyint unsigned NOT NULL DEFAULT '0',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `errors` int unsigned NOT NULL DEFAULT '0',
  `best_score` int unsigned NOT NULL DEFAULT '0',
  `first_completed_at` datetime DEFAULT NULL,
  `last_completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cell_progress_user_cell` (`user_id`,`cell_id`),
  KEY `fk_cell_progress_cell` (`cell_id`),
  CONSTRAINT `fk_cell_progress_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cell_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_cell_progress_stars` CHECK ((`stars` between 0 and 3))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cells`
--

DROP TABLE IF EXISTS `cells`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cells` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hive_id` bigint unsigned NOT NULL,
  `game_type_id` bigint unsigned NOT NULL,
  `age_band_id` bigint unsigned NOT NULL,
  `order_index` smallint unsigned NOT NULL,
  `title` varchar(120) NOT NULL,
  `estimated_seconds` int unsigned NOT NULL DEFAULT '300',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cells_hive_order` (`hive_id`,`order_index`),
  KEY `idx_cells_game_type` (`game_type_id`),
  KEY `fk_cells_age_band` (`age_band_id`),
  CONSTRAINT `fk_cells_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cells_game_type` FOREIGN KEY (`game_type_id`) REFERENCES `game_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cells_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `coin_ledger`
--

DROP TABLE IF EXISTS `coin_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coin_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `amount` bigint NOT NULL,
  `reason_id` bigint unsigned NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `balance_after` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coin_ledger_user_created` (`user_id`,`created_at`),
  KEY `idx_coin_ledger_reference` (`reference_type`,`reference_id`),
  KEY `fk_coin_ledger_reason` (`reason_id`),
  CONSTRAINT `fk_coin_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coin_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_coin_ledger_amount` CHECK ((`amount` <> 0))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contents`
--

DROP TABLE IF EXISTS `contents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cell_id` bigint unsigned NOT NULL,
  `version` smallint unsigned NOT NULL DEFAULT '1',
  `body` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contents_cell_version` (`cell_id`,`version`),
  CONSTRAINT `fk_contents_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `economic_cycles`
--

DROP TABLE IF EXISTS `economic_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `economic_cycles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `cycle_number` int unsigned NOT NULL,
  `processed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `summary` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_economic_cycles_user_cycle` (`user_id`,`cycle_number`),
  CONSTRAINT `fk_economic_cycles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_session_statuses`
--

DROP TABLE IF EXISTS `game_session_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_session_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_session_statuses_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_sessions`
--

DROP TABLE IF EXISTS `game_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `cell_id` bigint unsigned NOT NULL,
  `content_id` bigint unsigned DEFAULT NULL,
  `status_id` bigint unsigned NOT NULL,
  `token` char(36) NOT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `duration_seconds` int unsigned DEFAULT NULL,
  `errors` int unsigned NOT NULL DEFAULT '0',
  `stars` tinyint unsigned NOT NULL DEFAULT '0',
  `xp_awarded` int unsigned NOT NULL DEFAULT '0',
  `points_awarded` int unsigned NOT NULL DEFAULT '0',
  `coins_awarded` bigint NOT NULL DEFAULT '0',
  `is_replay` tinyint(1) NOT NULL DEFAULT '0',
  `saved_state` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_sessions_token` (`token`),
  KEY `idx_game_sessions_user_started` (`user_id`,`started_at`),
  KEY `fk_game_sessions_cell` (`cell_id`),
  KEY `fk_game_sessions_content` (`content_id`),
  KEY `idx_game_sessions_status_fim` (`status_id`,`finished_at`),
  CONSTRAINT `fk_game_sessions_cell` FOREIGN KEY (`cell_id`) REFERENCES `cells` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_game_sessions_content` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_game_sessions_status` FOREIGN KEY (`status_id`) REFERENCES `game_session_statuses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_game_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_game_sessions_coins` CHECK ((`coins_awarded` >= 0)),
  CONSTRAINT `ck_game_sessions_stars` CHECK ((`stars` between 0 and 3))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `game_types`
--

DROP TABLE IF EXISTS `game_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_game_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_difficulties`
--

DROP TABLE IF EXISTS `goal_difficulties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_difficulties` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `reward_multiplier` decimal(6,3) NOT NULL DEFAULT '1.000',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `reward_points` int unsigned NOT NULL DEFAULT '0',
  `default_days` smallint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_goal_difficulties_slug` (`slug`),
  CONSTRAINT `ck_goal_difficulties_multiplier` CHECK ((`reward_multiplier` > 0)),
  CONSTRAINT `ck_goal_difficulties_reward` CHECK ((`reward_coins` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_plan_rules`
--

DROP TABLE IF EXISTS `goal_plan_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_plan_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `min_weekdays` tinyint unsigned NOT NULL,
  `max_weekdays` tinyint unsigned NOT NULL,
  `active_goals` tinyint unsigned NOT NULL,
  `difficulty_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_goal_plan_rules_faixa` (`min_weekdays`,`max_weekdays`),
  KEY `idx_goal_plan_rules_difficulty` (`difficulty_id`),
  CONSTRAINT `fk_goal_plan_rules_difficulty` FOREIGN KEY (`difficulty_id`) REFERENCES `goal_difficulties` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_goal_plan_rules_faixa` CHECK (((`min_weekdays` >= 1) and (`max_weekdays` >= `min_weekdays`) and (`max_weekdays` <= 7))),
  CONSTRAINT `ck_goal_plan_rules_metas` CHECK ((`active_goals` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_statuses`
--

DROP TABLE IF EXISTS `goal_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_goal_statuses_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_target_rules`
--

DROP TABLE IF EXISTS `goal_target_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_target_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `goal_type_id` bigint unsigned NOT NULL,
  `base_per_session` decimal(10,3) NOT NULL,
  `min_increment` bigint NOT NULL,
  `max_increment` bigint NOT NULL,
  `rounding_step` bigint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_goal_target_rules_type` (`goal_type_id`),
  CONSTRAINT `fk_goal_target_rules_type` FOREIGN KEY (`goal_type_id`) REFERENCES `goal_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_goal_target_rules_valores` CHECK (((`base_per_session` > 0) and (`min_increment` >= 1) and (`max_increment` >= `min_increment`) and (`rounding_step` >= 1)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_types`
--

DROP TABLE IF EXISTS `goal_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `progress_source` varchar(60) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_goal_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goals`
--

DROP TABLE IF EXISTS `goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `goal_type_id` bigint unsigned NOT NULL,
  `status_id` bigint unsigned NOT NULL,
  `difficulty_id` bigint unsigned NOT NULL,
  `title` varchar(160) NOT NULL,
  `target_value` bigint NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `reward_points` int unsigned NOT NULL DEFAULT '0',
  `starts_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `renewed_from_goal_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goals_user_status_due` (`user_id`,`status_id`,`due_at`),
  KEY `fk_goals_type` (`goal_type_id`),
  KEY `fk_goals_status` (`status_id`),
  KEY `fk_goals_difficulty` (`difficulty_id`),
  KEY `fk_goals_renewed_from` (`renewed_from_goal_id`),
  CONSTRAINT `fk_goals_difficulty` FOREIGN KEY (`difficulty_id`) REFERENCES `goal_difficulties` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_goals_renewed_from` FOREIGN KEY (`renewed_from_goal_id`) REFERENCES `goals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_goals_status` FOREIGN KEY (`status_id`) REFERENCES `goal_statuses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_goals_type` FOREIGN KEY (`goal_type_id`) REFERENCES `goal_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_goals_dates` CHECK ((`due_at` > `starts_at`)),
  CONSTRAINT `ck_goals_values` CHECK (((`target_value` > 0) and (`current_value` >= 0) and (`reward_coins` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `guardian_consents`
--

DROP TABLE IF EXISTS `guardian_consents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guardian_consents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `guardian_email` varchar(190) NOT NULL,
  `consented_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_hash` char(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_guardian_consents_user` (`user_id`),
  CONSTRAINT `fk_guardian_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hive_progress`
--

DROP TABLE IF EXISTS `hive_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hive_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `hive_id` bigint unsigned NOT NULL,
  `completed_cells` smallint unsigned NOT NULL DEFAULT '0',
  `total_cells` smallint unsigned NOT NULL DEFAULT '0',
  `percent` tinyint unsigned NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hive_progress_user_hive` (`user_id`,`hive_id`),
  KEY `fk_hive_progress_hive` (`hive_id`),
  CONSTRAINT `fk_hive_progress_hive` FOREIGN KEY (`hive_id`) REFERENCES `hives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hive_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_hive_progress_percent` CHECK ((`percent` between 0 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hives`
--

DROP TABLE IF EXISTS `hives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hives` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `title` varchar(120) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `order_index` smallint unsigned NOT NULL,
  `age_band_id` bigint unsigned NOT NULL,
  `unlock_percent` tinyint unsigned NOT NULL DEFAULT '80',
  `required_patrimony` bigint NOT NULL DEFAULT '0',
  `required_item_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hives_slug` (`slug`),
  UNIQUE KEY `uq_hives_faixa_ordem` (`age_band_id`,`order_index`),
  KEY `fk_hives_required_item` (`required_item_id`),
  CONSTRAINT `fk_hives_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_hives_required_item` FOREIGN KEY (`required_item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_hives_required_patrimony` CHECK ((`required_patrimony` >= 0)),
  CONSTRAINT `ck_hives_unlock_percent` CHECK ((`unlock_percent` between 1 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `idempotency_keys`
--

DROP TABLE IF EXISTS `idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotency_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `idempotency_key` varchar(190) NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `operation` varchar(80) NOT NULL,
  `response_hash` char(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idempotency_keys_key` (`idempotency_key`),
  KEY `idx_idempotency_keys_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_idempotency_keys_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `initial_goals`
--

DROP TABLE IF EXISTS `initial_goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `initial_goals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `label` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_initial_goals_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `purchase_id` bigint unsigned DEFAULT NULL,
  `status_id` bigint unsigned NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `overdue_cycles` tinyint unsigned NOT NULL DEFAULT '0',
  `is_equipped` tinyint(1) NOT NULL DEFAULT '0',
  `acquired_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sold_at` datetime DEFAULT NULL,
  `sold_value` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_user_status` (`user_id`,`status_id`),
  KEY `idx_inventory_item` (`item_id`),
  KEY `fk_inventory_purchase` (`purchase_id`),
  KEY `fk_inventory_status` (`status_id`),
  CONSTRAINT `fk_inventory_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inventory_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventory_status` FOREIGN KEY (`status_id`) REFERENCES `inventory_statuses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inventory_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_inventory_values` CHECK (((`current_value` >= 0) and ((`sold_value` is null) or (`sold_value` >= 0))))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_statuses`
--

DROP TABLE IF EXISTS `inventory_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_statuses_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_behaviors`
--

DROP TABLE IF EXISTS `item_behaviors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_behaviors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_behaviors_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_behaviors_map`
--

DROP TABLE IF EXISTS `item_behaviors_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_behaviors_map` (
  `item_id` bigint unsigned NOT NULL,
  `behavior_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`,`behavior_id`),
  KEY `idx_item_behaviors_map_behavior` (`behavior_id`),
  CONSTRAINT `fk_item_behaviors_map_behavior` FOREIGN KEY (`behavior_id`) REFERENCES `item_behaviors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_item_behaviors_map_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_categories`
--

DROP TABLE IF EXISTS `item_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_categories_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_requirement_types`
--

DROP TABLE IF EXISTS `item_requirement_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_requirement_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_requirement_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_requirements`
--

DROP TABLE IF EXISTS `item_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_requirements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint unsigned NOT NULL,
  `requirement_type_id` bigint unsigned NOT NULL,
  `required_level` smallint unsigned DEFAULT NULL,
  `required_hive_id` bigint unsigned DEFAULT NULL,
  `required_item_id` bigint unsigned DEFAULT NULL,
  `required_patrimony` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_requirements_item` (`item_id`),
  KEY `fk_item_requirements_type` (`requirement_type_id`),
  KEY `fk_item_requirements_hive` (`required_hive_id`),
  KEY `fk_item_requirements_item_ref` (`required_item_id`),
  CONSTRAINT `fk_item_requirements_hive` FOREIGN KEY (`required_hive_id`) REFERENCES `hives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_requirements_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_requirements_item_ref` FOREIGN KEY (`required_item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_requirements_type` FOREIGN KEY (`requirement_type_id`) REFERENCES `item_requirement_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_item_requirements_patrimony` CHECK (((`required_patrimony` is null) or (`required_patrimony` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description_kid` varchar(500) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `category_id` bigint unsigned NOT NULL,
  `price` bigint NOT NULL,
  `counts_in_patrimony` tinyint(1) NOT NULL DEFAULT '1',
  `valuation_rate` decimal(6,3) NOT NULL DEFAULT '0.000',
  `valuation_floor_pct` tinyint unsigned NOT NULL DEFAULT '0',
  `valuation_cap_pct` smallint unsigned NOT NULL DEFAULT '100',
  `upkeep_cost` bigint NOT NULL DEFAULT '0',
  `income_per_cycle` bigint NOT NULL DEFAULT '0',
  `upgrade_of_item_id` bigint unsigned DEFAULT NULL,
  `is_consumable` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_items_slug` (`slug`),
  KEY `idx_items_category_active` (`category_id`,`is_active`),
  KEY `fk_items_upgrade_of` (`upgrade_of_item_id`),
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_items_upgrade_of` FOREIGN KEY (`upgrade_of_item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_items_cap` CHECK ((`valuation_cap_pct` >= `valuation_floor_pct`)),
  CONSTRAINT `ck_items_floor` CHECK ((`valuation_floor_pct` between 0 and 100)),
  CONSTRAINT `ck_items_income` CHECK ((`income_per_cycle` >= 0)),
  CONSTRAINT `ck_items_price` CHECK ((`price` >= 0)),
  CONSTRAINT `ck_items_upkeep` CHECK ((`upkeep_cost` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `league_members`
--

DROP TABLE IF EXISTS `league_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `league_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `league_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `points` int unsigned NOT NULL DEFAULT '0',
  `final_rank` smallint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_league_members` (`league_id`,`user_id`),
  KEY `idx_league_members_ranking` (`league_id`,`points`),
  KEY `fk_league_members_user` (`user_id`),
  CONSTRAINT `fk_league_members_league` FOREIGN KEY (`league_id`) REFERENCES `leagues` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_league_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `leagues`
--

DROP TABLE IF EXISTS `leagues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leagues` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leagues_starts_on` (`starts_on`),
  CONSTRAINT `ck_leagues_dates` CHECK ((`ends_on` > `starts_on`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `levels`
--

DROP TABLE IF EXISTS `levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `level` smallint unsigned NOT NULL,
  `required_xp` int unsigned NOT NULL,
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_levels_level` (`level`),
  CONSTRAINT `ck_levels_values` CHECK (((`level` >= 1) and (`reward_coins` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `patrimony_snapshots`
--

DROP TABLE IF EXISTS `patrimony_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patrimony_snapshots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `snapshot_date` date NOT NULL,
  `wallet_coins` bigint NOT NULL DEFAULT '0',
  `vault_balance` bigint NOT NULL DEFAULT '0',
  `items_value` bigint NOT NULL DEFAULT '0',
  `total_value` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patrimony_snapshots_user_date` (`user_id`,`snapshot_date`),
  CONSTRAINT `fk_patrimony_snapshots_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_patrimony_snapshots_values` CHECK (((`wallet_coins` >= 0) and (`vault_balance` >= 0) and (`items_value` >= 0) and (`total_value` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `point_ledger`
--

DROP TABLE IF EXISTS `point_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `amount` int NOT NULL,
  `reason_id` bigint unsigned NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `balance_after` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_point_ledger_user_created` (`user_id`,`created_at`),
  KEY `idx_point_ledger_reference` (`reference_type`,`reference_id`),
  KEY `fk_point_ledger_reason` (`reason_id`),
  CONSTRAINT `fk_point_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_point_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_point_ledger_amount` CHECK ((`amount` <> 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `age_band_id` bigint unsigned DEFAULT NULL,
  `avatar_id` bigint unsigned DEFAULT NULL,
  `initial_goal_id` bigint unsigned DEFAULT NULL,
  `onboarding_step` tinyint unsigned NOT NULL DEFAULT '0',
  `timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  `session_minutes` tinyint unsigned NOT NULL DEFAULT '10',
  `is_sound_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `has_reduced_motion` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_user` (`user_id`),
  KEY `idx_profiles_age_band` (`age_band_id`),
  KEY `fk_profiles_avatar` (`avatar_id`),
  KEY `fk_profiles_initial_goal` (`initial_goal_id`),
  CONSTRAINT `fk_profiles_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_profiles_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `avatars` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_profiles_initial_goal` FOREIGN KEY (`initial_goal_id`) REFERENCES `initial_goals` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_profiles_session_minutes` CHECK ((`session_minutes` in (5,10,20,30,45)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `price_at_purchase` bigint NOT NULL,
  `discount_applied` bigint NOT NULL DEFAULT '0',
  `total_price` bigint NOT NULL,
  `purchased_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchases_user_date` (`user_id`,`purchased_at`),
  KEY `fk_purchases_item` (`item_id`),
  KEY `idx_purchases_data_item` (`purchased_at`,`item_id`),
  CONSTRAINT `fk_purchases_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_purchases_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_purchases_total` CHECK ((`total_price` = ((`price_at_purchase` * `quantity`) - `discount_applied`))),
  CONSTRAINT `ck_purchases_values` CHECK (((`quantity` > 0) and (`price_at_purchase` >= 0) and (`discount_applied` >= 0) and (`total_price` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reward_configs`
--

DROP TABLE IF EXISTS `reward_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_configs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `game_type_id` bigint unsigned NOT NULL,
  `age_band_id` bigint unsigned NOT NULL,
  `stars` tinyint unsigned NOT NULL,
  `xp_amount` int unsigned NOT NULL DEFAULT '0',
  `points_amount` int unsigned NOT NULL DEFAULT '0',
  `coins_amount` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reward_configs_combo` (`game_type_id`,`age_band_id`,`stars`),
  KEY `fk_reward_configs_age_band` (`age_band_id`),
  CONSTRAINT `fk_reward_configs_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_bands` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_reward_configs_game_type` FOREIGN KEY (`game_type_id`) REFERENCES `game_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_reward_configs_coins` CHECK ((`coins_amount` >= 0)),
  CONSTRAINT `ck_reward_configs_stars` CHECK ((`stars` between 1 and 3))
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reward_modifiers`
--

DROP TABLE IF EXISTS `reward_modifiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_modifiers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `xp_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `points_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `coins_factor` decimal(4,3) NOT NULL DEFAULT '1.000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reward_modifiers_slug` (`slug`),
  CONSTRAINT `ck_reward_modifiers_factors` CHECK (((`xp_factor` >= 0) and (`points_factor` >= 0) and (`coins_factor` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reward_reasons`
--

DROP TABLE IF EXISTS `reward_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_reasons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reward_reasons_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `weekday` tinyint unsigned NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schedules_user_weekday` (`user_id`,`weekday`),
  CONSTRAINT `fk_schedules_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_schedules_weekday` CHECK ((`weekday` between 0 and 6))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `versao` varchar(255) NOT NULL,
  `checksum` char(64) DEFAULT NULL,
  `aplicada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`versao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `streak_event_types`
--

DROP TABLE IF EXISTS `streak_event_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `streak_event_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_streak_event_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `streak_events`
--

DROP TABLE IF EXISTS `streak_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `streak_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `event_date` date NOT NULL,
  `event_type_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_streak_events_user_date` (`user_id`,`event_date`),
  KEY `fk_streak_events_type` (`event_type_id`),
  KEY `idx_streak_events_data_tipo` (`event_date`,`event_type_id`),
  CONSTRAINT `fk_streak_events_type` FOREIGN KEY (`event_type_id`) REFERENCES `streak_event_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_streak_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `streaks`
--

DROP TABLE IF EXISTS `streaks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `streaks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `current_days` smallint unsigned NOT NULL DEFAULT '0',
  `best_days` smallint unsigned NOT NULL DEFAULT '0',
  `shields_available` tinyint unsigned NOT NULL DEFAULT '0',
  `last_counted_date` date DEFAULT NULL,
  `last_evaluated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_streaks_user` (`user_id`),
  CONSTRAINT `fk_streaks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_streaks_shields` CHECK ((`shields_available` <= 2))
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_scopes`
--

DROP TABLE IF EXISTS `task_scopes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_scopes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_scopes_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_types`
--

DROP TABLE IF EXISTS `task_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(120) NOT NULL,
  `scope_id` bigint unsigned NOT NULL,
  `progress_source` varchar(60) NOT NULL,
  `default_target` bigint NOT NULL DEFAULT '1',
  `reward_points` int unsigned NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_types_slug` (`slug`),
  KEY `fk_task_types_scope` (`scope_id`),
  CONSTRAINT `fk_task_types_scope` FOREIGN KEY (`scope_id`) REFERENCES `task_scopes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_task_types_values` CHECK (((`default_target` > 0) and (`reward_coins` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `task_type_id` bigint unsigned NOT NULL,
  `status_id` bigint unsigned NOT NULL,
  `target_value` bigint NOT NULL,
  `current_value` bigint NOT NULL DEFAULT '0',
  `reward_points` int unsigned NOT NULL DEFAULT '0',
  `reward_coins` bigint NOT NULL DEFAULT '0',
  `due_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_user_status_due` (`user_id`,`status_id`,`due_at`),
  KEY `fk_tasks_type` (`task_type_id`),
  KEY `fk_tasks_status` (`status_id`),
  CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `goal_statuses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_type` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_tasks_values` CHECK (((`target_value` > 0) and (`current_value` >= 0) and (`reward_coins` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `achievement_id` bigint unsigned NOT NULL,
  `unlocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_achievements` (`user_id`,`achievement_id`),
  KEY `fk_user_achievements_achievement` (`achievement_id`),
  CONSTRAINT `fk_user_achievements_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_achievements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_levels`
--

DROP TABLE IF EXISTS `user_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `level` smallint unsigned NOT NULL DEFAULT '1',
  `xp_total` int unsigned NOT NULL DEFAULT '0',
  `xp_next_level` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_levels_user` (`user_id`),
  CONSTRAINT `fk_user_levels_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_user_levels_level` CHECK ((`level` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `nickname` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `birth_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `onboarding_completed_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_active_last_login` (`is_active`,`last_login_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vault_transaction_types`
--

DROP TABLE IF EXISTS `vault_transaction_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vault_transaction_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vault_transaction_types_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vault_transactions`
--

DROP TABLE IF EXISTS `vault_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vault_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `transaction_type_id` bigint unsigned NOT NULL,
  `amount` bigint NOT NULL,
  `balance_after` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vault_transactions_user_created` (`user_id`,`created_at`),
  KEY `fk_vault_transactions_type` (`transaction_type_id`),
  CONSTRAINT `fk_vault_transactions_type` FOREIGN KEY (`transaction_type_id`) REFERENCES `vault_transaction_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_vault_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_vault_transactions_amount` CHECK ((`amount` <> 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vaults`
--

DROP TABLE IF EXISTS `vaults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaults` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `balance` bigint NOT NULL DEFAULT '0',
  `interest_rate` decimal(6,3) NOT NULL DEFAULT '2.000',
  `goal_amount` bigint DEFAULT NULL,
  `goal_due_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vaults_user` (`user_id`),
  CONSTRAINT `fk_vaults_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_vaults_balance` CHECK ((`balance` >= 0)),
  CONSTRAINT `ck_vaults_goal` CHECK (((`goal_amount` is null) or (`goal_amount` > 0))),
  CONSTRAINT `ck_vaults_rate` CHECK ((`interest_rate` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */; 
CREATE TABLE `wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `coins` bigint NOT NULL DEFAULT '0',
  `points_total` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallets_user` (`user_id`),
  CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_wallets_coins` CHECK ((`coins` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `xp_ledger`
--

DROP TABLE IF EXISTS `xp_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `xp_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `amount` int NOT NULL,
  `reason_id` bigint unsigned NOT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `balance_after` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_xp_ledger_user_created` (`user_id`,`created_at`),
  KEY `idx_xp_ledger_reference` (`reference_type`,`reference_id`),
  KEY `fk_xp_ledger_reason` (`reason_id`),
  CONSTRAINT `fk_xp_ledger_reason` FOREIGN KEY (`reason_id`) REFERENCES `reward_reasons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_xp_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_xp_ledger_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-15 14:24:41
