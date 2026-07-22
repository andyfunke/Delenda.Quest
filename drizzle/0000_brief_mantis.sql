CREATE TABLE `friend_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_email` text NOT NULL,
	`invitee_email` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`accepted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_invites_pair_unique` ON `friend_invites` (`inviter_email`,`invitee_email`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_pair_unique` ON `friendships` (`user_a`,`user_b`);--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
