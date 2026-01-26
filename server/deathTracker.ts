// Death Tracker Service - Fetches deaths from TibiaData and sends Discord notifications
import { storage } from "./storage";
import { db } from "./db";
import { deaths, deathTrackerConfig, players, guilds, onlineCharacters } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const TIBIADATA_BASE = "https://api.tibiadata.com/v4";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 6000]; // Exponential backoff

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

  console.log(`[DeathTracker] Checking ${guildPlayers.length} players from guild ${guild.name} (${victimGuildType})`);

  for (const player of guildPlayers) {
    try {
      const characterDeaths = await fetchCharacterDeaths(player.name);
      if (!characterDeaths || !characterDeaths.deaths.length) continue;

      for (const death of characterDeaths.deaths) {
        const deathDate = new Date(death.time);
        
        // Only process deaths within the time window
        if (deathDate < cutoffDate) continue;

        const deathHash = generateDeathHash(player.name, death.time, death.level);
        
        // Check if this death already exists
        const [existing] = await db.select().from(deaths).where(eq(deaths.deathHash, deathHash));
        if (existing) continue;

        // New death - store it
        const deathData = parseDeathEntry(
          player.name,
          player.level,
          player.vocation,
          death,
          victimGuildType,
          guildId
        );

        await db.insert(deaths).values(deathData);
        newDeathsCount++;
        console.log(`[DeathTracker] New death detected: ${player.name} killed by ${deathData.killerName}`);
      }

      // Rate limit - wait 300ms between characters to speed things up
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`[DeathTracker] Error checking deaths for ${player.name}:`, error);
    }
  }

  return newDeathsCount;
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

