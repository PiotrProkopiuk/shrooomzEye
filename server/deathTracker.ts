// Death Tracker Service - Fetches deaths from TibiaData and sends Discord notifications
import { storage } from "./storage";
import { db } from "./db";
import { deaths, deathTrackerConfig, players, guilds, onlineCharacters } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import crypto from "crypto";

const TIBIADATA_BASE = "https://api.tibiadata.com/v4";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 6000]; // Exponential backoff
const CONCURRENT_BATCH_SIZE = 5; // How many players to check in parallel
const BATCH_DELAY_MS = 500; // Delay between batches to avoid rate limiting

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
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

interface TibiaDeathEntry {
  time: string;
  level: number;
  killers: Array<{
    name: string;
    player: boolean;
    traded: boolean;
    summon?: string;
  }>;
  assists: Array<{
    name: string;
    player: boolean;
    traded: boolean;
  }>;
  reason: string;
}

interface CharacterDeaths {
  name: string;
  deaths: TibiaDeathEntry[];
}

export async function fetchCharacterDeaths(characterName: string): Promise<CharacterDeaths | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${TIBIADATA_BASE}/character/${encodeURIComponent(characterName)}`);
      
      if (response.status === 503) {
        // TibiaData overloaded, wait and retry
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        return null;
      }
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.character?.character) return null;
      
      return {
        name: data.character.character.name,
        deaths: data.character.deaths || [],
      };
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }
      console.error(`Failed to fetch deaths for ${characterName} after ${MAX_RETRIES} attempts:`, error);
      return null;
    }
  }
  return null;
}

function generateDeathHash(characterName: string, deathTime: string, level: number): string {
  return crypto.createHash("md5").update(`${characterName}-${deathTime}-${level}`).digest("hex");
}

function parseDeathEntry(characterName: string, level: number, vocation: string, death: TibiaDeathEntry, victimGuildType: string, victimGuildId: number | null) {
  const mainKiller = death.killers[0];
  const isPvp = death.killers.some(k => k.player);
  
  let killerGuild: string | null = null;
  if (mainKiller?.player) {
    // Could fetch killer's guild from API, but for now just note it's a player kill
  }

  return {
    characterName,
    level: death.level,
    vocation,
    killerName: mainKiller?.name || "Unknown",
    killerGuild,
    victimGuildId,
    victimGuildType,
    isPvp,
    occurredAt: new Date(death.time),
    deathHash: generateDeathHash(characterName, death.time, death.level),
    description: death.reason,
    notified: false,
  };
}

export async function checkDeathsForGuild(guildId: number, maxAgeDays: number = 365): Promise<number> {
  const guild = await storage.getGuild(guildId);
  if (!guild) return 0;

  const guildPlayers = await storage.getPlayers(guildId);
  if (!guildPlayers.length) return 0;

  let newDeathsCount = 0;
  const victimGuildType = guild.isEnemy ? "enemy" : "main";
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  console.log(`[DeathTracker] Checking ${guildPlayers.length} players from guild ${guild.name} (${victimGuildType}) in batches of ${CONCURRENT_BATCH_SIZE}`);

  const deathCounts = await processBatched(
    guildPlayers,
    CONCURRENT_BATCH_SIZE,
    BATCH_DELAY_MS,
    async (player) => {
      let playerDeaths = 0;
      try {
        const characterDeaths = await fetchCharacterDeaths(player.name);
        if (!characterDeaths || !characterDeaths.deaths.length) return 0;

        for (const death of characterDeaths.deaths) {
          const deathDate = new Date(death.time);
          if (deathDate < cutoffDate) continue;

          const deathHash = generateDeathHash(player.name, death.time, death.level);
          const [existing] = await db.select().from(deaths).where(eq(deaths.deathHash, deathHash));
          if (existing) continue;

          const deathData = parseDeathEntry(
            player.name,
            player.level,
            player.vocation,
            death,
            victimGuildType,
            guildId
          );

          await db.insert(deaths).values(deathData);
          playerDeaths++;
          console.log(`[DeathTracker] New death detected: ${player.name} killed by ${deathData.killerName}`);
        }
      } catch (error) {
        console.error(`[DeathTracker] Error checking deaths for ${player.name}:`, error);
      }
      return playerDeaths;
    }
  );

  return deathCounts.reduce((sum, c) => sum + c, 0);
}

// Scan all guilds (both main and enemy)
export async function scanAllGuildsForDeaths(maxAgeDays: number = 365): Promise<{ guild: string; type: string; newDeaths: number }[]> {
  const allGuilds = await storage.getGuilds();
  const results: { guild: string; type: string; newDeaths: number }[] = [];

  console.log(`[DeathTracker] Starting full scan for ${allGuilds.length} guilds (last ${maxAgeDays} day(s))`);

  for (const guild of allGuilds) {
    const newDeaths = await checkDeathsForGuild(guild.id, maxAgeDays);
    results.push({
      guild: guild.name,
      type: guild.isEnemy ? "enemy" : "main",
      newDeaths,
    });
    console.log(`[DeathTracker] Guild ${guild.name} (${guild.isEnemy ? "enemy" : "main"}): ${newDeaths} new deaths`);
  }

  return results;
}

export async function getUnnotifiedDeaths(): Promise<any[]> {
  return await db.select().from(deaths).where(eq(deaths.notified, false)).orderBy(desc(deaths.occurredAt));
}

export async function markDeathAsNotified(deathId: number): Promise<void> {
  await db.update(deaths).set({ notified: true }).where(eq(deaths.id, deathId));
}

const VOCATION_ICONS: Record<string, string> = {
  "Knight": "🛡️",
  "Elite Knight": "🛡️",
  "Paladin": "🏹",
  "Royal Paladin": "🏹",
  "Sorcerer": "🔥",
  "Master Sorcerer": "🔥",
  "Druid": "🍃",
  "Elder Druid": "🍃",
  "Monk": "👊",
  "Exalted Monk": "👊",
  "None": "⚪",
  "Unknown": "⚪",
};

function getVocationIcon(vocation: string): string {
  return VOCATION_ICONS[vocation] || "❓";
}

function getTibiaCharacterUrl(name: string): string {
  return `https://www.tibia.com/community/?name=${encodeURIComponent(name)}`;
}

