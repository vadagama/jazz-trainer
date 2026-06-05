ALTER TABLE `user_settings` ADD `rhodes_enabled` integer NOT NULL DEFAULT 0;
ALTER TABLE `user_settings` ADD `rhodes_volume` real NOT NULL DEFAULT 0.6;
ALTER TABLE `user_settings` ADD `rhodes_mode` text NOT NULL DEFAULT 'halfNotes';
ALTER TABLE `user_settings` ADD `rhodes_voicing_density` text NOT NULL DEFAULT 'rootless3';
