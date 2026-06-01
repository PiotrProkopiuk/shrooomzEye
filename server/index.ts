// Load environment variables FIRST before any other imports
import "./env";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startDeathTrackerJob } from "./deathTracker";
import { startOnlineScraper } from "./onlineScraper";
import { startGuildSyncScheduler } from "./guildSyncService";
import { storage } from "./storage";
import { fetchGuildMembers } from "./tibiadata";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Configurable intervals (defaults for PROD, can be overridden via env vars)
      const isDevMode = process.env.NODE_ENV !== 'production';
      const deathTrackerOfflineMin = parseInt(process.env.DEATH_TRACKER_OFFLINE_MIN || (isDevMode ? '120' : '15'), 10);
      const deathTrackerOnlineMin = parseInt(process.env.DEATH_TRACKER_ONLINE_MIN || (isDevMode ? '5' : '1'), 10);
      const onlineScraperSec = parseInt(process.env.ONLINE_SCRAPER_SEC || (isDevMode ? '300' : '60'), 10);
      
      // Start the death tracker background job
      startDeathTrackerJob(deathTrackerOfflineMin, deathTrackerOnlineMin);
      log(`Death tracker cron started (online: ${deathTrackerOnlineMin}min, offline: ${deathTrackerOfflineMin}min)`);
      
      // Start the online players scraper
      startOnlineScraper({ world: "Antica", scrapeIntervalMs: onlineScraperSec * 1000 });
      log(`Online scraper cron started (every ${onlineScraperSec} seconds)`);
      
      // Start guild sync scheduler (join/leave detection)
      const guildSyncMin = parseInt(process.env.GUILD_SYNC_MIN || '15', 10);
      try {
        startGuildSyncScheduler(guildSyncMin);
        log(`Guild sync scheduler started (every ${guildSyncMin} min)`);
      } catch (err) {
        console.error("[GuildSync] Failed to start scheduler:", err);
      }
      
      // Server save scheduler (10:00 CET daily)
      // Store last run dates in memory (will reset on server restart, but that's acceptable)
      let lastResetDate = "";
      let lastFullSyncDate = "";
      
      setInterval(async () => {
        const now = new Date();
        
        // Get proper CET/CEST time using Intl API
        const cetTimeStr = now.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', hour12: false });
        const [hourStr, minuteStr] = cetTimeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        
        // Get today's date in CET timezone
        const cetDateStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }).split(',')[0];
        const todayDate = cetDateStr;
        
        // 10:00 CET - Reset all player start levels
        if (hour === 10 && minute < 5 && lastResetDate !== todayDate) {
          try {
            const count = await storage.resetAllPlayersStartLevel();
            log(`Server save: ${count} players start levels reset`);
            lastResetDate = todayDate;
          } catch (err) {
            log(`Server save reset error: ${err}`);
          }
        }
        
        // 10:15 CET - Full guild sync (all guilds from TibiaData)
        if (hour === 10 && minute >= 15 && minute < 20 && lastFullSyncDate !== todayDate) {
          try {
            log(`Post-save sync: Starting full guild sync...`);
            const guilds = await storage.getGuilds();
            let totalUpdated = 0;
            let totalCreated = 0;
            
            const MEMBER_BATCH_SIZE = 10;
            for (const guild of guilds) {
              try {
                const members = await fetchGuildMembers(guild.name);
                if (!members.length) continue;
                
                const results = await Promise.allSettled(
                  Array.from({ length: Math.ceil(members.length / MEMBER_BATCH_SIZE) }, (_, batchIdx) => {
                    const batch = members.slice(batchIdx * MEMBER_BATCH_SIZE, (batchIdx + 1) * MEMBER_BATCH_SIZE);
                    return (async () => {
                      if (batchIdx > 0) await new Promise(r => setTimeout(r, batchIdx * 100));
                      let updated = 0, created = 0;
                      await Promise.allSettled(batch.map(async (member) => {
                        const existing = await storage.getPlayerByName(member.name);
                        if (existing) {
                          const startLevel = existing.startLevel || existing.level;
                          const levelsGained = member.level - startLevel;
                          await storage.updatePlayer(existing.id, {
                            level: member.level,
                            vocation: member.vocation,
                            rank: member.rank,
                            online: member.status === "online",
                            lastScan: new Date(),
                            levelsGained: levelsGained > 0 ? levelsGained : 0,
                          });
                          updated++;
                        } else {
                          await storage.createPlayer({
                            name: member.name,
                            guildId: guild.id,
                            level: member.level,
                            vocation: member.vocation,
                            rank: member.rank,
                            online: member.status === "online",
                            startLevel: member.level,
                            levelsGained: 0,
                          });
                          created++;
                        }
                      }));
                      return { updated, created };
                    })();
                  })
                );
                for (const r of results) {
                  if (r.status === "fulfilled") {
                    totalUpdated += r.value.updated;
                    totalCreated += r.value.created;
                  }
                }
                await new Promise(r => setTimeout(r, 2000));
              } catch (guildErr) {
                log(`Post-save sync: Error syncing ${guild.name}: ${guildErr}`);
              }
            }
            
            log(`Post-save sync: Complete - ${totalUpdated} updated, ${totalCreated} created`);
            lastFullSyncDate = todayDate;
          } catch (err) {
            log(`Post-save sync error: ${err}`);
          }
        }
      }, 60000); // Check every minute
      log(`Server save scheduler started (reset 10:00, full sync 10:15 CET)`);
      log(`All background jobs initialized (mode: ${isDevMode ? 'development' : 'production'})`);
    },
  );
})();
