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
CREATE INDEX `grids_updated_at_idx` ON `harmony_grids` (`updated_at`);