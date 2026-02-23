import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users with Discord OAuth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  globalRole: text("global_role").default("USER"),
  referralCode: text("referral_code").unique(),
  blocked: boolean("blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guilds table
export const guilds = pgTable("guilds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(),
  description: text("description"),
  formationDate: text("formation_date"),
  totalExp: text("total_exp"),
  guildPower: integer("guild_power").default(0),
  guildType: text("guild_type").default("main"),
  isEnemy: boolean("is_enemy").default(false),
  verified: boolean("verified").default(false),
  verificationCode: text("verification_code"),
  verifiedAt: timestamp("verified_at"),
  discordServerId: text("discord_server_id"),
  ownerId: integer("owner_id").references(() => users.id),
  subscriptionStatus: text("subscription_status").default("FREE"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
});

// Guild Users - multi-tenant membership & roles
export const guildUsers = pgTable("guild_users", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("MEMBER"),
  permissions: jsonb("permissions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guild Invites
export const guildInvites = pgTable("guild_invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  guildId: integer("guild_id").references(() => guilds.id).notNull(),
  role: text("role").notNull().default("MEMBER"),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Requests (Tibia Coin subscription model)
export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amountTibiaCoins: integer("amount_tibia_coins").notNull(),
  characterNameUsedForPayment: text("character_name_used_for_payment").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  rewardApplied: boolean("reward_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Characters/Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  vocation: text("vocation").notNull(),
  exp: text("exp"),
  guildId: integer("guild_id").references(() => guilds.id),
  guildType: text("guild_type").default("main"),
  rank: text("rank"),
  online: boolean("online").default(false),
  lastScan: timestamp("last_scan").defaultNow(),
  startLevel: integer("start_level"),
  levelsGained: integer("levels_gained").default(0),
  expGained: text("exp_gained"),
});

// Deaths/PvP Tracking
export const deaths = pgTable("deaths", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").references(() => players.id),
  characterName: text("character_name").notNull(),
  level: integer("level"),
  vocation: text("vocation"),
  killerName: text("killer_name"),
  killerGuild: text("killer_guild"),
  killerGuildId: integer("killer_guild_id").references(() => guilds.id),
  victimGuildId: integer("victim_guild_id").references(() => guilds.id),
  victimGuildType: text("victim_guild_type"),
  isPvp: boolean("is_pvp").default(false),
  occurredAt: timestamp("occurred_at"),
  createdAt: timestamp("created_at").defaultNow(),
  notified: boolean("notified").default(false),
  deathHash: text("death_hash").unique(),
  description: text("description"),
});

// Death Tracker Channel Configuration
export const deathTrackerConfig = pgTable("death_tracker_config", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id),
  discordServerId: text("discord_server_id").notNull(),
  mainGuildDeathChannelId: text("main_guild_death_channel_id"),
  enemyDeathChannelId: text("enemy_death_channel_id"),
  mainGuildWebhookUrl: text("main_guild_webhook_url"),
  enemyGuildWebhookUrl: text("enemy_guild_webhook_url"),
  membershipWebhookUrl: text("membership_webhook_url"),
  enabled: boolean("enabled").default(true),
  notifyMainGuildDeaths: boolean("notify_main_guild_deaths").default(true),
  notifyEnemyGuildDeaths: boolean("notify_enemy_guild_deaths").default(true),
  checkIntervalMinutes: integer("check_interval_minutes").default(5),
  lastCheckedAt: timestamp("last_checked_at"),
  lastNotificationSentAt: timestamp("last_notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// PvP Daily Summaries
export const pvpLogs = pgTable("pvp_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  mainGuildKills: integer("main_guild_kills").default(0),
  enemyGuildKills: integer("enemy_guild_kills").default(0),
  totalDeaths: integer("total_deaths").default(0),
  guildId: integer("guild_id").references(() => guilds.id),
  enemyGuildId: integer("enemy_guild_id").references(() => guilds.id),
});

// Quest/Boss Events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  templateId: integer("template_id").references(() => templates.id),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  startTime: timestamp("start_time"),
  guildId: integer("guild_id").references(() => guilds.id),
  discordRoleId: text("discord_role_id"),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event Participants
export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id),
  discordUserId: text("discord_user_id").notNull(),
  characterName: text("character_name"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Event Templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  defaultMaxParticipants: integer("default_max_participants"),
  requirements: jsonb("requirements"),
  guildId: integer("guild_id").references(() => guilds.id),
});

// PvP Action Config
export const pvpActionConfig = pgTable("pvp_action_config", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id),
  commandAlias: text("command_alias").default("/pvp_action"),
  excludedChannels: jsonb("excluded_channels"),
  targetChannelId: text("target_channel_id"),
});

