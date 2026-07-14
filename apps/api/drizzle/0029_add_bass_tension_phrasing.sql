ALTER TABLE `user_settings` ADD `bass_variant` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bass_tension` text DEFAULT 'clean';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bass_humanize` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `bass_use_muted_notes` integer DEFAULT true;
