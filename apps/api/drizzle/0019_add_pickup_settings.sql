ALTER TABLE `user_settings` ADD `pickup_enabled` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `pickup_sound` text DEFAULT 'drum-stick';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `pickup_bars` integer NOT NULL DEFAULT 0;
