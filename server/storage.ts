import { 
  users, guilds, players, pvpLogs, templates,
  type User, type InsertUser, 
  type Guild, type InsertGuild,
  type Player, type InsertPlayer,
  type PvpLog, type InsertPvpLog,
  type Template, type InsertTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Guilds
  getGuilds(): Promise<Guild[]>;
  getGuild(id: number): Promise<Guild | undefined>;
  createGuild(guild: InsertGuild): Promise<Guild>;
  updateGuild(id: number, guild: Partial<InsertGuild>): Promise<Guild>;

  // Players
  getPlayers(guildId?: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player>;

  // PvP Logs
  getPvpLogs(guildId: number): Promise<PvpLog[]>;
  createPvpLog(log: InsertPvpLog): Promise<PvpLog>;

  // Templates
  getTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getGuilds(): Promise<Guild[]> {
    return await db.select().from(guilds);
  }

  async getGuild(id: number): Promise<Guild | undefined> {
    const [guild] = await db.select().from(guilds).where(eq(guilds.id, id));
    return guild;
  }

  async createGuild(insertGuild: InsertGuild): Promise<Guild> {
    const [guild] = await db.insert(guilds).values(insertGuild).returning();
    return guild;
  }

  async updateGuild(id: number, patch: Partial<InsertGuild>): Promise<Guild> {
    const [guild] = await db.update(guilds).set(patch).where(eq(guilds.id, id)).returning();
    return guild;
  }

  async getPlayers(guildId?: number): Promise<Player[]> {
    if (guildId) {
      return await db.select().from(players).where(eq(players.guildId, guildId));
    }
    return await db.select().from(players);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayer(id: number, patch: Partial<InsertPlayer>): Promise<Player> {
    const [player] = await db.update(players).set(patch).where(eq(players.id, id)).returning();
    return player;
  }

  async getPvpLogs(guildId: number): Promise<PvpLog[]> {
    return await db.select().from(pvpLogs).where(eq(pvpLogs.guildId, guildId));
  }

  async createPvpLog(insertLog: InsertPvpLog): Promise<PvpLog> {
    const [log] = await db.insert(pvpLogs).values(insertLog).returning();
    return log;
  }

  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }
}

export const storage = new DatabaseStorage();
