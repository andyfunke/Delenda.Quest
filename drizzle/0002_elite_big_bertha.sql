CREATE TABLE `campaign_outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`outcome` text NOT NULL,
	`days` integer NOT NULL,
	`theater` text NOT NULL,
	`archetype` text NOT NULL,
	`adversary` text NOT NULL,
	`decisions` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_outcomes_outcome_idx` ON `campaign_outcomes` (`outcome`);--> statement-breakpoint
CREATE INDEX `campaign_outcomes_theater_idx` ON `campaign_outcomes` (`theater`);--> statement-breakpoint
CREATE TABLE `telemetry_counters` (
	`key` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`context` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `telemetry_counters_category_idx` ON `telemetry_counters` (`category`);--> statement-breakpoint
CREATE INDEX `telemetry_counters_subject_idx` ON `telemetry_counters` (`subject`);