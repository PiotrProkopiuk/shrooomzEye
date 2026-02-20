import { db } from "./db";
import { guildMembers, guildMembershipEvents, guilds, players, deathTrackerConfig } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { fetchGuildMembers } from "./tibiadata";
import { storage } from "./storage";
import { sendDiscordNotification } from "./deathTracker";

const MISSED_CHECKS_THRESHOLD = 2;
const SYNC_BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;
const DISCORD_RATE_LIMIT_DELAY_MS = 1000;

let isSyncRunning = false;
let lastSyncTime: Date | null = null;
let lastSyncDurationMs = 0;

async function processBatched<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(processor));
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
    if (i + batchSize < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

export interface SyncResult {
  guildName: string;
  joined: string[];
  left: string[];
  updated: number;
  totalMembers: number;
  error?: string;
}

export async function syncGuildMembers(guildId: number): Promise<SyncResult> {
  const guild = await storage.getGuild(guildId);
  if (!guild) {
    return { guildName: "Unknown", joined: [], left: [], updated: 0, totalMembers: 0, error: "Guild not found" };
  }

  const result: SyncResult = {
    guildName: guild.name,
    joined: [],
    left: [],
    updated: 0,
    totalMembers: 0,
  };

  let apiMembers;
  try {
    apiMembers = await fetchGuildMembers(guild.name);
  } catch (error) {
    console.error(`[GuildSync] Failed to fetch members for ${guild.name}, skipping to prevent false LEFT events`);
    return { ...result, error: "API fetch failed" };
  }

  if (!apiMembers || apiMembers.length === 0) {
    console.log(`[GuildSync] No members returned for ${guild.name}, skipping`);
    return { ...result, error: "No members returned from API" };
  }

  result.totalMembers = apiMembers.length;
  const now = new Date();

  const dbMembers = await db.select().from(guildMembers)
    .where(eq(guildMembers.guildId, guildId));

  const dbMemberMap = new Map(dbMembers.map(m => [m.characterName, m]));
  const apiMemberNames = new Set(apiMembers.map(m => m.name));
  const isFirstSync = dbMembers.length === 0;

  if (isFirstSync) {
    console.log(`[GuildSync] First sync for ${guild.name} - seeding ${apiMembers.length} members (no JOINED notifications)`);
  }

  const RECENT_JOIN_DAYS = 7;

  await processBatched(apiMembers, SYNC_BATCH_SIZE, BATCH_DELAY_MS, async (member) => {
    const existing = dbMemberMap.get(member.name);

    if (existing) {
      const updates: any = {
        lastSeenAt: now,
        updatedAt: now,
        missedChecks: 0,
      };
      if (member.rank && member.rank !== existing.rank) {
        updates.rank = member.rank;
      }

      if (!existing.isActive) {
        updates.isActive = true;
        await db.insert(guildMembershipEvents).values({
          guildId,
          characterName: member.name,
          eventType: "JOINED",
          notified: false,
        });
        result.joined.push(member.name);
        console.log(`[GuildSync] ${member.name} rejoined ${guild.name}`);
      }

      await db.update(guildMembers).set(updates).where(eq(guildMembers.id, existing.id));
      result.updated++;
    } else {
      await db.insert(guildMembers).values({
        guildId,
        characterName: member.name,
        rank: member.rank,
        isActive: true,
        missedChecks: 0,
        lastSeenAt: now,
      });

      if (isFirstSync) {
        const joinedDate = member.joined ? new Date(member.joined) : null;
        const isRecentJoin = joinedDate && (now.getTime() - joinedDate.getTime()) < RECENT_JOIN_DAYS * 24 * 60 * 60 * 1000;

        if (isRecentJoin) {
          await db.insert(guildMembershipEvents).values({
            guildId,
            characterName: member.name,
            eventType: "JOINED",
            notified: true,
          });
          result.joined.push(member.name);
          console.log(`[GuildSync] ${member.name} recently joined ${guild.name} (${member.joined}) - logged but not notified`);
        }
      } else {
        await db.insert(guildMembershipEvents).values({
          guildId,
          characterName: member.name,
          eventType: "JOINED",
          notified: false,
        });
        result.joined.push(member.name);
        console.log(`[GuildSync] ${member.name} joined ${guild.name}`);
      }
    }

    const existingPlayer = await storage.getPlayerByName(member.name);
    if (existingPlayer) {
      const startLevel = existingPlayer.startLevel || existingPlayer.level;
      const levelsGained = member.level - startLevel;
      await storage.updatePlayer(existingPlayer.id, {
        level: member.level,
        vocation: member.vocation,
        rank: member.rank,
        online: member.status === "online",
        lastScan: now,
        levelsGained: levelsGained > 0 ? levelsGained : 0,
      });
    } else {
      await storage.createPlayer({
        name: member.name,
        guildId,
        level: member.level,
        vocation: member.vocation,
        rank: member.rank,
        online: member.status === "online",
        startLevel: member.level,
        levelsGained: 0,
      });
    }
  });

  const activeDbMembers = dbMembers.filter(m => m.isActive);
  for (const dbMember of activeDbMembers) {
    if (!apiMemberNames.has(dbMember.characterName)) {
      const newMissedChecks = (dbMember.missedChecks || 0) + 1;

      if (newMissedChecks >= MISSED_CHECKS_THRESHOLD) {
        await db.update(guildMembers)
          .set({ isActive: false, missedChecks: newMissedChecks, updatedAt: now })
          .where(eq(guildMembers.id, dbMember.id));

        await db.insert(guildMembershipEvents).values({
          guildId,
          characterName: dbMember.characterName,
          eventType: "LEFT",
          notified: false,
        });
        result.left.push(dbMember.characterName);
        console.log(`[GuildSync] ${dbMember.characterName} left ${guild.name} (missing ${newMissedChecks} checks)`);
      } else {
        await db.update(guildMembers)
          .set({ missedChecks: newMissedChecks, updatedAt: now })
          .where(eq(guildMembers.id, dbMember.id));
        console.log(`[GuildSync] ${dbMember.characterName} missing from ${guild.name} (check ${newMissedChecks}/${MISSED_CHECKS_THRESHOLD})`);
      }
    }
  }

  return result;
}

export async function sendMembershipNotifications(): Promise<number> {
  const unnotified = await db.select().from(guildMembershipEvents)
    .where(eq(guildMembershipEvents.notified, false))
    .orderBy(desc(guildMembershipEvents.detectedAt));

  if (unnotified.length === 0) return 0;

  const configs = await db.select().from(deathTrackerConfig)
    .where(eq(deathTrackerConfig.enabled, true));

  if (configs.length === 0) {
    await db.update(guildMembershipEvents)
      .set({ notified: true })
      .where(eq(guildMembershipEvents.notified, false));
    return 0;
  }

  const byGuild = new Map<number, typeof unnotified>();
  for (const event of unnotified) {
    const list = byGuild.get(event.guildId) || [];
    list.push(event);
    byGuild.set(event.guildId, list);
  }

  let notifiedCount = 0;

  for (const [guildId, events] of Array.from(byGuild.entries())) {
    const guild = await storage.getGuild(guildId);
    const guildName = guild?.name || "Unknown Guild";

    for (const config of configs) {
      const webhookUrl = config.membershipWebhookUrl || config.mainGuildWebhookUrl;
      if (!webhookUrl) continue;

      if (events.length <= 5) {
        for (const event of events) {
          const icon = event.eventType === "JOINED" ? "🟢" : "🔴";
          const action = event.eventType === "JOINED" ? "joined" : "left";
          const color = event.eventType === "JOINED" ? 0x22c55e : 0xef4444;

          const embed = {
            embeds: [{
              color,
              description: `${icon} **${event.characterName}** ${action} **${guildName}**`,
              footer: { text: "ShrooomzEye • Guild Intelligence" },
              timestamp: new Date(event.detectedAt!).toISOString(),
            }],
          };

          const success = await sendDiscordNotification(webhookUrl, embed);
          if (success) notifiedCount++;
          await new Promise(r => setTimeout(r, DISCORD_RATE_LIMIT_DELAY_MS));
        }
      } else {
        const joinedList = events.filter(e => e.eventType === "JOINED").map(e => e.characterName);
        const leftList = events.filter(e => e.eventType === "LEFT").map(e => e.characterName);

        const lines: string[] = [];
        if (joinedList.length > 0) {
          lines.push(`🟢 **${joinedList.length} Joined ${guildName}:**`);
          lines.push(joinedList.join(", "));
        }
        if (leftList.length > 0) {
          if (lines.length > 0) lines.push("");
          lines.push(`🔴 **${leftList.length} Left ${guildName}:**`);
          lines.push(leftList.join(", "));
        }

        const embed = {
          embeds: [{
            color: 0x5865F2,
            title: `Guild Changes: ${guildName}`,
            description: lines.join("\n"),
            footer: { text: "ShrooomzEye • Guild Intelligence" },
            timestamp: new Date().toISOString(),
          }],
        };

        const success = await sendDiscordNotification(webhookUrl, embed);
        if (success) notifiedCount++;
        await new Promise(r => setTimeout(r, DISCORD_RATE_LIMIT_DELAY_MS));
      }
    }

    const eventIds = events.map(e => e.id);
    for (const id of eventIds) {
      await db.update(guildMembershipEvents)
        .set({ notified: true })
        .where(eq(guildMembershipEvents.id, id));
    }
  }

  return notifiedCount;
}

export async function runFullGuildSync(): Promise<SyncResult[]> {
  if (isSyncRunning) {
    console.log("[GuildSync] Sync already running, skipping");
    return [];
  }

  isSyncRunning = true;
  const startTime = Date.now();

  try {
    const allGuilds = await storage.getGuilds();
    console.log(`[GuildSync] Starting sync for ${allGuilds.length} guilds`);

    const results: SyncResult[] = [];

    for (const guild of allGuilds) {
      try {
        const result = await syncGuildMembers(guild.id);
        results.push(result);

        if (result.joined.length > 0 || result.left.length > 0) {
          console.log(`[GuildSync] ${guild.name}: +${result.joined.length} joined, -${result.left.length} left, ${result.updated} updated`);
        }

        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`[GuildSync] Error syncing ${guild.name}:`, error);
        results.push({
          guildName: guild.name,
          joined: [],
          left: [],
          updated: 0,
          totalMembers: 0,
          error: String(error),
        });
      }
    }

    const totalJoined = results.reduce((sum, r) => sum + r.joined.length, 0);
    const totalLeft = results.reduce((sum, r) => sum + r.left.length, 0);

    if (totalJoined > 0 || totalLeft > 0) {
      console.log(`[GuildSync] Sending membership notifications...`);
      const notified = await sendMembershipNotifications();
      console.log(`[GuildSync] Sent ${notified} membership notifications`);
    }

    lastSyncTime = new Date();
    lastSyncDurationMs = Date.now() - startTime;
    console.log(`[GuildSync] Sync complete in ${lastSyncDurationMs}ms`);

    return results;
  } finally {
    isSyncRunning = false;
  }
}