function getTibiaGuildUrl(guildName: string): string {
  return `https://www.tibia.com/community/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`;
}

function getGuildLink(guildName: string): string {
  return `[${guildName}](${getTibiaGuildUrl(guildName)})`;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function parseKillers(description: string): { name: string; isPlayer: boolean }[] {
  const killers: { name: string; isPlayer: boolean }[] = [];
  
  const byMatch = description.match(/by (.+?)(?:\. Assisted by|$)/i);
  if (byMatch) {
    const killersPart = byMatch[1];
    const names = killersPart.split(/,\s*|\s+and\s+/).map(n => n.trim()).filter(n => n.length > 0);
    names.forEach(name => {
      const isPlayer = /^[A-Z][a-z]+/.test(name) && !name.includes(" ") || name.split(" ").length <= 3;
      killers.push({ name, isPlayer: true });
    });
  }
  
  return killers;
}

export function formatDeathEmbed(death: any, isEnemy: boolean) {
  const color = isEnemy ? 0x22c55e : 0xef4444;
  const icon = isEnemy ? "☠️" : "🔥";
  const vocationIcon = getVocationIcon(death.vocation || "Unknown");
  
  const occurredAt = death.occurredAt ? new Date(death.occurredAt) : new Date();
  const timeAgo = getTimeAgo(occurredAt);
  
  const charUrl = getTibiaCharacterUrl(death.characterName);
  const charLink = `[${death.characterName}](${charUrl})`;
  
  const killers = parseKillers(death.description || `by ${death.killerName}`);
  const killerCount = killers.length;
  
  let killersText = "";
  if (killers.length > 0) {
    const killerLinks = killers.map(k => 
      k.isPlayer ? `[${k.name}](${getTibiaCharacterUrl(k.name)})` : k.name
    );
    killersText = killerLinks.join(", ");
  } else {
    killersText = death.killerName || "Unknown";
  }
  
  const killerGuildLink = death.killerGuild ? getGuildLink(death.killerGuild) : "";
  const victimGuildLink = death.victimGuild ? getGuildLink(death.victimGuild) : "Unknown Guild";
  const victimGuildText = isEnemy ? `Enemy from ${victimGuildLink}` : `Member of your guild`;
  
  const description = [
    `${vocationIcon} **${death.level}** - ${charLink} (${death.vocation || "Unknown"})`,
    victimGuildText,
    ``,
    `⏰ Killed **${timeAgo}** at level ${death.level}`,
    ``,
    death.isPvp ? `⚔️ **${killerCount} Killer${killerCount !== 1 ? "s" : ""}:**` : `🐉 **PvE Death:**`,
    killersText,
    killerGuildLink ? `\n🏰 Killers from ${killerGuildLink}` : "",
  ].filter(line => line !== undefined).join("\n");

  return {
    embeds: [{
      color,
      description,
      footer: { text: "ShrooomzEye • Guild Intelligence" },
      timestamp: occurredAt.toISOString(),
    }],
  };
}

export async function sendDiscordNotification(webhookUrl: string, embed: any): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed),
    });
    return response.ok;
  } catch (error) {
    console.error("[DeathTracker] Failed to send Discord notification:", error);
    return false;
  }
}

