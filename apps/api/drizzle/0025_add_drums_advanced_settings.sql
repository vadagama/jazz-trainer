ALTER TABLE `user_settings` ADD `drums_use_pattern_engine` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ghost_style` text NOT NULL DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ghost_intensity` real NOT NULL DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_cell_randomization` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_section_shuffle` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_ghost_mute` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_fills_mute` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_mute` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_type` text NOT NULL DEFAULT 'crash';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_crash_on_form_start` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `drums_pre_crash_fill` integer NOT NULL DEFAULT 1;
