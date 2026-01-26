import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users with Discord OAuth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  role: text("role").default("USER"), // 'ADMIN', 'MODERATOR', 'USER'
  createdAt: timestamp("created_at").defaultNow(),
});

// Guilds table
export const guilds = pgTable("guilds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(), // Tibia server (e.g., Antica)
  description: text("description"),
  formationDate: text("formation_date"),
  totalExp: text("total_exp"),
  guildPower: integer("guild_power").default(0),
  isEnemy: boolean("is_enemy").default(false),
  verified: boolean("verified").default(false),
  verificationCode: text("verification_code"),
  verifiedAt: timestamp("verified_at"),
  discordServerId: text("discord_server_id"),
});

// Characters/Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  vocation: text("vocation").notNull(),
  exp: text("exp"),
  guildId: integer("guild_id").references(() => guilds.id),
  guildType: text("guild_type").default("main"), // 'main', 'ally', 'enemy'
  rank: text("rank"),
  online: boolean("online").default(false),
  lastScan: timestamp("last_scan").defaultNow(),
  startLevel: integer("start_level"),
  levelsGained: integer("levels_gained").default(0),
  expGained: text("exp_gained"),
});

// Deaths/PvP Tracking (Enhanced for Death Tracker)
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
  victimGuildType: text("victim_guild_type"), // 'main' or 'enemy'
  isPvp: boolean("is_pvp").default(false),
  occurredAt: timestamp("occurred_at"),
  createdAt: timestamp("created_at").defaultNow(),
  notified: boolean("notified").default(false),
  deathHash: text("death_hash").unique(), // For duplicate detection
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
  enabled: boolean("enabled").default(true),
  notifyMainGuildDeaths: boolean("notify_main_guild_deaths").default(true),
  notifyEnemyGuildDeaths: boolean("notify_enemy_guild_deaths").default(true),
  checkIntervalMinutes: integer("check_interval_minutes").default(5),
  lastCheckedAt: timestamp("last_checked_at"),
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
  type: text("type").notNull(), // 'quest', 'boss'
  templateId: integer("template_id").references(() => templates.id),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  startTime: timestamp("start_time"),
  guildId: integer("guild_id").references(() => guilds.id),
  discordRoleId: text("discord_role_id"),
  status: text("status").default("open"), // 'open', 'full', 'completed', 'cancelled'
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
  type: text("type").notNull(), // 'quest', 'boss'
  defaultMaxParticipants: integer("default_max_participants"),
  requirements: jsonb("requirements"),
});

// PvP Action Config
export const pvpActionConfig = pgTable("pvp_action_config", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").references(() => guilds.id),
  commandAlias: text("command_alias").default("/pvp_action"),
  excludedChannels: jsonb("excluded_channels"), // Array of channel IDs
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

// Online Snapshots - stores every scrape result for analytics
export const onlineSnapshots = pgTable("online_snapshots", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull(),
  world: text("world").notNull().default("Antica"),
  level: integer("level"),
  vocation: text("vocation"),
  isOnline: boolean("is_online").default(true),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// Online Sessions - derived from snapshots (login/logout detection)
export const onlineSessions = pgTable("online_sessions", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull(),
  world: text("world").notNull().default("Antica"),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Online Characters Cache - current online status (updated each scrape)
export const onlineCharacters = pgTable("online_characters", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull().unique(),
  world: text("world").notNull().default("Antica"),
  level: integer("level"),
  vocation: text("vocation"),
  lastSeen: timestamp("last_seen").defaultNow(),
  isCurrentlyOnline: boolean("is_currently_online").default(true),
  guildName: text("guild_name"),
  isTrackedGuild: boolean("is_tracked_guild").default(false), // main or enemy guild
});

// TibSpy Scraper - Character enrichment data
export const tibspyCharacterData = pgTable("tibspy_character_data", {
  id: serial("id").primaryKey(),
  characterName: text("character_name").notNull().unique(),
  playerId: integer("player_id").references(() => players.id),
  lastScrapedAt: timestamp("last_scraped_at"),
  scrapeCount: integer("scrape_count").default(0),
  priority: text("priority").default("normal"), // 'high', 'normal', 'low'
  data: jsonb("data"), // Raw TibSpy response data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TibSpy Daily Scrape Logs - Track daily metrics
export const tibspyScrapeLogs = pgTable("tibspy_scrape_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  totalAttempts: integer("total_attempts").default(0),
  successfulScrapes: integer("successful_scrapes").default(0),
  skippedCooldown: integer("skipped_cooldown").default(0),
  skippedLimit: integer("skipped_limit").default(0),
  blocked: integer("blocked").default(0),
  failed: integer("failed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TibSpy Config - Configurable parameters
export const tibspyConfig = pgTable("tibspy_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertGuildSchema = createInsertSchema(guilds).omit({ id: true });
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = z.infer<typeof insertGuildSchema>;
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