export async function getDeathTrackerConfig(guildId: number) {
  const [config] = await db.select().from(deathTrackerConfig).where(eq(deathTrackerConfig.guildId, guildId));
  return config;
}

export async function saveDeathTrackerConfig(config: any) {
  const existing = await getDeathTrackerConfig(config.guildId);
  if (existing) {
    const [updated] = await db.update(deathTrackerConfig)
      .set(config)
      .where(eq(deathTrackerConfig.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(deathTrackerConfig).values(config).returning();
    return created;
  }
}

// Background job to run periodically
let deathTrackerInterval: NodeJS.Timeout | null = null;
let onlineDeathCheckInterval: NodeJS.Timeout | null = null;

// Get list of currently online AND recently-offline tracked players
// Recently-offline players are included because they may have died and logged off
async function getOnlineTrackedPlayers(): Promise<string[]> {
  const allPlayers = await db.select({ name: players.name }).from(players);
  const trackedNames = new Set(allPlayers.map(p => p.name));
  
  const recentlyOfflineCutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  
  const onlineChars = await db.select()
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));
  
  const recentlyOfflineChars = await db.select()
    .from(onlineCharacters)
    .where(
      and(
        eq(onlineCharacters.isCurrentlyOnline, false),
        gte(onlineCharacters.lastSeen, recentlyOfflineCutoff)
      )
    );
  
  const allRelevant = [...onlineChars, ...recentlyOfflineChars];
  const uniqueNames = new Set(
    allRelevant
      .filter(c => trackedNames.has(c.characterName))
      .map(c => c.characterName)
  );
  
  return Array.from(uniqueNames);
}

// Check deaths for a single character (priority check for online players)
async function checkDeathsForCharacter(characterName: string): Promise<number> {
  const player = await storage.getPlayerByName(characterName);
  if (!player || !player.guildId) return 0;
  
  const guild = await storage.getGuild(player.guildId);
  if (!guild) return 0;
  
  const victimGuildType = guild.isEnemy ? "enemy" : "main";
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1); // Only last 24 hours for online checks
  
  let newDeathsCount = 0;
  
  try {
    const characterDeaths = await fetchCharacterDeaths(characterName);
    if (!characterDeaths || !characterDeaths.deaths.length) return 0;
    
    for (const death of characterDeaths.deaths) {
      const deathDate = new Date(death.time);
      if (deathDate < cutoffDate) continue;
      
      const deathHash = generateDeathHash(characterName, death.time, death.level);
      const [existing] = await db.select().from(deaths).where(eq(deaths.deathHash, deathHash));
      if (existing) continue;
      
      const deathData = parseDeathEntry(
        characterName,
        player.level,
        player.vocation,
        death,
        victimGuildType,
        player.guildId
      );
      
      await db.insert(deaths).values(deathData);
      newDeathsCount++;
      console.log(`[DeathTracker] Priority check: ${characterName} killed by ${deathData.killerName}`);
    }
  } catch (error) {
    console.error(`[DeathTracker] Error in priority check for ${characterName}:`, error);
  }
  
  return newDeathsCount;
}

// Check if a character belongs to a tracked guild
async function getCharacterGuildInfo(characterName: string): Promise<{guildId: number | null, guildType: string | null, guildName: string | null}> {
  const player = await storage.getPlayerByName(characterName);
  if (player && player.guildId) {
    const guild = await storage.getGuild(player.guildId);
    return {
      guildId: player.guildId,
      guildType: guild?.isEnemy ? "enemy" : "main",
      guildName: guild?.name || null
    };
  }
  return { guildId: null, guildType: null, guildName: null };
}

