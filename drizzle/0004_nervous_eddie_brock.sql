CREATE TABLE `account_rotation_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text NOT NULL,
	`status` text NOT NULL,
	`context` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_rotation_owner_kind_item_unique` ON `account_rotation_ledger` (`owner_email`,`kind`,`item_id`);--> statement-breakpoint
CREATE INDEX `account_rotation_owner_kind_idx` ON `account_rotation_ledger` (`owner_email`,`kind`);