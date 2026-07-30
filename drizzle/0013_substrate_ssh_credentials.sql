CREATE TABLE `ssh_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`label` text NOT NULL,
	`algorithm` text NOT NULL,
	`public_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ssh_credentials_fingerprint_unique` ON `ssh_credentials` (`fingerprint`);
--> statement-breakpoint
CREATE INDEX `ssh_credentials_owner_idx` ON `ssh_credentials` (`owner_email`);
--> statement-breakpoint
CREATE TABLE `ssh_session_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text,
	`credential_id` text,
	`connected_at` integer NOT NULL,
	`disconnected_at` integer,
	`remote_risk_hash` text,
	`client_version` text,
	`commands_read` integer DEFAULT 0 NOT NULL,
	`consequential_attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ssh_session_audits_owner_idx` ON `ssh_session_audits` (`owner_email`);
--> statement-breakpoint
CREATE INDEX `ssh_session_audits_connected_idx` ON `ssh_session_audits` (`connected_at`);
