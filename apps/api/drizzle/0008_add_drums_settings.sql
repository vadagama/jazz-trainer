ALTER TABLE `user_settings` ADD `drums_enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_volume` real NOT NULL DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ride_enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ride_volume` real NOT NULL DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_stir_enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_stir_volume` real NOT NULL DEFAULT 0.6;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_hihat_enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_hihat_volume` real NOT NULL DEFAULT 0.55;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ride_pattern` text NOT NULL DEFAULT 'swingRide';
