ALTER TABLE `user_settings` ADD `drum_kit` text NOT NULL DEFAULT 'jazz-kit';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_tom_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_tom_volume` real NOT NULL DEFAULT 0.7;
