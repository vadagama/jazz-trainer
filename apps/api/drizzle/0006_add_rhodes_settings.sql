ALTER TABLE `user_settings` ADD `rhodes_enabled` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `rhodes_volume` real NOT NULL DEFAULT 0.6;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `rhodes_mode` text NOT NULL DEFAULT 'halfNotes';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `rhodes_voicing_density` text NOT NULL DEFAULT 'rootless3';
