-- Combined: rename grids→compositions + catalog columns + catalog_tags table (§12, §2.5)
ALTER TABLE harmony_grids RENAME TO harmony_compositions;
--> statement-breakpoint
ALTER TABLE grid_likes RENAME TO composition_likes;
--> statement-breakpoint
ALTER TABLE harmony_compositions RENAME COLUMN source_grid_id TO source_composition_id;
--> statement-breakpoint
ALTER TABLE composition_likes RENAME COLUMN grid_id TO composition_id;
--> statement-breakpoint
DROP INDEX IF EXISTS grids_user_id_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS grids_visibility_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS grids_updated_at_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS grid_likes_user_id_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS compositions_user_id_idx ON harmony_compositions(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS compositions_visibility_idx ON harmony_compositions(visibility);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS compositions_updated_at_idx ON harmony_compositions(updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS composition_likes_user_id_idx ON composition_likes(user_id);
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN description TEXT;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'intermediate';
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN author TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN recommended_style TEXT;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN recommended_tempo INTEGER;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN catalog_published_at INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN copy_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN featured_order INTEGER;
--> statement-breakpoint
ALTER TABLE harmony_compositions ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'approved';
--> statement-breakpoint
UPDATE harmony_compositions SET catalog_published_at = created_at;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_author ON harmony_compositions(author);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_difficulty ON harmony_compositions(difficulty);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_recommended_style ON harmony_compositions(recommended_style);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_featured ON harmony_compositions(featured);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_moderation_status ON harmony_compositions(moderation_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_compositions_catalog_published_at ON harmony_compositions(catalog_published_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS catalog_tags (
	id text PRIMARY KEY NOT NULL,
	value text NOT NULL,
	category text NOT NULL,
	description text,
	hidden integer DEFAULT 0 NOT NULL,
	created_at integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS catalog_tags_value_unique ON catalog_tags(value);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_catalog_tags_category ON catalog_tags(category);
