-- Phase 2 Schema Migration (AUTH-PLAN §2, T-006–T-012)
-- T-006: users — add email_verified, deleted_at, providers
-- T-007: sessions — add device_name, ip, fingerprint, last_used_at
-- T-008: user_settings / default_settings — add theme
-- T-009: magic_links table
-- T-010: subscription_tiers, subscriptions, payment_history tables
-- T-011: exercise_progress, exercise_results, theory_progress, user_stats tables
-- T-012: consent_records table

-- ── T-006: users ──────────────────────────────────────────────────────────
ALTER TABLE `users` ADD COLUMN `email_verified` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `deleted_at` integer;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `providers` text NOT NULL DEFAULT '[]';

-- ── T-007: sessions ──────────────────────────────────────────────────────
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `device_name` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `ip` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `fingerprint` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `last_used_at` integer;

-- ── T-008: theme ─────────────────────────────────────────────────────────
--> statement-breakpoint
ALTER TABLE `user_settings` ADD COLUMN `theme` text NOT NULL DEFAULT 'dark';
--> statement-breakpoint
ALTER TABLE `default_settings` ADD COLUMN `theme` text NOT NULL DEFAULT 'dark';

-- ── T-009: magic_links ────────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE `magic_links` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `token_hash` text NOT NULL,
  `used` integer NOT NULL DEFAULT false,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `magic_links_email_idx` ON `magic_links` (`email`);
--> statement-breakpoint
CREATE INDEX `magic_links_token_hash_idx` ON `magic_links` (`token_hash`);

-- ── T-010: subscriptions ─────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE `subscription_tiers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `stripe_price_id` text,
  `role_name` text NOT NULL,
  `permissions` text NOT NULL DEFAULT '[]',
  `monthly_price_cents` integer,
  `features` text NOT NULL DEFAULT '[]',
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `stripe_subscription_id` text,
  `stripe_customer_id` text,
  `tier_id` text NOT NULL REFERENCES `subscription_tiers`(`id`),
  `status` text NOT NULL,
  `current_period_start` integer,
  `current_period_end` integer,
  `grace_period_ends` integer,
  `canceled_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_id_idx` ON `subscriptions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_sub_id_idx` ON `subscriptions` (`stripe_subscription_id`);
--> statement-breakpoint
CREATE TABLE `payment_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `stripe_event_id` text NOT NULL,
  `event_type` text NOT NULL,
  `amount_cents` integer,
  `currency` text,
  `status` text,
  `metadata` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_history_user_id_idx` ON `payment_history` (`user_id`);

-- ── T-011: progress & stats ──────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE `exercise_progress` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `exercise_type` text NOT NULL,
  `sub_type` text,
  `attempts` integer NOT NULL DEFAULT 0,
  `best_score` real,
  `last_score` real,
  `last_practiced_at` integer,
  PRIMARY KEY (`user_id`, `exercise_type`, `sub_type`)
);
--> statement-breakpoint
CREATE INDEX `exercise_progress_user_idx` ON `exercise_progress` (`user_id`);
--> statement-breakpoint
CREATE TABLE `exercise_results` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `exercise_type` text NOT NULL,
  `sub_type` text,
  `config` text NOT NULL DEFAULT '{}',
  `score` real,
  `completed` integer NOT NULL DEFAULT false,
  `duration_ms` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercise_results_user_idx` ON `exercise_results` (`user_id`);
--> statement-breakpoint
CREATE TABLE `theory_progress` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `lecture_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'not_started',
  `progress_percent` integer NOT NULL DEFAULT 0,
  `completed_at` integer,
  PRIMARY KEY (`user_id`, `lecture_id`)
);
--> statement-breakpoint
CREATE INDEX `theory_progress_user_idx` ON `theory_progress` (`user_id`);
--> statement-breakpoint
CREATE TABLE `user_stats` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `current_streak` integer NOT NULL DEFAULT 0,
  `longest_streak` integer NOT NULL DEFAULT 0,
  `last_practice_date` text,
  `total_practice_time_ms` integer NOT NULL DEFAULT 0,
  `total_exercises_completed` integer NOT NULL DEFAULT 0,
  `total_theory_completed` integer NOT NULL DEFAULT 0
);

-- ── T-012: consent_records ────────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE `consent_records` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `consent_type` text NOT NULL,
  `granted` integer NOT NULL DEFAULT false,
  `ip` text,
  `user_agent` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `consent_records_user_idx` ON `consent_records` (`user_id`);
