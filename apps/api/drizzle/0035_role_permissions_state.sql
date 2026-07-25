-- Merge feature_role_state into role_permissions.state (single permission table,
-- FEATURES-VISION.md §4). Existing rows keep 'active' (they were plain grants);
-- feature_role_state rows are migrated per role, then the table is dropped.
ALTER TABLE `role_permissions` ADD COLUMN `state` text NOT NULL DEFAULT 'active';
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_code`, `state`)
SELECT r.`id`, frs.`feature_code`, frs.`state`
FROM `feature_role_state` frs
JOIN `roles` r ON r.`name` = frs.`role_name`
JOIN `permissions` p ON p.`code` = frs.`feature_code`
WHERE frs.`state` IN ('active', 'inactive')
ON CONFLICT(`role_id`, `permission_code`) DO UPDATE SET `state` = excluded.`state`;
--> statement-breakpoint
DROP TABLE IF EXISTS `feature_role_state`;
