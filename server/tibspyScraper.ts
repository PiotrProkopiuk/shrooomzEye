import { db } from "./db";
import { 
  tibspyCharacterData, 
  tibspyScrapeLogs, 
  tibspyConfig,
  players,
  guilds,
  type Player,
  type Guild
} from "@shared/schema";
import { eq, desc, and, lt, sql, isNull, or, asc } from "drizzle-orm";

const TIBSPY_API_BASE = "https://api.tibspy.com/api/private/v1";

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://tibspy.com',
  'Referer': 'https://tibspy.com/',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
};

interface TibSpyScraperConfig {
  dailyScrapeLimit: number;
  batchSize: number;
  delayBetweenRequests: number;
  delayBetweenBatches: number;
  characterCooldownHours: number;
  nightlyStartHour: number;
  nightlyEndHour: number;
  enabled: boolean;
}

interface ScrapeResult {
  characterName: string;
  success: boolean;
  reason?: string;
  data?: any;
}

interface ScraperMetrics {
  date: string;
  totalAttempts: number;
  successfulScrapes: number;
  skippedCooldown: number;
  skippedLimit: number;
  blocked: number;
  failed: number;
  remainingDaily: number;
}

const DEFAULT_CONFIG: TibSpyScraperConfig = {
  dailyScrapeLimit: 100,
  batchSize: 5,
  delayBetweenRequests: 2000,
  delayBetweenBatches: 15000,
  characterCooldownHours: 24,
  nightlyStartHour: 1,
  nightlyEndHour: 5,
  enabled: true,
};

const CONFIG_KEYS: Record<keyof TibSpyScraperConfig, string> = {
  dailyScrapeLimit: "tibspy_daily_limit",
  batchSize: "tibspy_batch_size",
  delayBetweenRequests: "tibspy_request_delay_ms",
  delayBetweenBatches: "tibspy_batch_delay_ms",
  characterCooldownHours: "tibspy_cooldown_hours",
  nightlyStartHour: "tibspy_nightly_start_hour",
  nightlyEndHour: "tibspy_nightly_end_hour",
  enabled: "tibspy_enabled",
};

class TibSpyScraperService {
  private isRunning = false;
  private isBlocked = false;
  private blockedUntil: Date | null = null;
  private currentBatchIndex = 0;

  async getConfig(): Promise<TibSpyScraperConfig> {
    const config = { ...DEFAULT_CONFIG };
    
    try {
      const rows = await db.select().from(tibspyConfig);
      const configMap = new Map(rows.map(r => [r.key, r.value]));
      
      if (configMap.has(CONFIG_KEYS.dailyScrapeLimit)) {
        config.dailyScrapeLimit = parseInt(configMap.get(CONFIG_KEYS.dailyScrapeLimit)!);
      }
      if (configMap.has(CONFIG_KEYS.batchSize)) {
        config.batchSize = parseInt(configMap.get(CONFIG_KEYS.batchSize)!);
      }
      if (configMap.has(CONFIG_KEYS.delayBetweenRequests)) {
        config.delayBetweenRequests = parseInt(configMap.get(CONFIG_KEYS.delayBetweenRequests)!);
      }
      if (configMap.has(CONFIG_KEYS.delayBetweenBatches)) {
        config.delayBetweenBatches = parseInt(configMap.get(CONFIG_KEYS.delayBetweenBatches)!);
      }
      if (configMap.has(CONFIG_KEYS.characterCooldownHours)) {
        config.characterCooldownHours = parseInt(configMap.get(CONFIG_KEYS.characterCooldownHours)!);
      }
      if (configMap.has(CONFIG_KEYS.nightlyStartHour)) {
        config.nightlyStartHour = parseInt(configMap.get(CONFIG_KEYS.nightlyStartHour)!);
      }
      if (configMap.has(CONFIG_KEYS.nightlyEndHour)) {
        config.nightlyEndHour = parseInt(configMap.get(CONFIG_KEYS.nightlyEndHour)!);
      }
      if (configMap.has(CONFIG_KEYS.enabled)) {
        config.enabled = configMap.get(CONFIG_KEYS.enabled) === "true";
      }
    } catch (error) {
      console.log("[TibSpy] Using default config");
    }
    
    return config;
  }

