import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Guilds table
export const guilds = pgTable("guilds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(),
  description: text("description"),
  formationDate: text("formation_date"),
  totalExp: text("total_exp"),
  guildPower: integer("guild_power").default(0),
  isEnemy: boolean("is_enemy").default(false),
  verified: boolean("verified").default(false),
});

// Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  vocation: text("vocation").notNull(),
  guildId: integer("guild_id").references(() => guilds.id),
  online: boolean("online").default(false),
  lastScan: timestamp("last_scan").defaultNow(),
  startLevel: integer("start_level"),
  levelsGained: integer("levels_gained").default(0),
  expGained: text("exp_gained"),
});

// PvP Logs
export const pvpLogs = pgTable("pvp_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  codexKills: integer("codex_kills").default(0),
  enemyKills: integer("enemy_kills").default(0),
  totalDeaths: integer("total_deaths").default(0),
  guildId: integer("guild_id").references(() => guilds.id),
});

// Event Templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'war', 'quest', 'boss'
  requirements: jsonb("requirements"),
});

// Users (for panel access)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("member"), // 'leader', 'vice', 'member'
});

// Insert Schemas
export const insertGuildSchema = createInsertSchema(guilds).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertPvpLogSchema = createInsertSchema(pvpLogs).omit({ id: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Types
export type Guild = typeof guilds.$inferSelect;
export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type PvpLog = typeof pvpLogs.$inferSelect;
export type InsertPvpLog = z.infer<typeof insertPvpLogSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