export function getGuildSyncStatus() {
  return {
    running: isSyncRunning,
    lastSyncTime,
    lastSyncDurationMs,
  };
}

export async function getGuildMembershipEvents(options: {
  guildId?: number;
  page?: number;
  pageSize?: number;
  eventType?: "JOINED" | "LEFT";
}) {
  const { guildId, page = 1, pageSize = 50, eventType } = options;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (guildId) conditions.push(eq(guildMembershipEvents.guildId, guildId));
  if (eventType) conditions.push(eq(guildMembershipEvents.eventType, eventType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countQuery = whereClause
    ? db.select({ count: sql<number>`count(*)` }).from(guildMembershipEvents).where(whereClause)
    : db.select({ count: sql<number>`count(*)` }).from(guildMembershipEvents);
  const [countResult] = await countQuery;
  const total = Number(countResult.count);

  const eventsQuery = whereClause
    ? db.select().from(guildMembershipEvents).where(whereClause).orderBy(desc(guildMembershipEvents.detectedAt)).limit(pageSize).offset(offset)
    : db.select().from(guildMembershipEvents).orderBy(desc(guildMembershipEvents.detectedAt)).limit(pageSize).offset(offset);

  const eventsList = await eventsQuery;

  return {
    events: eventsList,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

let guildSyncInterval: NodeJS.Timeout | null = null;

export function startGuildSyncScheduler(intervalMinutes: number = 15): void {
  if (guildSyncInterval) {
    clearInterval(guildSyncInterval);
  }

  console.log(`[GuildSync] Scheduler started (every ${intervalMinutes} min)`);

  setTimeout(() => {
    runFullGuildSync().catch(err => console.error("[GuildSync] Initial sync error:", err));
  }, 10000);

  guildSyncInterval = setInterval(async () => {
    try {
      await runFullGuildSync();
    } catch (error) {
      console.error("[GuildSync] Scheduled sync error:", error);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopGuildSyncScheduler(): void {
  if (guildSyncInterval) {
    clearInterval(guildSyncInterval);
    guildSyncInterval = null;
  }
  console.log("[GuildSync] Scheduler stopped");
}
