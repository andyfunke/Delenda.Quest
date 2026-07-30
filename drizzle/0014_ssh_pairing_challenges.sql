CREATE TABLE `ssh_pairing_challenges` (
  `code` text PRIMARY KEY NOT NULL,
  `fingerprint` text NOT NULL,
  `algorithm` text NOT NULL,
  `public_key` text NOT NULL,
  `owner_email` text,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `completed_at` integer,
  `consumed_at` integer
);
--> statement-breakpoint
CREATE INDEX `ssh_pairing_fingerprint_idx` ON `ssh_pairing_challenges` (`fingerprint`);
--> statement-breakpoint
CREATE INDEX `ssh_pairing_owner_idx` ON `ssh_pairing_challenges` (`owner_email`);
--> statement-breakpoint
CREATE INDEX `ssh_pairing_expires_idx` ON `ssh_pairing_challenges` (`expires_at`);
