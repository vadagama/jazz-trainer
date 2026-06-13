ALTER TABLE `user_settings` ADD `drums_randomization_level` text NOT NULL DEFAULT 'off';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_fill_complexity` text NOT NULL DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ride_variation` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_snare_ghosts` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_bass_drum_variation` integer NOT NULL DEFAULT 1;
