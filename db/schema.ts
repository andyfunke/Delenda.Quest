import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users=sqliteTable("users",{
  email:text("email").primaryKey(),
  displayName:text("display_name").notNull(),
  allowFriends:integer("allow_friends",{mode:"boolean"}).notNull().default(true),
  createdAt:integer("created_at").notNull(),
  lastSeenAt:integer("last_seen_at").notNull(),
});

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
