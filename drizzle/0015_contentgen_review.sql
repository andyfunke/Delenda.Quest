CREATE TABLE `contentgen_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`medium` text NOT NULL,
	`source_version` text NOT NULL,
	`policy_version` text,
	`seed` integer NOT NULL,
	`manifest_hash` text NOT NULL,
	`status` text NOT NULL,
	`creator_receipt_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contentgen_batches_status_idx` ON `contentgen_batches` (`status`);
--> statement-breakpoint
CREATE TABLE `contentgen_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`compile_status` text NOT NULL,
	`disposition` text,
	`disposition_terminal` integer NOT NULL DEFAULT 0,
	`tags_json` text NOT NULL,
	`queue_rank` integer NOT NULL DEFAULT 0,
	`revision` integer NOT NULL DEFAULT 1,
	`parent_candidate_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contentgen_candidates_batch_idx` ON `contentgen_candidates` (`batch_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `contentgen_candidates_batch_hash_unique` ON `contentgen_candidates` (`batch_id`,`payload_hash`);
--> statement-breakpoint
CREATE TABLE `contentgen_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`disposition` text NOT NULL,
	`reason_codes_json` text NOT NULL,
	`notes` text,
	`reviewer_receipt_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`supersedes_review_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contentgen_reviews_idempotency_unique` ON `contentgen_reviews` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `contentgen_reviews_candidate_idx` ON `contentgen_reviews` (`candidate_id`);
--> statement-breakpoint
CREATE TABLE `contentgen_ai_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`checklist_json` text NOT NULL,
	`prompt_hash` text NOT NULL,
	`response_hash` text NOT NULL,
	`provider_id` text,
	`model_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contentgen_ai_evidence_candidate_idx` ON `contentgen_ai_evidence` (`candidate_id`);
--> statement-breakpoint
CREATE TABLE `contentgen_policy_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`corpus_version` text NOT NULL,
	`input_hash` text NOT NULL,
	`output_hash` text NOT NULL,
	`evaluation_status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contentgen_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`artifact_hash` text NOT NULL,
	`redaction_receipt_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contentgen_exports_batch_idx` ON `contentgen_exports` (`batch_id`);
