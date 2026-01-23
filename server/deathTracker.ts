// Death Tracker Service - Fetches deaths from TibiaData and sends Discord notifications
import { storage } from "./storage";
import { db } from "./db";
import { deaths, deathTrackerConfig, players, guilds } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const TIBIADATA_BASE = "https://api.tibiadata.com/v4";

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
  try {
    const response = await fetch(`${TIBIADATA_BASE}/character/${encodeURIComponent(characterName)}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.character?.character) return null;
    
    return {
      name: data.character.character.name,
      deaths: data.character.deaths || [],
    };
  } catch (error) {
    console.error(`Failed to fetch deaths for ${characterName}:`, error);
    return null;
  }
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
    await db.update(deathTrackerConfig).set(config).where(eq(deathTrackerConfig.id, existing.id));
    return existing;
  } else {
    const [created] = await db.insert(deathTrackerConfig).values(config).returning();
    return created;
  }
}

// Background job to run periodically
let deathTrackerInterval: NodeJS.Timeout | null = null;

// Process and send notifications for unnotified deaths
export async function processNotifications(): Promise<number> {
  const unnotified = await getUnnotifiedDeaths();
  if (unnotified.length === 0) return 0;

  // Get all configs with webhooks
  const configs = await db.select().from(deathTrackerConfig).where(eq(deathTrackerConfig.enabled, true));
  
  let notifiedCount = 0;
  
  for (const death of unnotified) {
    const isEnemy = death.victimGuildType === "enemy";
    
    // Find configs that should receive this notification
    for (const config of configs) {
      // Check if this death belongs to a guild linked to this config
      if (config.guildId !== death.victimGuildId) continue;
      
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
      } else {
        console.error(`[DeathTracker] Failed to notify for ${death.characterName}`);
      }
    }
    
    // Mark as notified regardless (to prevent spam on webhook errors)
    await markDeathAsNotified(death.id);
    notifiedCount++;
  }
  
  return notifiedCount;
}

// Get all configs (for API)
export async function getAllDeathTrackerConfigs() {
  return await db.select().from(deathTrackerConfig);
}

export function startDeathTrackerJob(intervalMinutes: number = 5) {
  if (deathTrackerInterval) {
    clearInterval(deathTrackerInterval);
  }

  console.log(`[DeathTracker] Starting background job (every ${intervalMinutes} minutes)`);
  
  const runCheck = async () => {
    try {
      console.log("[DeathTracker] Running death check...");
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
      console.error("[DeathTracker] Error in background job:", error);
    }
  };

  // Run immediately, then on interval
  runCheck();
  deathTrackerInterval = setInterval(runCheck, intervalMinutes * 60 * 1000);
}

export function stopDeathTrackerJob() {
  if (deathTrackerInterval) {
    clearInterval(deathTrackerInterval);
    deathTrackerInterval = null;
    console.log("[DeathTracker] Background job stopped");
  }
}
