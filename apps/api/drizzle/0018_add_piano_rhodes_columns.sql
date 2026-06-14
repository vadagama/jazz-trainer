ALTER TABLE `user_settings` ADD `rhodes_layer_mode` text NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `rhodes_layer_volume` real NOT NULL DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_enabled` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_volume` real NOT NULL DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_profile` text NOT NULL DEFAULT 'swing-sparse';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_voicing_density` text NOT NULL DEFAULT 'rootless3';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_sample_library` text NOT NULL DEFAULT 'salamander';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `piano_randomization_level` text NOT NULL DEFAULT 'off';
