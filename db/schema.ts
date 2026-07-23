import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users=sqliteTable("users",{
  email:text("email").primaryKey(),
  displayName:text("display_name").notNull(),
  alias:text("alias"),
  aliasChangedAt:integer("alias_changed_at").notNull().default(0),
  allowFriends:integer("allow_friends",{mode:"boolean"}).notNull().default(true),
  accountEnabled:integer("account_enabled",{mode:"boolean"}).notNull().default(true),
  socialEnabled:integer("social_enabled",{mode:"boolean"}).notNull().default(true),
  telemetryEnabled:integer("telemetry_enabled",{mode:"boolean"}).notNull().default(true),
  aliasRenameUnlocked:integer("alias_rename_unlocked",{mode:"boolean"}).notNull().default(false),
  createdAt:integer("created_at").notNull(),
  lastSeenAt:integer("last_seen_at").notNull(),
},table=>[uniqueIndex("users_alias_unique").on(table.alias)]);

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