export function formatDeathEmbed(death: any, isEnemy: boolean) {
  const color = isEnemy ? 0x22c55e : 0xef4444; // Green for enemy deaths, red for guild deaths
  const title = isEnemy ? "☠️ Enemy Death Detected!" : "💀 Guild Member Died!";
  
  const isPvpText = death.isPvp ? "⚔️ PvP Kill" : "🐉 PvE Death";
  const timestamp = death.occurredAt ? new Date(death.occurredAt).toISOString() : new Date().toISOString();

  return {
    embeds: [{
      title,
      color,
      fields: [
        { name: "Character", value: death.characterName, inline: true },
        { name: "Level", value: death.level?.toString() || "?", inline: true },
        { name: "Vocation", value: death.vocation || "Unknown", inline: true },
        { name: "Killed By", value: death.killerName || "Unknown", inline: true },
        { name: "Killer Guild", value: death.killerGuild || "None", inline: true },
        { name: "Type", value: isPvpText, inline: true },
      ],
      footer: { text: "TibiaData Death Tracker" },
      timestamp,
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

// Get list of currently online tracked players (from main + enemy guilds)
async function getOnlineTrackedPlayers(): Promise<string[]> {
  const allPlayers = await db.select({ name: players.name }).from(players);
  const trackedNames = new Set(allPlayers.map(p => p.name));
  
  const onlineChars = await db.select()
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));
  
  return onlineChars
    .filter(c => trackedNames.has(c.characterName))
    .map(c => c.characterName);
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

// Priority death check for online players (runs every 1 minute)
// Checks ALL online players and stores all deaths, notifies only for relevant ones
export async function runOnlinePlayerDeathCheck(): Promise<number> {
  // Get tracked players for priority
  const trackedOnline = await getOnlineTrackedPlayers();
  
  if (trackedOnline.length === 0) {
    return 0;
  }
  
  console.log(`[DeathTracker] Priority check: ${trackedOnline.length} tracked online players`);
  
  let totalNewDeaths = 0;
  
  // Check tracked online players with checkDeathsForAnyCharacter (stores all, notifies relevant)
  for (const playerName of trackedOnline) {
    const newDeaths = await checkDeathsForAnyCharacter(playerName);
    totalNewDeaths += newDeaths;
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  if (totalNewDeaths > 0) {
    console.log(`[DeathTracker] Priority check found ${totalNewDeaths} new deaths`);
    await processNotifications();
  }
  
  return totalNewDeaths;
}

// Process and send notifications for unnotified deaths
export async function processNotifications(): Promise<number> {
  const unnotified = await getUnnotifiedDeaths();
  if (unnotified.length === 0) return 0;

  // Get all enabled configs with webhooks
  const configs = await db.select().from(deathTrackerConfig).where(eq(deathTrackerConfig.enabled, true));
  
  let notifiedCount = 0;
  
  for (const death of unnotified) {
    const isEnemy = death.victimGuildType === "enemy";
    let notificationSent = false;
    
    // Find configs that should receive this notification
    // A single config can handle both main and enemy deaths - we look for configs linked to main guild
    // or any enabled config (for server-wide notifications)
    for (const config of configs) {
      // For main guild deaths, config.guildId should match the victim's guild
      // For enemy deaths, we use the config from the main guild (which tracks enemies)
      // So we look for configs where guildId matches main guild (not enemy)
      
      // Get the main guild this death is related to
      const relatedGuildId = isEnemy ? config.guildId : death.victimGuildId;
      
      // Skip if this config is not for the related guild
      if (config.guildId !== relatedGuildId && !isEnemy) continue;
      
      // Check notification preferences
      if (isEnemy && !config.notifyEnemyGuildDeaths) continue;
      if (!isEnemy && !config.notifyMainGuildDeaths) continue;
      
      // Get the appropriate webhook URL
      const webhookUrl = isEnemy ? config.enemyGuildWebhookUrl : config.mainGuildWebhookUrl;
      if (!webhookUrl) continue;
      
      // Send notification
      const embed = formatDeathEmbed(death, isEnemy);
      const success = await sendDiscordNotification(webhookUrl, embed);
      
      if (success) {
        console.log(`[DeathTracker] Sent notification for ${death.characterName} to Discord`);
        notificationSent = true;
      } else {
        console.error(`[DeathTracker] Failed to notify for ${death.characterName}`);
      }
    }
    
    // Only mark as notified if we actually sent the notification or if no webhooks are configured
    // This allows retries if webhook delivery fails when webhooks ARE configured
    const hasAnyWebhook = configs.some(c => 
      (isEnemy && c.enemyGuildWebhookUrl) || (!isEnemy && c.mainGuildWebhookUrl)
    );
    
    if (notificationSent || !hasAnyWebhook) {
      await markDeathAsNotified(death.id);
      notifiedCount++;
    }
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

  console.log(`[DeathTracker] Starting background job (offline: every ${intervalMinutes}min, online: every ${onlineCheckIntervalMinutes}min)`);
  
  // Full guild scan for offline players
  const runFullCheck = async () => {
    try {
      console.log("[DeathTracker] Running full death check (all guild players)...");
      const allGuilds = await storage.getGuilds();
      
      for (const guild of allGuilds) {
        const newDeaths = await checkDeathsForGuild(guild.id);
        if (newDeaths > 0) {
          console.log(`[DeathTracker] Found ${newDeaths} new deaths for guild ${guild.name}`);
        }
      }
      
      // Process unnotified deaths and send Discord notifications
      const unnotified = await getUnnotifiedDeaths();
      if (unnotified.length > 0) {
        console.log(`[DeathTracker] ${unnotified.length} deaths pending notification`);
        const notified = await processNotifications();
        console.log(`[DeathTracker] Sent ${notified} notifications`);
      }
      
    } catch (error) {
      console.error("[DeathTracker] Error in full check:", error);
    }
  };

  // Priority check for online players only
  const runOnlineCheck = async () => {
    try {
      await runOnlinePlayerDeathCheck();
    } catch (error) {
      console.error("[DeathTracker] Error in online check:", error);
    }
  };

  // Run full check immediately, then on interval
  runFullCheck();
  deathTrackerInterval = setInterval(runFullCheck, intervalMinutes * 60 * 1000);
  
  // Run online check after 30 seconds delay, then every minute
  setTimeout(() => {
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
