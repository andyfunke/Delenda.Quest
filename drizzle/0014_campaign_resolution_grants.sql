CREATE TABLE `campaign_resolution_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`account_day_key` text NOT NULL,
	`campaign_id` text NOT NULL,
	`campaign_day` integer NOT NULL,
	`campaign_revision` integer NOT NULL,
	`campaign_state_seal` text NOT NULL,
	`opportunity_fraction_ppm` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`consumed_at` integer,
	`invalidated_at` integer
);
--> statement-breakpoint
CREATE INDEX `campaign_resolution_grants_owner_day_idx` ON `campaign_resolution_grants` (`owner_email`,`account_day_key`);
--> statement-breakpoint
CREATE INDEX `campaign_resolution_grants_campaign_idx` ON `campaign_resolution_grants` (`owner_email`,`campaign_id`,`campaign_revision`);
--> statement-breakpoint
CREATE INDEX `campaign_resolution_grants_expiry_idx` ON `campaign_resolution_grants` (`expires_at`);
--> statement-breakpoint
ALTER TABLE `active_campaigns` ADD `last_resolution_grant_marker` text;