  async setConfigValue(key: keyof TibSpyScraperConfig, value: string): Promise<void> {
    const configKey = CONFIG_KEYS[key];
    await db.insert(tibspyConfig)
      .values({ key: configKey, value })
      .onConflictDoUpdate({
        target: tibspyConfig.key,
        set: { value, updatedAt: new Date() }
      });
  }

  private getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  private async getTodayLog(): Promise<{ id: number; totalAttempts: number; successfulScrapes: number; skippedCooldown: number; skippedLimit: number; blocked: number; failed: number }> {
    const today = this.getTodayDate();
    
    let [log] = await db.select().from(tibspyScrapeLogs).where(eq(tibspyScrapeLogs.date, today));
    
    if (!log) {
      const [newLog] = await db.insert(tibspyScrapeLogs)
        .values({ date: today })
        .returning();
      log = newLog;
    }
    
    return {
      id: log.id,
      totalAttempts: log.totalAttempts || 0,
      successfulScrapes: log.successfulScrapes || 0,
      skippedCooldown: log.skippedCooldown || 0,
      skippedLimit: log.skippedLimit || 0,
      blocked: log.blocked || 0,
      failed: log.failed || 0,
    };
  }

  private async incrementLogCounter(field: 'totalAttempts' | 'successfulScrapes' | 'skippedCooldown' | 'skippedLimit' | 'blocked' | 'failed'): Promise<void> {
    const today = this.getTodayDate();
    const columnMap = {
      totalAttempts: tibspyScrapeLogs.totalAttempts,
      successfulScrapes: tibspyScrapeLogs.successfulScrapes,
      skippedCooldown: tibspyScrapeLogs.skippedCooldown,
      skippedLimit: tibspyScrapeLogs.skippedLimit,
      blocked: tibspyScrapeLogs.blocked,
      failed: tibspyScrapeLogs.failed,
    };
    
    await db.update(tibspyScrapeLogs)
      .set({ 
        [field]: sql`COALESCE(${columnMap[field]}, 0) + 1`,
        updatedAt: new Date()
      })
      .where(eq(tibspyScrapeLogs.date, today));
  }

