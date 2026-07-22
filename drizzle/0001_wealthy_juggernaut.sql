CREATE TABLE `campaign_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`access` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_packs_owner_idx` ON `campaign_packs` (`owner_email`);--> statement-breakpoint
CREATE INDEX `campaign_packs_access_idx` ON `campaign_packs` (`access`);--> statement-breakpoint
ALTER TABLE `users` ADD `allow_friends` integer DEFAULT true NOT NULL;