// Scan Cache
export const scanCache = pgTable("scan_cache", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull().unique(),
  data: jsonb("data"),
  cachedAt: timestamp("cached_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Online Snapshots
export const onlineSnapshots = pgTable("online_snapshots", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull(),
  world: text("world").notNull().default("Antica"),
  level: integer("level"),
  vocation: text("vocation"),
  isOnline: boolean("is_online").default(true),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// Online Sessions
export const onlineSessions = pgTable("online_sessions", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull(),
  world: text("world").notNull().default("Antica"),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Online Characters Cache
export const onlineCharacters = pgTable("online_characters", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull().unique(),
  world: text("world").notNull().default("Antica"),
  level: integer("level"),
  vocation: text("vocation"),
  lastSeen: timestamp("last_seen").defaultNow(),
  isCurrentlyOnline: boolean("is_currently_online").default(true),
  guildName: text("guild_name"),
  isTrackedGuild: boolean("is_tracked_guild").default(false),
});

// TibSpy Scraper - Character enrichment data
export const tibspyCharacterData = pgTable("tibspy_character_data", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull().unique(),
  playerId: integer("player_id").references(() => players.id),
  lastScrapedAt: timestamp("last_scraped_at"),
  scrapeCount: integer("scrape_count").default(0),
  priority: text("priority").default("normal"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TibSpy Daily Scrape Logs
export const tibspyScrapeLogs = pgTable("tibspy_scrape_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  totalAttempts: integer("total_attempts").default(0),
  successfulScrapes: integer("successful_scrapes").default(0),
  skippedCooldown: integer("skipped_cooldown").default(0),
  skippedLimit: integer("skipped_limit").default(0),
  blocked: integer("blocked").default(0),
  failed: integer("failed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TibSpy Config
export const tibspyConfig = pgTable("tibspy_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guild Members - tracks current and historical guild membership
export const guildMembers = pgTable("guild_members", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id).notNull(),
  characterName: text("character_name").notNull(),
  rank: text("rank"),
  isActive: boolean("is_active").default(true),
  missedChecks: integer("missed_checks").default(0),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guild Membership Events - join/leave history
export const guildMembershipEvents = pgTable("guild_membership_events", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id).notNull(),
  characterName: text("character_name").notNull(),
  eventType: text("event_type").notNull(),
  detectedAt: timestamp("detected_at").defaultNow(),
  notified: boolean("notified").default(false),
});

// ============ INSERT SCHEMAS ============
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertGuildSchema = createInsertSchema(guilds).omit({ id: true });
export const insertGuildUserSchema = createInsertSchema(guildUsers).omit({ id: true, createdAt: true });
export const insertGuildInviteSchema = createInsertSchema(guildInvites).omit({ id: true, createdAt: true });
export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({ id: true, createdAt: true, confirmedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertDeathSchema = createInsertSchema(deaths).omit({ id: true, createdAt: true });
export const insertPvpLogSchema = createInsertSchema(pvpLogs).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({ id: true, joinedAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });
export const insertPvpActionConfigSchema = createInsertSchema(pvpActionConfig).omit({ id: true });
export const insertDeathTrackerConfigSchema = createInsertSchema(deathTrackerConfig).omit({ id: true, createdAt: true });
export const insertOnlineSnapshotSchema = createInsertSchema(onlineSnapshots).omit({ id: true, checkedAt: true });
export const insertOnlineSessionSchema = createInsertSchema(onlineSessions).omit({ id: true, createdAt: true });
export const insertOnlineCharacterSchema = createInsertSchema(onlineCharacters).omit({ id: true });
export const insertTibspyCharacterDataSchema = createInsertSchema(tibspyCharacterData).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTibspyScrapeLogSchema = createInsertSchema(tibspyScrapeLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTibspyConfigSchema = createInsertSchema(tibspyConfig).omit({ id: true, updatedAt: true });
export const insertGuildMemberSchema = createInsertSchema(guildMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuildMembershipEventSchema = createInsertSchema(guildMembershipEvents).omit({ id: true, detectedAt: true });

// ============ TYPES ============
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type GuildUser = typeof guildUsers.$inferSelect;
export type InsertGuildUser = z.infer<typeof insertGuildUserSchema>;
export type GuildInvite = typeof guildInvites.$inferSelect;
export type InsertGuildInvite = z.infer<typeof insertGuildInviteSchema>;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Death = typeof deaths.$inferSelect;
export type InsertDeath = z.infer<typeof insertDeathSchema>;
export type PvpLog = typeof pvpLogs.$inferSelect;
export type InsertPvpLog = z.infer<typeof insertPvpLogSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type PvpActionConfig = typeof pvpActionConfig.$inferSelect;
export type InsertPvpActionConfig = z.infer<typeof insertPvpActionConfigSchema>;
export type DeathTrackerConfig = typeof deathTrackerConfig.$inferSelect;
export type InsertDeathTrackerConfig = z.infer<typeof insertDeathTrackerConfigSchema>;
export type OnlineSnapshot = typeof onlineSnapshots.$inferSelect;
export type InsertOnlineSnapshot = z.infer<typeof insertOnlineSnapshotSchema>;
export type OnlineSession = typeof onlineSessions.$inferSelect;
export type InsertOnlineSession = z.infer<typeof insertOnlineSessionSchema>;
export type OnlineCharacter = typeof onlineCharacters.$inferSelect;
export type InsertOnlineCharacter = z.infer<typeof insertOnlineCharacterSchema>;
export type TibspyCharacterData = typeof tibspyCharacterData.$inferSelect;
export type InsertTibspyCharacterData = z.infer<typeof insertTibspyCharacterDataSchema>;
export type TibspyScrapeLog = typeof tibspyScrapeLogs.$inferSelect;
export type InsertTibspyScrapeLog = z.infer<typeof insertTibspyScrapeLogSchema>;
export type TibspyConfig = typeof tibspyConfig.$inferSelect;
export type InsertTibspyConfig = z.infer<typeof insertTibspyConfigSchema>;
export type GuildMember = typeof guildMembers.$inferSelect;
export type InsertGuildMember = z.infer<typeof insertGuildMemberSchema>;
export type GuildMembershipEvent = typeof guildMembershipEvents.$inferSelect;
export type InsertGuildMembershipEvent = z.infer<typeof insertGuildMembershipEventSchema>;
