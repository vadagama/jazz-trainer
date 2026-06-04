PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bpm` integer DEFAULT 120 NOT NULL,
	`click_strong` text DEFAULT 'drum-stick',
	`click_strong_2` text DEFAULT 'drum-stick',
	`click_weak` text DEFAULT 'drum-stick',
	`volume` real DEFAULT 0.8 NOT NULL,
	`count_in` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_settings`("user_id", "bpm", "click_strong", "click_weak", "volume", "count_in", "created_at", "updated_at") SELECT "user_id", "bpm", "click_strong", "click_weak", "volume", "count_in", "created_at", "updated_at" FROM `user_settings`;--> statement-breakpoint
DROP TABLE `user_settings`;--> statement-breakpoint
ALTER TABLE `__new_user_settings` RENAME TO `user_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;