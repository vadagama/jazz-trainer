CREATE TABLE IF NOT EXISTS `audit_log` (
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
CREATE TABLE IF NOT EXISTS `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`roles` text,
	`user_ids` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `permissions_code_unique` ON `permissions` (`code`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`role_id` text NOT NULL,
	`permission_code` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission_code`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_permissions` (
	`user_id` text NOT NULL,
	`permission_code` text NOT NULL,
	`granted` integer NOT NULL,
	PRIMARY KEY(`user_id`, `permission_code`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'active' NOT NULL;