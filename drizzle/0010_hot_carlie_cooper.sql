CREATE TABLE `active_campaigns` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`run_token` text NOT NULL,
	`state` text NOT NULL,
	`clock_start` integer NOT NULL,
	`clock_end` integer NOT NULL,
	`multiplayer_run` integer DEFAULT false NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `active_campaigns_campaign_idx` ON `active_campaigns` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `active_campaigns_updated_idx` ON `active_campaigns` (`updated_at`);