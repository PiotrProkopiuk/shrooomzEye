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
  killerName: text("killer_name"),
  killerGuildId: integer("killer_guild_id").references(() => guilds.id),
  victimGuildId: integer("victim_guild_id").references(() => guilds.id),
  timestamp: timestamp("timestamp").defaultNow(),
  level: integer("level"),
  description: text("description"),
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

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertGuildSchema = createInsertSchema(guilds).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertDeathSchema = createInsertSchema(deaths).omit({ id: true });
export const insertPvpLogSchema = createInsertSchema(pvpLogs).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({ id: true, joinedAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });
export const insertPvpActionConfigSchema = createInsertSchema(pvpActionConfig).omit({ id: true });

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
