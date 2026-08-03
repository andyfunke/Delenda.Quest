import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users=sqliteTable("users",{
  email:text("email").primaryKey(),
  displayName:text("display_name").notNull(),
  alias:text("alias"),
  aliasChangedAt:integer("alias_changed_at").notNull().default(0),
  timeZone:text("time_zone").notNull().default("UTC"),
  timeZoneConfigured:integer("time_zone_configured",{mode:"boolean"}).notNull().default(false),
  pendingTimeZone:text("pending_time_zone"),
  timeZoneEffectiveAt:integer("time_zone_effective_at"),
  allowFriends:integer("allow_friends",{mode:"boolean"}).notNull().default(true),
  accountEnabled:integer("account_enabled",{mode:"boolean"}).notNull().default(true),
  socialEnabled:integer("social_enabled",{mode:"boolean"}).notNull().default(true),
  telemetryEnabled:integer("telemetry_enabled",{mode:"boolean"}).notNull().default(true),
  aliasRenameUnlocked:integer("alias_rename_unlocked",{mode:"boolean"}).notNull().default(false),
  createdAt:integer("created_at").notNull(),
  lastSeenAt:integer("last_seen_at").notNull(),
},table=>[uniqueIndex("users_alias_unique").on(table.alias)]);

export const accountTurnState=sqliteTable("account_turn_state",{
  ownerEmail:text("owner_email").primaryKey(),
  godMode:integer("god_mode",{mode:"boolean"}).notNull().default(false),
  lastResolvedDayKey:text("last_resolved_day_key"),
  nextTurnAt:integer("next_turn_at"),
  updatedAt:integer("updated_at").notNull(),
});

export const activeCampaigns=sqliteTable("active_campaigns",{
  ownerEmail:text("owner_email").primaryKey(),
  campaignId:text("campaign_id").notNull(),
  runToken:text("run_token").notNull(),
  state:text("state").notNull(),
  clockStart:integer("clock_start").notNull(),
  clockEnd:integer("clock_end").notNull(),
  multiplayerRun:integer("multiplayer_run",{mode:"boolean"}).notNull().default(false),
  revision:integer("revision").notNull().default(1),
  lastResolutionGrantMarker:text("last_resolution_grant_marker"),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull(),
},table=>[
  index("active_campaigns_campaign_idx").on(table.campaignId),
  index("active_campaigns_updated_idx").on(table.updatedAt),
]);

export const campaignResolutionGrants=sqliteTable("campaign_resolution_grants",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email").notNull(),
  accountDayKey:text("account_day_key").notNull(),
  campaignId:text("campaign_id").notNull(),
  campaignDay:integer("campaign_day").notNull(),
  campaignRevision:integer("campaign_revision").notNull(),
  campaignStateSeal:text("campaign_state_seal").notNull(),
  opportunityFractionPpm:integer("opportunity_fraction_ppm").notNull(),
  expiresAt:integer("expires_at").notNull(),
  createdAt:integer("created_at").notNull(),
  consumedAt:integer("consumed_at"),
  invalidatedAt:integer("invalidated_at"),
},table=>[
  index("campaign_resolution_grants_owner_day_idx").on(
    table.ownerEmail,
    table.accountDayKey,
  ),
  index("campaign_resolution_grants_campaign_idx").on(
    table.ownerEmail,
    table.campaignId,
    table.campaignRevision,
  ),
  index("campaign_resolution_grants_expiry_idx").on(table.expiresAt),
]);

export const campaignRecords=sqliteTable("campaign_records",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email").notNull(),
  publicSlug:text("public_slug").notNull(),
  pseudonym:text("pseudonym").notNull(),
  campaignKey:text("campaign_key").notNull(),
  campaignId:text("campaign_id").notNull(),
  campaignSeed:integer("campaign_seed").notNull(),
  theater:text("theater").notNull(),
  archetype:text("archetype").notNull(),
  adversary:text("adversary").notNull(),
  contentVersion:text("content_version").notNull(),
  scoringVersion:text("scoring_version").notNull(),
  outcome:text("outcome",{enum:["victory","defeat","abandoned"]}).notNull(),
  days:integer("days").notNull(),
  campaignScore:integer("campaign_score").notNull(),
  scoreBreakdown:text("score_breakdown").notNull().default("{}"),
  baseUberscore:integer("base_uberscore").notNull(),
  friendCount:integer("friend_count").notNull(),
  friendMultiplier:integer("friend_multiplier").notNull(),
  uberscoreEarned:integer("uberscore_earned").notNull(),
  forcePreserved:integer("force_preserved").notNull(),
  frontMillimeters:integer("front_millimeters").notNull(),
  publicGeo:text("public_geo").notNull().default("LOCATION UNAVAILABLE"),
  decisions:text("decisions").notNull(),
  completedAt:integer("completed_at").notNull(),
},table=>[
  uniqueIndex("campaign_records_public_slug_unique").on(table.publicSlug),
  index("campaign_records_owner_idx").on(table.ownerEmail),
  index("campaign_records_campaign_idx").on(table.campaignKey),
  index("campaign_records_score_idx").on(table.campaignScore),
]);

