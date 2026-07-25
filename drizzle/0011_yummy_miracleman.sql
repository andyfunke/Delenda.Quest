ALTER TABLE `users` ADD `time_zone_configured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pending_time_zone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `time_zone_effective_at` integer;