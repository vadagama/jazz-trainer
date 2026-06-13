ALTER TABLE `user_settings` ADD `drums_hihat_openness` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_bass_drum_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_bass_drum_volume` real NOT NULL DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_snare_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_snare_volume` real NOT NULL DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_volume` real NOT NULL DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_frequency` integer NOT NULL DEFAULT 4;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_rim_enabled` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_rim_volume` real NOT NULL DEFAULT 0.6;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_pattern` text NOT NULL DEFAULT 'swing';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_humanize_intensity` text NOT NULL DEFAULT 'med';