export const friendships=sqliteTable("friendships",{
  id:text("id").primaryKey(),
  userA:text("user_a").notNull(),
  userB:text("user_b").notNull(),
  createdAt:integer("created_at").notNull(),
},table=>[uniqueIndex("friendships_pair_unique").on(table.userA,table.userB)]);

export const friendInvites=sqliteTable("friend_invites",{
  id:text("id").primaryKey(),
  inviterEmail:text("inviter_email").notNull(),
  inviteeEmail:text("invitee_email").notNull(),
  status:text("status",{enum:["pending","accepted"]}).notNull(),
  createdAt:integer("created_at").notNull(),
  acceptedAt:integer("accepted_at"),
},table=>[uniqueIndex("friend_invites_pair_unique").on(table.inviterEmail,table.inviteeEmail)]);

export const campaignPacks=sqliteTable("campaign_packs",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email").notNull(),
  title:text("title").notNull(),
  access:text("access",{enum:["private","friends"]}).notNull(),
  payload:text("payload").notNull(),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull(),
},table=>[
  index("campaign_packs_owner_idx").on(table.ownerEmail),
  index("campaign_packs_access_idx").on(table.access),
]);

export const telemetryCounters=sqliteTable("telemetry_counters",{
  key:text("key").primaryKey(),
  category:text("category",{enum:["page_view","element_interaction","ava_command","module_dwell","module_switch"]}).notNull(),
  subject:text("subject").notNull(),
  context:text("context").notNull(),
  count:integer("count").notNull().default(0),
  updatedAt:integer("updated_at").notNull(),
},table=>[
  index("telemetry_counters_category_idx").on(table.category),
  index("telemetry_counters_subject_idx").on(table.subject),
]);

export const bugReports=sqliteTable("bug_reports",{
  id:text("id").primaryKey(),
  route:text("route").notNull(),
  elementKey:text("element_key").notNull(),
  elementText:text("element_text").notNull(),
  gridX:integer("grid_x").notNull(),
  gridY:integer("grid_y").notNull(),
  module:text("module").notNull(),
  interfaceMode:text("interface_mode").notNull(),
  reportText:text("report_text").notNull(),
  status:text("status",{enum:["open","reviewed","closed"]}).notNull().default("open"),
  createdAt:integer("created_at").notNull(),
},table=>[
  index("bug_reports_status_idx").on(table.status),
  index("bug_reports_route_idx").on(table.route),
]);

export const campaignOutcomes=sqliteTable("campaign_outcomes",{
  id:text("id").primaryKey(),
  outcome:text("outcome",{enum:["victory","defeat"]}).notNull(),
  days:integer("days").notNull(),
  theater:text("theater").notNull(),
  archetype:text("archetype").notNull(),
  adversary:text("adversary").notNull(),
  decisions:text("decisions").notNull(),
  createdAt:integer("created_at").notNull(),
},table=>[
  index("campaign_outcomes_outcome_idx").on(table.outcome),
  index("campaign_outcomes_theater_idx").on(table.theater),
]);

export const accountRotationLedger=sqliteTable("account_rotation_ledger",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email").notNull(),
  kind:text("kind",{enum:["opportunity","aphorism"]}).notNull(),
  itemId:text("item_id").notNull(),
  status:text("status").notNull(),
  context:text("context").notNull(),
  firstSeenAt:integer("first_seen_at").notNull(),
  updatedAt:integer("updated_at").notNull(),
},table=>[
  uniqueIndex("account_rotation_owner_kind_item_unique").on(table.ownerEmail,table.kind,table.itemId),
  index("account_rotation_owner_kind_idx").on(table.ownerEmail,table.kind),
]);

/** Player-managed SSH public keys. UI revocation can land later; service layer is authoritative. */
export const sshCredentials=sqliteTable("ssh_credentials",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email").notNull(),
  label:text("label").notNull(),
  algorithm:text("algorithm").notNull(),
  publicKey:text("public_key").notNull(),
  fingerprint:text("fingerprint").notNull(),
  createdAt:integer("created_at").notNull(),
  lastUsedAt:integer("last_used_at"),
  revokedAt:integer("revoked_at"),
},table=>[
  uniqueIndex("ssh_credentials_fingerprint_unique").on(table.fingerprint),
  index("ssh_credentials_owner_idx").on(table.ownerEmail),
]);

