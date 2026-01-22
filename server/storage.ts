import { 
  users, guilds, players, pvpLogs, templates, deaths, events, eventParticipants, pvpActionConfig, scanCache,
  type User, type InsertUser, 
  type Guild, type InsertGuild,
  type Player, type InsertPlayer,
  type PvpLog, type InsertPvpLog,
  type Template, type InsertTemplate,
  type Death, type InsertDeath,
  type Event, type InsertEvent,
  type EventParticipant, type InsertEventParticipant,
  type PvpActionConfig, type InsertPvpActionConfig
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface DeathFilters {
  dateFrom?: Date;
  dateTo?: Date;
  isPvp?: boolean;
  victimGuildType?: 'main' | 'enemy';
}

export interface DeathStats {
  total: number;
  mainGuildDeaths: number;
  enemyGuildDeaths: number;
  pvpDeaths: number;
  pveDeaths: number;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User>;

  // Guilds
  getGuilds(): Promise<Guild[]>;
  getGuild(id: number): Promise<Guild | undefined>;
  getGuildByDiscordServer(discordServerId: string): Promise<Guild | undefined>;
  createGuild(guild: InsertGuild): Promise<Guild>;
  updateGuild(id: number, guild: Partial<InsertGuild>): Promise<Guild>;
  verifyGuild(id: number, verificationCode: string): Promise<Guild>;

  // Players
  getPlayers(guildId?: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerByName(name: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player>;
  getOnlinePlayers(guildId: number): Promise<Player[]>;

  // Deaths
  getDeaths(guildId: number, limit?: number): Promise<Death[]>;
  createDeath(death: InsertDeath): Promise<Death>;
  getRecentDeaths(page?: number, pageSize?: number, filters?: DeathFilters): Promise<{ deaths: Death[]; total: number; page: number; pageSize: number; totalPages: number }>;
  getTotalDeathsCount(): Promise<number>;
  getDeathStats(filters?: DeathFilters): Promise<DeathStats>;

  // PvP Logs
  getPvpLogs(guildId: number): Promise<PvpLog[]>;
  createPvpLog(log: InsertPvpLog): Promise<PvpLog>;

  // Events
  getEvents(guildId: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  joinEvent(eventId: number, participant: InsertEventParticipant): Promise<EventParticipant>;
  getEventParticipants(eventId: number): Promise<EventParticipant[]>;

  // Templates
  getTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  // PvP Action Config
  getPvpActionConfig(guildId: number): Promise<PvpActionConfig | undefined>;
  savePvpActionConfig(config: InsertPvpActionConfig): Promise<PvpActionConfig>;

  // Stats
  getGuildStats(guildId: number): Promise<any>;
  getLeaderboard(guildId: number): Promise<Player[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user;
  }

  // Guilds
  async getGuilds(): Promise<Guild[]> {
    return await db.select().from(guilds);
  }

  async getGuild(id: number): Promise<Guild | undefined> {
    const [guild] = await db.select().from(guilds).where(eq(guilds.id, id));
    return guild;
  }

  async getGuildByDiscordServer(discordServerId: string): Promise<Guild | undefined> {
    const [guild] = await db.select().from(guilds).where(eq(guilds.discordServerId, discordServerId));
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

  async verifyGuild(id: number, verificationCode: string): Promise<Guild> {
    const [guild] = await db.update(guilds)
      .set({ verified: true, verifiedAt: new Date(), verificationCode })
      .where(eq(guilds.id, id))
      .returning();
    return guild;
  }

  // Players
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

  async getPlayerByName(name: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.name, name));
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

  async getOnlinePlayers(guildId: number): Promise<Player[]> {
    return await db.select().from(players).where(and(eq(players.guildId, guildId), eq(players.online, true)));
  }

  // Deaths
  async getDeaths(guildId: number, limit = 50): Promise<Death[]> {
    return await db.select().from(deaths)
      .where(eq(deaths.victimGuildId, guildId))
      .orderBy(desc(deaths.occurredAt))
      .limit(limit);
  }

  async createDeath(insertDeath: InsertDeath): Promise<Death> {
    const [death] = await db.insert(deaths).values(insertDeath).returning();
    return death;
  }

  async getRecentDeaths(page = 1, pageSize = 50, filters?: DeathFilters): Promise<{ deaths: Death[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const offset = (page - 1) * pageSize;
    
    // Build conditions array
    const conditions = [];
    if (filters?.dateFrom) {
      conditions.push(gte(deaths.occurredAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(deaths.occurredAt, filters.dateTo));
    }
    if (filters?.isPvp !== undefined) {
      conditions.push(eq(deaths.isPvp, filters.isPvp));
    }
    if (filters?.victimGuildType) {
      conditions.push(eq(deaths.victimGuildType, filters.victimGuildType));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Count with filters
    const countQuery = whereClause 
      ? db.select({ count: sql<number>`count(*)` }).from(deaths).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(deaths);
    const [countResult] = await countQuery;
    const total = Number(countResult.count);
    const totalPages = Math.ceil(total / pageSize);
    
    // Get deaths with filters
    const deathsQuery = whereClause
      ? db.select().from(deaths).where(whereClause).orderBy(desc(deaths.occurredAt)).limit(pageSize).offset(offset)
      : db.select().from(deaths).orderBy(desc(deaths.occurredAt)).limit(pageSize).offset(offset);
    const deathsList = await deathsQuery;
    
    return { deaths: deathsList, total, page, pageSize, totalPages };
  }

  async getTotalDeathsCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(deaths);
    return Number(result.count);
  }

  async getDeathStats(filters?: DeathFilters): Promise<DeathStats> {
    // Build base conditions from filters
    const baseConditions: any[] = [];
    if (filters?.dateFrom) {
      baseConditions.push(gte(deaths.occurredAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      baseConditions.push(lte(deaths.occurredAt, filters.dateTo));
    }
    if (filters?.isPvp !== undefined) {
      baseConditions.push(eq(deaths.isPvp, filters.isPvp));
    }
    if (filters?.victimGuildType) {
      baseConditions.push(eq(deaths.victimGuildType, filters.victimGuildType));
    }

    // Total with filters
    const baseQuery = baseConditions.length > 0 
      ? db.select({ count: sql<number>`count(*)` }).from(deaths).where(and(...baseConditions))
      : db.select({ count: sql<number>`count(*)` }).from(deaths);
    const [totalResult] = await baseQuery;
    
    // Main guild deaths with filters
    const mainConditions = [...baseConditions, eq(deaths.victimGuildType, 'main')];
    const [mainResult] = await db.select({ count: sql<number>`count(*)` }).from(deaths).where(and(...mainConditions));
    
    // Enemy guild deaths with filters
    const enemyConditions = [...baseConditions, eq(deaths.victimGuildType, 'enemy')];
    const [enemyResult] = await db.select({ count: sql<number>`count(*)` }).from(deaths).where(and(...enemyConditions));
    
    // PvP deaths with filters
    const pvpConditions = [...baseConditions, eq(deaths.isPvp, true)];
    const [pvpResult] = await db.select({ count: sql<number>`count(*)` }).from(deaths).where(and(...pvpConditions));
    
    // PvE deaths with filters
    const pveConditions = [...baseConditions, eq(deaths.isPvp, false)];
    const [pveResult] = await db.select({ count: sql<number>`count(*)` }).from(deaths).where(and(...pveConditions));
    
    return {
      total: Number(totalResult.count),
      mainGuildDeaths: Number(mainResult.count),
      enemyGuildDeaths: Number(enemyResult.count),
      pvpDeaths: Number(pvpResult.count),
      pveDeaths: Number(pveResult.count),
    };
  }

  // PvP Logs
  async getPvpLogs(guildId: number): Promise<PvpLog[]> {
    return await db.select().from(pvpLogs).where(eq(pvpLogs.guildId, guildId)).orderBy(desc(pvpLogs.date));
  }

  async createPvpLog(insertLog: InsertPvpLog): Promise<PvpLog> {
    const [log] = await db.insert(pvpLogs).values(insertLog).returning();
    return log;
  }

  // Events
  async getEvents(guildId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.guildId, guildId)).orderBy(desc(events.startTime));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: number, patch: Partial<InsertEvent>): Promise<Event> {
    const [event] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
    return event;
  }

  async joinEvent(eventId: number, participant: InsertEventParticipant): Promise<EventParticipant> {
    const [p] = await db.insert(eventParticipants).values({ ...participant, eventId }).returning();
    await db.update(events).set({ currentParticipants: sql`${events.currentParticipants} + 1` }).where(eq(events.id, eventId));
    return p;
  }

  async getEventParticipants(eventId: number): Promise<EventParticipant[]> {
    return await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId));
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  // PvP Action Config
  async getPvpActionConfig(guildId: number): Promise<PvpActionConfig | undefined> {
    const [config] = await db.select().from(pvpActionConfig).where(eq(pvpActionConfig.guildId, guildId));
    return config;
  }

  async savePvpActionConfig(config: InsertPvpActionConfig): Promise<PvpActionConfig> {
    const [saved] = await db.insert(pvpActionConfig).values(config).returning();
    return saved;
  }

  // Stats
  async getGuildStats(guildId: number): Promise<any> {
    const allPlayers = await this.getPlayers(guildId);
    const onlinePlayers = await this.getOnlinePlayers(guildId);
    const recentDeaths = await this.getDeaths(guildId, 10);
    const pvpHistory = await this.getPvpLogs(guildId);

    const avgLevel = allPlayers.length > 0 
      ? Math.round(allPlayers.reduce((sum, p) => sum + p.level, 0) / allPlayers.length) 
      : 0;

    const totalExpGained = allPlayers.reduce((sum, p) => sum + parseInt(p.expGained || "0"), 0);

    return {
      totalMembers: allPlayers.length,
      membersOnline: onlinePlayers.length,
      avgLevel,
      totalExpGained: `${(totalExpGained / 1000000).toFixed(1)}M`,
      recentDeaths: recentDeaths.length,
      pvpHistory,
    };
  }

  async getLeaderboard(guildId: number): Promise<Player[]> {
    return await db.select().from(players)
      .where(eq(players.guildId, guildId))
      .orderBy(desc(players.level))
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
