-- Phase 13: super_admin Security Hardening (AUTH-PLAN §13, T-038–T-043)
-- T-038: totp_secrets table for TOTP 2FA
-- T-038/T-043: totp_verified + totp_verified_at columns on sessions

-- ── T-038: totp_secrets ──────────────────────────────────────────────────────
CREATE TABLE `totp_secrets` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `secret` text NOT NULL,
  `enabled` integer NOT NULL DEFAULT false,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

-- ── T-038/T-043: sessions — TOTP verification columns ───────────────────────
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `totp_verified` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `totp_verified_at` integer;