export const sshSessionAudits=sqliteTable("ssh_session_audits",{
  id:text("id").primaryKey(),
  ownerEmail:text("owner_email"),
  credentialId:text("credential_id"),
  connectedAt:integer("connected_at").notNull(),
  disconnectedAt:integer("disconnected_at"),
  remoteRiskHash:text("remote_risk_hash"),
  clientVersion:text("client_version"),
  commandsRead:integer("commands_read").notNull().default(0),
  consequentialAttempts:integer("consequential_attempts").notNull().default(0),
},table=>[
  index("ssh_session_audits_owner_idx").on(table.ownerEmail),
  index("ssh_session_audits_connected_idx").on(table.connectedAt),
]);

/** Contentgen Lab persistence — staging/review only; not runtime content authority. */
export const contentgenBatches=sqliteTable("contentgen_batches",{
  id:text("id").primaryKey(),
  medium:text("medium").notNull(),
  sourceVersion:text("source_version").notNull(),
  policyVersion:text("policy_version"),
  seed:integer("seed").notNull(),
  manifestHash:text("manifest_hash").notNull(),
  status:text("status").notNull(),
  creatorReceiptId:text("creator_receipt_id").notNull(),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull(),
},table=>[index("contentgen_batches_status_idx").on(table.status)]);

export const contentgenCandidates=sqliteTable("contentgen_candidates",{
  id:text("id").primaryKey(),
  batchId:text("batch_id").notNull(),
  payloadJson:text("payload_json").notNull(),
  payloadHash:text("payload_hash").notNull(),
  compileStatus:text("compile_status").notNull(),
  disposition:text("disposition"),
  dispositionTerminal:integer("disposition_terminal",{mode:"boolean"}).notNull().default(false),
  tagsJson:text("tags_json").notNull(),
  queueRank:integer("queue_rank").notNull().default(0),
  revision:integer("revision").notNull().default(1),
  parentCandidateId:text("parent_candidate_id"),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull(),
},table=>[
  index("contentgen_candidates_batch_idx").on(table.batchId),
  uniqueIndex("contentgen_candidates_batch_hash_unique").on(table.batchId,table.payloadHash),
]);

export const contentgenReviews=sqliteTable("contentgen_reviews",{
  id:text("id").primaryKey(),
  candidateId:text("candidate_id").notNull(),
  batchId:text("batch_id").notNull(),
  disposition:text("disposition").notNull(),
  reasonCodesJson:text("reason_codes_json").notNull(),
  notes:text("notes"),
  reviewerReceiptId:text("reviewer_receipt_id").notNull(),
  idempotencyKey:text("idempotency_key").notNull(),
  supersedesReviewId:text("supersedes_review_id"),
  createdAt:integer("created_at").notNull(),
},table=>[
  uniqueIndex("contentgen_reviews_idempotency_unique").on(table.idempotencyKey),
  index("contentgen_reviews_candidate_idx").on(table.candidateId),
]);

export const contentgenAiEvidence=sqliteTable("contentgen_ai_evidence",{
  id:text("id").primaryKey(),
  candidateId:text("candidate_id").notNull(),
  batchId:text("batch_id").notNull(),
  checklistJson:text("checklist_json").notNull(),
  promptHash:text("prompt_hash").notNull(),
  responseHash:text("response_hash").notNull(),
  providerId:text("provider_id"),
  modelId:text("model_id"),
  createdAt:integer("created_at").notNull(),
},table=>[index("contentgen_ai_evidence_candidate_idx").on(table.candidateId)]);

export const contentgenPolicyRuns=sqliteTable("contentgen_policy_runs",{
  id:text("id").primaryKey(),
  corpusVersion:text("corpus_version").notNull(),
  inputHash:text("input_hash").notNull(),
  outputHash:text("output_hash").notNull(),
  evaluationStatus:text("evaluation_status").notNull(),
  createdAt:integer("created_at").notNull(),
});

export const contentgenExports=sqliteTable("contentgen_exports",{
  id:text("id").primaryKey(),
  batchId:text("batch_id").notNull(),
  artifactHash:text("artifact_hash").notNull(),
  redactionReceiptId:text("redaction_receipt_id").notNull(),
  createdAt:integer("created_at").notNull(),
},table=>[index("contentgen_exports_batch_idx").on(table.batchId)]);
