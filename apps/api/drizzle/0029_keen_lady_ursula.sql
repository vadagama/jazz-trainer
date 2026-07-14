CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`before` text,
	`after` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`ip` text,
	`user_agent` text,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`roles` text,
	`user_ids` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grid_likes` (
	`grid_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`grid_id`, `user_id`),
	FOREIGN KEY (`grid_id`) REFERENCES `harmony_grids`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `grid_likes_user_id_idx` ON `grid_likes` (`user_id`);--> statement-breakpoint
CREATE TABLE `harmony_grids` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`time_signature` text DEFAULT '4/4' NOT NULL,
	`key` text DEFAULT 'C' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`content` text NOT NULL,
	`source_grid_id` text,
	`like_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `grids_user_id_idx` ON `harmony_grids` (`user_id`);--> statement-breakpoint
CREATE INDEX `grids_visibility_idx` ON `harmony_grids` (`visibility`);--> statement-breakpoint
CREATE INDEX `grids_updated_at_idx` ON `harmony_grids` (`updated_at`);--> statement-breakpoint
CREATE TABLE `lecture_likes` (
	`lecture_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`lecture_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lecture_likes_user_id_idx` ON `lecture_likes` (`user_id`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_code_unique` ON `permissions` (`code`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_code` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_code`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`user_id` text NOT NULL,
	`permission_code` text NOT NULL,
	`granted` integer NOT NULL,
	PRIMARY KEY(`user_id`, `permission_code`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bpm` integer DEFAULT 120 NOT NULL,
	`click_strong` text DEFAULT 'drum-stick',
	`click_strong_2` text DEFAULT 'drum-stick',
	`click_weak` text DEFAULT 'drum-stick',
	`volume` real DEFAULT 0.8 NOT NULL,
	`count_in` integer DEFAULT 1 NOT NULL,
	`metronome_enabled` integer DEFAULT true NOT NULL,
	`metronome_volume` real DEFAULT 0.8 NOT NULL,
	`metronome_mode` text DEFAULT 'both' NOT NULL,
	`metronome_strong_enabled` integer DEFAULT true NOT NULL,
	`metronome_strong_volume` real DEFAULT 0.8 NOT NULL,
	`metronome_strong2_enabled` integer DEFAULT true NOT NULL,
	`metronome_strong2_volume` real DEFAULT 0.8 NOT NULL,
	`metronome_weak_enabled` integer DEFAULT true NOT NULL,
	`metronome_weak_volume` real DEFAULT 0.8 NOT NULL,
	`bass_enabled` integer DEFAULT true NOT NULL,
	`bass_volume` real DEFAULT 0.7 NOT NULL,
	`bass_complexity` integer DEFAULT 1 NOT NULL,
	`bass_octave_up` integer DEFAULT false NOT NULL,
	`bass_variant` text,
	`bass_tension` text DEFAULT 'clean',
	`bass_humanize` text,
	`bass_use_muted_notes` integer DEFAULT true NOT NULL,
	`rhodes_enabled` integer DEFAULT false NOT NULL,
	`rhodes_volume` real DEFAULT 0.6 NOT NULL,
	`rhodes_mode` text DEFAULT 'halfNotes' NOT NULL,
	`rhodes_voicing_density` text DEFAULT 'rootless3' NOT NULL,
	`rhodes_layer_mode` text DEFAULT 'none' NOT NULL,
	`rhodes_layer_volume` real DEFAULT 0.5 NOT NULL,
	`piano_enabled` integer DEFAULT false NOT NULL,
	`piano_volume` real DEFAULT 0.7 NOT NULL,
	`piano_profile` text DEFAULT 'swing-sparse' NOT NULL,
	`piano_voicing_density` text DEFAULT 'rootless3' NOT NULL,
	`piano_sample_library` text DEFAULT 'salamander' NOT NULL,
	`piano_tension` text DEFAULT 'clean',
	`piano_humanize` text,
	`drums_enabled` integer DEFAULT true NOT NULL,
	`drums_volume` real DEFAULT 0.7 NOT NULL,
	`drum_kit` text DEFAULT 'jazz-drum-kit' NOT NULL,
	`style` text DEFAULT 'swing' NOT NULL,
	`per_style_overrides` text,
	`swing_ratio` real DEFAULT 0.5 NOT NULL,
	`audio_format` text DEFAULT 'aac' NOT NULL,
	`practice_cards` text,
	`midi_device_id` text,
	`midi_channel` integer,
	`solo_tone_id` text DEFAULT 'rhodes-jrhodes3c',
	`solo_volume` real,
	`ducking_enabled` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_provider_provider_id` ON `users` (`provider`,`provider_id`);