// Check deaths for any online character (not just tracked guild members)
async function checkDeathsForAnyCharacter(characterName: string): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1); // Only last 24 hours
  
  let newDeathsCount = 0;
  
  try {
    const characterDeaths = await fetchCharacterDeaths(characterName);
    if (!characterDeaths || !characterDeaths.deaths.length) return 0;
    
    // Get victim's guild info (may be null for non-tracked players)
    const victimInfo = await getCharacterGuildInfo(characterName);
    
    for (const death of characterDeaths.deaths) {
      const deathDate = new Date(death.time);
      if (deathDate < cutoffDate) continue;
      
      const deathHash = generateDeathHash(characterName, death.time, death.level);
      const [existing] = await db.select().from(deaths).where(eq(deaths.deathHash, deathHash));
      if (existing) continue;
      
      // Check if killer is from a tracked guild
      const mainKiller = death.killers[0];
      let killerGuildInfo = { guildId: null as number | null, guildType: null as string | null, guildName: null as string | null };
      if (mainKiller?.player) {
        killerGuildInfo = await getCharacterGuildInfo(mainKiller.name);
      }
      
      // Store death if either victim OR killer is from tracked guilds
      const isRelevant = victimInfo.guildId !== null || killerGuildInfo.guildId !== null;
      
      // Create death record
      const deathData = {
        characterName,
        level: death.level,
        vocation: "Unknown",
        killerName: mainKiller?.name || "Unknown",
        killerGuild: killerGuildInfo.guildName,
        killerGuildId: killerGuildInfo.guildId,
        victimGuildId: victimInfo.guildId,
        victimGuildType: victimInfo.guildType,
        isPvp: death.killers.some(k => k.player),
        occurredAt: new Date(death.time),
        deathHash,
        description: death.reason,
        notified: !isRelevant, // Mark as already notified if not relevant (won't send notification)
      };
      
      await db.insert(deaths).values(deathData);
      newDeathsCount++;
      
      if (isRelevant) {
        console.log(`[DeathTracker] Relevant death: ${characterName} killed by ${deathData.killerName}`);
      }
    }
  } catch (error) {
    console.error(`[DeathTracker] Error checking deaths for ${characterName}:`, error);
  }
  
  return newDeathsCount;
}

// Get ALL online characters (not just tracked guilds)
async function getAllOnlineCharacters(): Promise<string[]> {
  const onlineChars = await db.select({ name: onlineCharacters.characterName })
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));
  return onlineChars.map(c => c.name);
}

let priorityCheckRunning = false;

// Priority death check for online players (runs every 1 minute)
// Checks ALL online players and stores all deaths, notifies only for relevant ones
export async function runOnlinePlayerDeathCheck(): Promise<number> {
  if (priorityCheckRunning) {
    console.log("[DeathTracker] Priority check skipped (previous check still running)");
    return 0;
  }
  priorityCheckRunning = true;
  
  try {
    const trackedOnline = await getOnlineTrackedPlayers();
    
    if (trackedOnline.length === 0) {
      return 0;
    }
    
    console.log(`[DeathTracker] Priority check: ${trackedOnline.length} tracked players (online + recently offline) in batches of ${CONCURRENT_BATCH_SIZE}`);
    
    const deathCounts = await processBatched(
      trackedOnline,
      CONCURRENT_BATCH_SIZE,
      BATCH_DELAY_MS,
      async (playerName) => {
        return await checkDeathsForAnyCharacter(playerName);
      }
    );
    
    const totalNewDeaths = deathCounts.reduce((sum, c) => sum + c, 0);
    
    if (totalNewDeaths > 0) {
      console.log(`[DeathTracker] Priority check found ${totalNewDeaths} new deaths`);
      await processNotifications();
    }
    
    return totalNewDeaths;
  } finally {
    priorityCheckRunning = false;
  }
}

const MAX_NOTIFICATION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours - skip notifications older than this
const DISCORD_RATE_LIMIT_DELAY_MS = 1000; // 1 second between Discord webhook sends

// Process and send notifications for unnotified deaths
export async function processNotifications(): Promise<number> {
  const unnotified = await getUnnotifiedDeaths();
  if (unnotified.length === 0) return 0;

  const configs = await db.select().from(deathTrackerConfig).where(eq(deathTrackerConfig.enabled, true));
  
  let notifiedCount = 0;
  let skippedOld = 0;
  const now = Date.now();
  
  for (const death of unnotified) {
    const deathAge = now - new Date(death.occurredAt).getTime();
    if (deathAge > MAX_NOTIFICATION_AGE_MS) {
      await markDeathAsNotified(death.id);
      skippedOld++;
      continue;
    }

    const isEnemy = death.victimGuildType === "enemy";
    let notificationSent = false;
    
    for (const config of configs) {
      const relatedGuildId = isEnemy ? config.guildId : death.victimGuildId;
      if (config.guildId !== relatedGuildId && !isEnemy) continue;
      if (isEnemy && !config.notifyEnemyGuildDeaths) continue;
      if (!isEnemy && !config.notifyMainGuildDeaths) continue;
      
      const webhookUrl = isEnemy ? config.enemyGuildWebhookUrl : config.mainGuildWebhookUrl;
      if (!webhookUrl) continue;
      
      const embed = formatDeathEmbed(death, isEnemy);
      const success = await sendDiscordNotification(webhookUrl, embed);
      
      if (success) {
        console.log(`[DeathTracker] Sent notification for ${death.characterName} to Discord`);
        notificationSent = true;
        
        await db.update(deathTrackerConfig)
          .set({ lastNotificationSentAt: new Date() })
          .where(eq(deathTrackerConfig.id, config.id));
        
        await new Promise(r => setTimeout(r, DISCORD_RATE_LIMIT_DELAY_MS));
      } else {
        console.error(`[DeathTracker] Failed to notify for ${death.characterName}`);
      }
    }
    
    const hasAnyWebhook = configs.some(c => 
      (isEnemy && c.enemyGuildWebhookUrl) || (!isEnemy && c.mainGuildWebhookUrl)
    );
    
    if (notificationSent || !hasAnyWebhook) {
      await markDeathAsNotified(death.id);
      notifiedCount++;
    }
  }
  
  if (skippedOld > 0) {
    console.log(`[DeathTracker] Skipped ${skippedOld} notifications older than 2 hours`);
  }
  
  return notifiedCount;
}

