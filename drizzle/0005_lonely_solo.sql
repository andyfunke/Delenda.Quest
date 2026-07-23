CREATE TABLE `bug_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`route` text NOT NULL,
	`element_key` text NOT NULL,
	`element_text` text NOT NULL,
	`grid_x` integer NOT NULL,
	`grid_y` integer NOT NULL,
	`module` text NOT NULL,
	`interface_mode` text NOT NULL,
	`report_text` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bug_reports_status_idx` ON `bug_reports` (`status`);--> statement-breakpoint
CREATE INDEX `bug_reports_route_idx` ON `bug_reports` (`route`);--> statement-breakpoint
ALTER TABLE `users` ADD `alias` text;--> statement-breakpoint
ALTER TABLE `users` ADD `alias_changed_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `account_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `social_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `telemetry_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `alias_rename_unlocked` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_alias_unique` ON `users` (`alias`);