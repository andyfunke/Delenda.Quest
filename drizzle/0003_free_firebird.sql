CREATE TABLE `campaign_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`public_slug` text NOT NULL,
	`pseudonym` text NOT NULL,
	`campaign_key` text NOT NULL,
	`campaign_id` text NOT NULL,
	`campaign_seed` integer NOT NULL,
	`theater` text NOT NULL,
	`archetype` text NOT NULL,
	`adversary` text NOT NULL,
	`content_version` text NOT NULL,
	`scoring_version` text NOT NULL,
	`outcome` text NOT NULL,
	`days` integer NOT NULL,
	`campaign_score` integer NOT NULL,
	`base_uberscore` integer NOT NULL,
	`friend_count` integer NOT NULL,
	`friend_multiplier` integer NOT NULL,
	`uberscore_earned` integer NOT NULL,
	`force_preserved` integer NOT NULL,
	`front_millimeters` integer NOT NULL,
	`decisions` text NOT NULL,
	`completed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_records_public_slug_unique` ON `campaign_records` (`public_slug`);--> statement-breakpoint
CREATE INDEX `campaign_records_owner_idx` ON `campaign_records` (`owner_email`);--> statement-breakpoint
CREATE INDEX `campaign_records_campaign_idx` ON `campaign_records` (`campaign_key`);--> statement-breakpoint
CREATE INDEX `campaign_records_score_idx` ON `campaign_records` (`campaign_score`);