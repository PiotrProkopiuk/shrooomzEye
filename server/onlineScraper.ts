import { db } from "./db";
import { onlineSnapshots, onlineCharacters, onlineSessions, players, guilds } from "@shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

interface OnlinePlayer {
  name: string;
  level: number;
  vocation: string;
}

interface TibiaDataWorldResponse {
  world: {
    name: string;
    status: string;
    players_online: number;
    online_players: Array<{
      name: string;
      level: number;
      vocation: string;
    }>;
  };
}

interface ScraperConfig {
  world: string;
  scrapeIntervalMs: number;
}

const DEFAULT_CONFIG: ScraperConfig = {
  world: "Antica",
  scrapeIntervalMs: 60000, // 60 seconds
};

let scraperInterval: NodeJS.Timeout | null = null;
let isScraperRunning = false;
let lastScrapeTime: Date | null = null;
let lastScrapePlayerCount = 0;

export async function scrapeOnlinePlayers(world: string = "Antica"): Promise<OnlinePlayer[]> {
  const url = `https://api.tibiadata.com/v4/world/${world}`;
  
  try {
    console.log(`[OnlineScraper] Fetching online players from TibiaData API for ${world}`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TibiaGuildBot/1.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: TibiaDataWorldResponse = await response.json();
    
    if (!data.world || !data.world.online_players) {
      console.log("[OnlineScraper] No online players in response");
      return [];
    }

    const players = data.world.online_players.map(p => ({
      name: p.name,
      level: p.level,
      vocation: p.vocation,
    }));

    console.log(`[OnlineScraper] Fetched ${players.length} online players from TibiaData`);
    return players;
  } catch (error) {
    console.error(`[OnlineScraper] Error fetching ${world}:`, error);
    throw error;
  }
}

export async function processOnlineSnapshot(world: string = "Antica"): Promise<{
  newPlayers: number;
  loggedOff: number;
  totalOnline: number;
}> {
  const now = new Date();
  const onlinePlayers = await scrapeOnlinePlayers(world);
  
  if (onlinePlayers.length === 0) {
    console.log("[OnlineScraper] No players found, skipping snapshot");
    return { newPlayers: 0, loggedOff: 0, totalOnline: 0 };
  }

  const onlineNames = onlinePlayers.map(p => p.name);
  
  const trackedGuilds = await db.select({ name: guilds.name })
    .from(guilds);
  const trackedGuildNames = new Set(trackedGuilds.map(g => g.name.toLowerCase()));

  const currentlyOnline = await db.select()
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));

  const previouslyOnlineNames = new Set(currentlyOnline.map(c => c.characterName));
  const nowOnlineNames = new Set(onlineNames);

  const newlyLoggedIn = onlinePlayers.filter(p => !previouslyOnlineNames.has(p.name));
  const loggedOff = currentlyOnline.filter(c => !nowOnlineNames.has(c.characterName));

  for (const player of onlinePlayers) {
    const existing = await db.select()
      .from(onlineCharacters)
      .where(eq(onlineCharacters.characterName, player.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(onlineCharacters).values({
        characterName: player.name,
        world,
        level: player.level,
        vocation: player.vocation,
        lastSeen: now,
        isCurrentlyOnline: true,
        isTrackedGuild: false,
      });
    } else {
      await db.update(onlineCharacters)
        .set({
          level: player.level,
          vocation: player.vocation,
          lastSeen: now,
          isCurrentlyOnline: true,
        })
        .where(eq(onlineCharacters.characterName, player.name));
    }

    await db.insert(onlineSnapshots).values({
      characterName: player.name,
      world,
      level: player.level,
      vocation: player.vocation,
      isOnline: true,
      checkedAt: now,
    });
  }

  for (const char of loggedOff) {
    await db.update(onlineCharacters)
      .set({ isCurrentlyOnline: false })
      .where(eq(onlineCharacters.id, char.id));

    const openSession = await db.select()
      .from(onlineSessions)
      .where(and(
        eq(onlineSessions.characterName, char.characterName),
        isNull(onlineSessions.sessionEnd)
      ))
      .limit(1);

    if (openSession.length > 0) {
      const session = openSession[0];
      const durationMs = now.getTime() - new Date(session.sessionStart).getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      await db.update(onlineSessions)
        .set({
          sessionEnd: now,
          durationMinutes,
        })
        .where(eq(onlineSessions.id, session.id));
    }
  }

  for (const player of newlyLoggedIn) {
    await db.insert(onlineSessions).values({
      characterName: player.name,
      world,
      sessionStart: now,
    });
  }

  lastScrapeTime = now;
  lastScrapePlayerCount = onlinePlayers.length;

  console.log(`[OnlineScraper] Snapshot complete: ${onlinePlayers.length} online, ${newlyLoggedIn.length} logged in, ${loggedOff.length} logged off`);

  return {
    newPlayers: newlyLoggedIn.length,
    loggedOff: loggedOff.length,
    totalOnline: onlinePlayers.length,
  };
}

export async function getOnlineCharactersFromTrackedGuilds(): Promise<string[]> {
  const trackedPlayers = await db.select({ name: players.name })
    .from(players);
  
  const trackedNames = new Set(trackedPlayers.map(p => p.name));

  const onlineChars = await db.select()
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));

  return onlineChars
    .filter(c => trackedNames.has(c.characterName))
    .map(c => c.characterName);
}

export async function getAllOnlineCharacters(): Promise<string[]> {
  const onlineChars = await db.select({ name: onlineCharacters.characterName })
    .from(onlineCharacters)
    .where(eq(onlineCharacters.isCurrentlyOnline, true));

  return onlineChars.map(c => c.name);
}

export function startOnlineScraper(config: Partial<ScraperConfig> = {}): void {
  if (isScraperRunning) {
    console.log("[OnlineScraper] Scraper already running");
    return;
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`[OnlineScraper] Starting scraper for ${finalConfig.world} (interval: ${finalConfig.scrapeIntervalMs}ms)`);
  
  isScraperRunning = true;

  processOnlineSnapshot(finalConfig.world).catch(err => {
    console.error("[OnlineScraper] Initial scrape failed:", err);
  });

  scraperInterval = setInterval(async () => {
    try {
      await processOnlineSnapshot(finalConfig.world);
    } catch (error) {
      console.error("[OnlineScraper] Scrape failed:", error);
    }
  }, finalConfig.scrapeIntervalMs);
}

export function stopOnlineScraper(): void {
  if (scraperInterval) {
    clearInterval(scraperInterval);
    scraperInterval = null;
  }
  isScraperRunning = false;
  console.log("[OnlineScraper] Scraper stopped");
}

export function getScraperStatus(): {
  running: boolean;
  lastScrape: Date | null;
  lastPlayerCount: number;
} {
  return {
    running: isScraperRunning,
    lastScrape: lastScrapeTime,
    lastPlayerCount: lastScrapePlayerCount,
  };
}
