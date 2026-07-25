CREATE TABLE `account_turn_state` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`god_mode` integer DEFAULT false NOT NULL,
	`last_resolved_day_key` text,
	`updated_at` integer NOT NULL
);
