-- Feature access tables (FEATURES-VISION.md §4): feature_access + feature_role_state.
-- IF NOT EXISTS: dev databases previously created by the runtime ensureTables()
-- safety net already have these tables. user_roles is re-declared here because
-- 0032_add_user_roles.sql was never registered in the migration journal.
CREATE TABLE IF NOT EXISTS `feature_access` (
  `feature_code` text PRIMARY KEY NOT NULL,
  `state` text NOT NULL DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `feature_role_state` (
  `feature_code` text NOT NULL,
  `role_name` text NOT NULL,
  `state` text NOT NULL DEFAULT 'hidden',
  PRIMARY KEY(`feature_code`, `role_name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `role_id` text NOT NULL REFERENCES `roles`(`id`) ON DELETE CASCADE,
  PRIMARY KEY(`user_id`, `role_id`)
);