  private isWithinNightlyWindow(config: TibSpyScraperConfig): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (config.nightlyStartHour < config.nightlyEndHour) {
      return currentHour >= config.nightlyStartHour && currentHour < config.nightlyEndHour;
    } else {
      return currentHour >= config.nightlyStartHour || currentHour < config.nightlyEndHour;
    }
  }

  private async getCharactersToScrape(config: TibSpyScraperConfig): Promise<{ name: string; priority: 'high' | 'normal' | 'low'; guildType: string | null }[]> {
    const cooldownThreshold = new Date(Date.now() - config.characterCooldownHours * 60 * 60 * 1000);
    
    const allPlayers = await db.select({
      id: players.id,
      name: players.name,
      guildId: players.guildId,
      guildType: players.guildType,
    }).from(players);

    const guildsList = await db.select().from(guilds);
    const guildMap = new Map(guildsList.map(g => [g.id, g]));

    const existingData = await db.select({
      characterName: tibspyCharacterData.characterName,
      lastScrapedAt: tibspyCharacterData.lastScrapedAt,
      priority: tibspyCharacterData.priority,
    }).from(tibspyCharacterData);

    const dataMap = new Map(existingData.map(d => [d.characterName.toLowerCase(), d]));

    const candidates: { name: string; priority: 'high' | 'normal' | 'low'; guildType: string | null; sortOrder: number }[] = [];

    for (const player of allPlayers) {
      const existing = dataMap.get(player.name.toLowerCase());
      
      if (existing?.lastScrapedAt && existing.lastScrapedAt > cooldownThreshold) {
        continue;
      }

      const guild = player.guildId ? guildMap.get(player.guildId) : null;
      let priority: 'high' | 'normal' | 'low' = 'normal';
      let sortOrder = 2;

      if (!existing) {
        priority = 'high';
        sortOrder = 0;
      } else if (guild?.isEnemy) {
        priority = 'normal';
        sortOrder = 1;
      } else {
        priority = 'low';
        sortOrder = 3;
      }

      candidates.push({
        name: player.name,
        priority,
        guildType: player.guildType,
        sortOrder,
      });
    }

    candidates.sort((a, b) => a.sortOrder - b.sortOrder);

    return candidates.map(c => ({ name: c.name, priority: c.priority, guildType: c.guildType }));
  }

  private async scrapeCharacter(characterName: string): Promise<ScrapeResult> {
    try {
      console.log(`[TibSpy] Starting API fetch for ${characterName}`);
      
      // First, try to get existing data from history (this works without auth)
      const historyResponse = await fetch(`${TIBSPY_API_BASE}/report/history/${encodeURIComponent(characterName.toLowerCase())}`, {
        headers: BROWSER_HEADERS,
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        if (historyData && Array.isArray(historyData) && historyData.length > 0) {
          const latestReport = historyData[0];
          let parsedData: any = {};

          try {
            if (latestReport.jsonData) {
              parsedData = JSON.parse(latestReport.jsonData);
            }
          } catch (e) {
            console.log(`[TibSpy] Failed to parse jsonData for ${characterName}`);
          }

          const data = {
            scannedCharacter: parsedData.scannedCharacter || characterName,
            characters: parsedData.characters || [],
            jobId: latestReport.jobId,
            createTimestamp: latestReport.createTimestamp,
          };

          console.log(`[TibSpy] Found existing data for ${characterName}, ${data.characters?.length || 0} linked characters`);

          await db.insert(tibspyCharacterData)
            .values({
              characterName,
              lastScrapedAt: new Date(),
              scrapeCount: 1,
              data,
            })
            .onConflictDoUpdate({
              target: tibspyCharacterData.characterName,
              set: {
                lastScrapedAt: new Date(),
                scrapeCount: sql`COALESCE(${tibspyCharacterData.scrapeCount}, 0) + 1`,
                data,
                updatedAt: new Date(),
              }
            });

          return { characterName, success: true, data };
        }
      }

      // No existing data - try to register a new scan
      console.log(`[TibSpy] No existing data, attempting to register scan for ${characterName}`);
      
      const registerResponse = await fetch(`${TIBSPY_API_BASE}/report/register`, {
        method: 'POST',
        headers: {
          ...BROWSER_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterName: characterName.toLowerCase() }),
      });

      if (!registerResponse.ok) {
        console.log(`[TibSpy] Register failed for ${characterName}: ${registerResponse.status} - character not yet scanned on TibSpy`);
        return { characterName, success: false, reason: 'not_scanned_yet' };
      }

      const registerData = await registerResponse.json();
      const jobId = registerData.jobId;

      if (!jobId) {
        console.log(`[TibSpy] No jobId returned for ${characterName}`);
        return { characterName, success: false, reason: 'no_job_id' };
      }

      console.log(`[TibSpy] Job registered for ${characterName}: ${jobId}`);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30;
      let isReady = false;

      while (attempts < maxAttempts && !isReady) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`${TIBSPY_API_BASE}/report/${jobId}/status`, {
          headers: BROWSER_HEADERS,
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.reportDataStatus === 'READY') {
            isReady = true;
            console.log(`[TibSpy] Report ready for ${characterName}`);
          }
        }
        attempts++;
      }

      if (!isReady) {
        console.log(`[TibSpy] Timeout waiting for report: ${characterName}`);
        return { characterName, success: false, reason: 'timeout' };
      }

      // Fetch the newly created report
      const newHistoryResponse = await fetch(`${TIBSPY_API_BASE}/report/history/${encodeURIComponent(characterName.toLowerCase())}`, {
        headers: BROWSER_HEADERS,
      });

      if (!newHistoryResponse.ok) {
        console.log(`[TibSpy] History fetch failed for ${characterName}: ${newHistoryResponse.status}`);
        return { characterName, success: false, reason: 'history_failed' };
      }

      const newHistoryData = await newHistoryResponse.json();
      
      if (!newHistoryData || !Array.isArray(newHistoryData) || newHistoryData.length === 0) {
        console.log(`[TibSpy] No history data after scan for ${characterName}`);
        return { characterName, success: false, reason: 'no_data' };
      }

      const latestReport = newHistoryData[0];
      let parsedData: any = {};

      try {
        if (latestReport.jsonData) {
          parsedData = JSON.parse(latestReport.jsonData);
        }
      } catch (e) {
        console.log(`[TibSpy] Failed to parse jsonData for ${characterName}`);
      }

      const data = {
        scannedCharacter: parsedData.scannedCharacter || characterName,
        characters: parsedData.characters || [],
        jobId: latestReport.jobId,
        createTimestamp: latestReport.createTimestamp,
      };

      console.log(`[TibSpy] Successfully scraped ${characterName}, found ${data.characters?.length || 0} linked characters`);

      await db.insert(tibspyCharacterData)
        .values({
          characterName,
          lastScrapedAt: new Date(),
          scrapeCount: 1,
          data,
        })
        .onConflictDoUpdate({
          target: tibspyCharacterData.characterName,
          set: {
            lastScrapedAt: new Date(),
            scrapeCount: sql`COALESCE(${tibspyCharacterData.scrapeCount}, 0) + 1`,
            data,
            updatedAt: new Date(),
          }
        });

      return { characterName, success: true, data };
    } catch (error: any) {
      console.error(`[TibSpy] Error scraping ${characterName}:`, error.message);
      return { characterName, success: false, reason: 'error' };
    }
  }

  async scrapeCharacterNow(characterName: string): Promise<ScrapeResult> {
    console.log(`[TibSpy] Immediate scrape requested for ${characterName}`);
    return this.scrapeCharacter(characterName);
  }

  async runBatchScrape(): Promise<{ processed: number; results: ScrapeResult[] }> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      console.log("[TibSpy] Scraper is disabled");
      return { processed: 0, results: [] };
    }

    if (!this.isWithinNightlyWindow(config)) {
      console.log("[TibSpy] Outside nightly window, skipping");
      return { processed: 0, results: [] };
    }

    if (this.isBlocked && this.blockedUntil && this.blockedUntil > new Date()) {
      console.log("[TibSpy] Scraper is blocked until", this.blockedUntil);
      return { processed: 0, results: [] };
    }

    if (this.isRunning) {
      console.log("[TibSpy] Scraper is already running");
      return { processed: 0, results: [] };
    }

    this.isRunning = true;
    this.isBlocked = false;
    this.blockedUntil = null;

    try {
      const todayLog = await this.getTodayLog();
      const remainingDaily = config.dailyScrapeLimit - todayLog.successfulScrapes;

      if (remainingDaily <= 0) {
        console.log("[TibSpy] Daily limit reached");
        return { processed: 0, results: [] };
      }

      const characters = await this.getCharactersToScrape(config);
      const batchCharacters = characters.slice(0, Math.min(config.batchSize, remainingDaily));

      console.log(`[TibSpy] Processing batch of ${batchCharacters.length} characters (${remainingDaily} remaining today)`);

      const results: ScrapeResult[] = [];

      for (let i = 0; i < batchCharacters.length; i++) {
        const char = batchCharacters[i];
        
        await this.incrementLogCounter('totalAttempts');
        
        const result = await this.scrapeCharacter(char.name);
        results.push(result);

        if (result.success) {
          await this.incrementLogCounter('successfulScrapes');
          console.log(`[TibSpy] Successfully scraped ${char.name} (${char.priority} priority)`);
        } else if (result.reason === 'blocked') {
          await this.incrementLogCounter('blocked');
          this.isBlocked = true;
          this.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          console.log("[TibSpy] Blocked by TibSpy, stopping scraper until tomorrow");
          break;
        } else {
          await this.incrementLogCounter('failed');
        }

        if (i < batchCharacters.length - 1) {
          await new Promise(r => setTimeout(r, config.delayBetweenRequests));
        }
      }

      return { processed: results.length, results };
    } finally {
      this.isRunning = false;
    }
  }

  async getMetrics(): Promise<ScraperMetrics> {
    const config = await this.getConfig();
    const todayLog = await this.getTodayLog();
    
    return {
      date: this.getTodayDate(),
      totalAttempts: todayLog.totalAttempts,
      successfulScrapes: todayLog.successfulScrapes,
      skippedCooldown: todayLog.skippedCooldown,
      skippedLimit: todayLog.skippedLimit,
      blocked: todayLog.blocked,
      failed: todayLog.failed,
      remainingDaily: Math.max(0, config.dailyScrapeLimit - todayLog.successfulScrapes),
    };
  }

  async getStatus(): Promise<{
    enabled: boolean;
    running: boolean;
    blocked: boolean;
    blockedUntil: string | null;
    withinNightlyWindow: boolean;
    config: TibSpyScraperConfig;
    metrics: ScraperMetrics;
  }> {
    const config = await this.getConfig();
    const metrics = await this.getMetrics();
    
    return {
      enabled: config.enabled,
      running: this.isRunning,
      blocked: this.isBlocked,
      blockedUntil: this.blockedUntil?.toISOString() || null,
      withinNightlyWindow: this.isWithinNightlyWindow(config),
      config,
      metrics,
    };
  }

  async getRecentLogs(days: number = 7): Promise<any[]> {
    return db.select()
      .from(tibspyScrapeLogs)
      .orderBy(desc(tibspyScrapeLogs.date))
      .limit(days);
  }

  async getCharacterData(characterName: string): Promise<any | null> {
    const [data] = await db.select()
      .from(tibspyCharacterData)
      .where(eq(tibspyCharacterData.characterName, characterName));
    return data || null;
  }

  async queueCharacter(characterName: string, priority: 'high' | 'normal' | 'low' = 'high'): Promise<void> {
    await db.insert(tibspyCharacterData)
      .values({
        characterName,
        priority,
        lastScrapedAt: null,
      })
      .onConflictDoUpdate({
        target: tibspyCharacterData.characterName,
        set: { priority, updatedAt: new Date() }
      });
    console.log(`[TibSpy] Queued ${characterName} with ${priority} priority`);
  }

  async startNightlyScheduler(): Promise<void> {
    const config = await this.getConfig();
    
    console.log(`[TibSpy] Nightly scheduler started (window: ${config.nightlyStartHour}:00 - ${config.nightlyEndHour}:00)`);
    
    const checkInterval = setInterval(async () => {
      const currentConfig = await this.getConfig();
      
      if (!currentConfig.enabled) {
        return;
      }

      if (this.isWithinNightlyWindow(currentConfig)) {
        console.log("[TibSpy] Within nightly window, running batch...");
        const result = await this.runBatchScrape();
        
        if (result.processed > 0) {
          console.log(`[TibSpy] Batch complete: ${result.processed} processed`);
          
          const todayLog = await this.getTodayLog();
          if (todayLog.successfulScrapes < currentConfig.dailyScrapeLimit && !this.isBlocked) {
            console.log(`[TibSpy] Waiting ${currentConfig.delayBetweenBatches}ms before next batch...`);
          }
        }
      }
    }, 60000);
  }

  async disable(): Promise<void> {
    await this.setConfigValue('enabled', 'false');
    console.log("[TibSpy] Scraper disabled");
  }

  async enable(): Promise<void> {
    await this.setConfigValue('enabled', 'true');
    this.isBlocked = false;
    this.blockedUntil = null;
    console.log("[TibSpy] Scraper enabled");
  }
}

export const tibspyScraper = new TibSpyScraperService();
