-- Feature flag management (FEATURES-VISION.md §4.2): add metadata + targeting columns
ALTER TABLE `feature_flags` ADD COLUMN `description` text;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `category` text;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `rollout_percent` integer;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `expires_at` integer;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `created_by` text;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `updated_at` integer;
--> statement-breakpoint
ALTER TABLE `feature_flags` ADD COLUMN `updated_by` text;
--> statement-breakpoint
-- Backfill updated_at for existing rows (unix seconds → ms to match Date.now())
UPDATE `feature_flags` SET `updated_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE `updated_at` IS NULL;
