ALTER TABLE `user_settings` DROP COLUMN `piano_upper_structures`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `piano_passing_chords`;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_tension` text DEFAULT 'clean';
