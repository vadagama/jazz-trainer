CREATE TABLE IF NOT EXISTS `lecture_likes` (
	`lecture_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`lecture_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lecture_likes_user_id_idx` ON `lecture_likes` (`user_id`);
