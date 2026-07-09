ALTER TABLE `user_settings` ADD `metronome_mode` text NOT NULL DEFAULT 'both';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_strong_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_strong_volume` real NOT NULL DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_strong2_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_strong2_volume` real NOT NULL DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_weak_enabled` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `metronome_weak_volume` real NOT NULL DEFAULT 0.8;