// Get all configs (for API)
export async function getAllDeathTrackerConfigs() {
  return await db.select().from(deathTrackerConfig);
}

export function startDeathTrackerJob(intervalMinutes: number = 5, onlineCheckIntervalMinutes: number = 1) {
    if (deathTrackerInterval) {
        clearInterval(deathTrackerInterval);
    }
    if (onlineDeathCheckInterval) {
        clearInterval(onlineDeathCheckInterval);
    }

    console.log(`[DEATH_TEST] 1. Funkcja startDeathTrackerJob zostala wywolana.`);

    // Full guild scan for offline players
    const runFullCheck = async () => {
        try {
            console.log("[DEATH_TEST] 2. runFullCheck wlasnie sie uruchomilo na starcie!");

            console.log("[DEATH_TEST] 3. Proba pobrania gildii z bazy danych...");
            const allGuilds = await storage.getGuilds();
            console.log(`[DEATH_TEST] 4. Sukces! Pobrano ${allGuilds.length} gildii.`);

            for (const guild of allGuilds) {
                console.log(`[DEATH_TEST] 5. Sprawdzam zgony dla gildii: ${guild.name} (ID: ${guild.id})`);
                const newDeaths = await checkDeathsForGuild(guild.id);
                console.log(`[DEATH_TEST] 6. Zakonczono sprawdzanie gildii ${guild.name}. Nowych zgonow: ${newDeaths}`);
            }

            console.log("[DEATH_TEST] 7. Proba pobrania nienotyfikowanych zgonow z bazy...");
            const unnotified = await getUnnotifiedDeaths();
            console.log(`[DEATH_TEST] 8. Sukces! Znaleziono ${unnotified.length} zgonow do wyslania.`);

            if (unnotified.length > 0) {
                const notified = await processNotifications();
                console.log(`[DEATH_TEST] 9. Powiadomienia przetworzone. Wyslano: ${notified}`);
            }

        } catch (error) {
            console.error("[DEATH_TEST] X. BLAD W UPALIE runFullCheck:", error);
        }
    };

    const runOnlineCheck = async () => {
        try {
            console.log("[DEATH_TEST] ONLINE. Odpalam runOnlinePlayerDeathCheck...");
            await runOnlinePlayerDeathCheck();
        } catch (error) {
            console.error("[DEATH_TEST] ONLINE_BLAD:", error);
        }
    };

    // Uruchomienie natychmiastowe
    runFullCheck();

    console.log("[DEATH_TEST] 10. Rejestruje interwal OFFLINE co " + intervalMinutes + " min.");
    deathTrackerInterval = setInterval(runFullCheck, intervalMinutes * 60 * 1000);

    setTimeout(() => {
        console.log("[DEATH_TEST] 11. Rejestruje interwal ONLINE co " + onlineCheckIntervalMinutes + " min.");
        runOnlineCheck();
        onlineDeathCheckInterval = setInterval(runOnlineCheck, onlineCheckIntervalMinutes * 60 * 1000);
    }, 30000);
}

export function stopDeathTrackerJob() {
  if (deathTrackerInterval) {
    clearInterval(deathTrackerInterval);
    deathTrackerInterval = null;
  }
  if (onlineDeathCheckInterval) {
    clearInterval(onlineDeathCheckInterval);
    onlineDeathCheckInterval = null;
  }
  console.log("[DeathTracker] Background jobs stopped");
}
