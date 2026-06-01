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

app.set("trust proxy", 1);

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
    log("KROK A: Uruchamiam registerRoutes...", "DIAGNOZA");
    try {
        await registerRoutes(httpServer, app);
        log("KROK B: registerRoutes zakonczone sukcesem!", "DIAGNOZA");
    } catch (err) {
        log(`KROK B-BLAD: registerRoutes wywalilo sie: ${err}`, "DIAGNOZA");
    }

    log("KROK C: Sprawdzam tryb NODE_ENV...", "DIAGNOZA");
    log(`Aktualny NODE_ENV to: "${process.env.NODE_ENV}"`, "DIAGNOZA");

    if (process.env.NODE_ENV === "production") {
        log("KROK D: Produkcja - odpalam serveStatic", "DIAGNOZA");
        serveStatic(app);
        log("KROK E: serveStatic zakonczone", "DIAGNOZA");
    } else {
        log("KROK D: Development - PROBA ladowania Vite...", "DIAGNOZA");
        try {
            const { setupVite } = await import("./vite");
            await setupVite(httpServer, app);
            log("KROK E: Vite zaladowane", "DIAGNOZA");
        } catch (err) {
            log(`KROK E-BLAD: Vite sie wywalilo: ${err}`, "DIAGNOZA");
        }
    }

    log("KROK F: Wszystko gotowe, zaraz odpalam httpServer.listen...", "DIAGNOZA");

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
        {
            port,
            host: "0.0.0.0",
            reusePort: true,
        },
        () => {
            log(`serving on port ${port}`);

            const isDevMode = process.env.NODE_ENV !== 'production';
            log(`Environment validation - NODE_ENV: ${process.env.NODE_ENV || 'not set'} (isDevMode: ${isDevMode})`, "config");

            // Parsowanie interwałów z logowaniem wartości surowych i przetworzonych
            const rawOffline = process.env.DEATH_TRACKER_OFFLINE_MIN;
            const deathTrackerOfflineMin = parseInt(rawOffline || (isDevMode ? '120' : '15'), 10);
            log(`Configuring Death Tracker Offline interval: ${deathTrackerOfflineMin} min (Raw ENV: ${rawOffline || "unset, using default"})`, "config");

            const rawOnline = process.env.DEATH_TRACKER_ONLINE_MIN;
            const deathTrackerOnlineMin = parseInt(rawOnline || (isDevMode ? '5' : '1'), 10);
            log(`Configuring Death Tracker Online interval: ${deathTrackerOnlineMin} min (Raw ENV: ${rawOnline || "unset, using default"})`, "config");

            const rawScraper = process.env.ONLINE_SCRAPER_SEC;
            const onlineScraperSec = parseInt(rawScraper || (isDevMode ? '300' : '60'), 10);
            log(`Configuring Online Scraper interval: ${onlineScraperSec} sec (Raw ENV: ${rawScraper || "unset, using default"})`, "config");

            // Odpalanie modułów tła
            log("Invoking startDeathTrackerJob()...", "jobs");
            startDeathTrackerJob(deathTrackerOfflineMin, deathTrackerOnlineMin);
            log(`Death tracker cron registered successfully.`, "jobs");

            log("Invoking startOnlineScraper() for world: Antica...", "jobs");
            startOnlineScraper({ world: "Antica", scrapeIntervalMs: onlineScraperSec * 1000 });
            log(`Online scraper cron registered successfully.`, "jobs");

            const guildSyncMin = parseInt(process.env.GUILD_SYNC_MIN || '15', 10);
            try {
                log(`Invoking startGuildSyncScheduler() with interval: ${guildSyncMin} min...`, "jobs");
                startGuildSyncScheduler(guildSyncMin);
                log(`Guild sync scheduler registered successfully.`, "jobs");
            } catch (err) {
                console.error("[GuildSync] CRITICAL: Failed to start scheduler:", err);
            }

            // Server save scheduler (10:00 CET daily)
            let lastResetDate = "";
            let lastFullSyncDate = "";

            log("Registering Server Save scheduler loop (1 minute heartbeat)...", "scheduler");
            setInterval(async () => {
                const now = new Date();

                const cetTimeStr = now.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', hour12: false });
                const [hourStr, minuteStr] = cetTimeStr.split(':');
                const hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);

                const cetDateStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }).split(',')[0];
                const todayDate = cetDateStr;

                // LOGOWANIE BICIU SERCA (Heartbeat co minutę) - upewnia się czy scheduler żyje i pokazuje czas CET
                log(`Heartbeat - Current Berlin/CET time: ${hourStr}:${minuteStr} | Date: ${todayDate} | Active States -> LastReset: "${lastResetDate || 'none'}", LastSync: "${lastFullSyncDate || 'none'}"`, "scheduler-clock");

                // 10:00 CET - Reset levels
                if (hour === 10 && minute < 5) {
                    if (lastResetDate !== todayDate) {
                        log(`Trigger conditions met for Player Start Levels Reset (Hour: ${hour}, Minute: ${minute}). Executing...`, "server-save");
                        try {
                            const count = await storage.resetAllPlayersStartLevel();
                            log(`Server save success: ${count} players start levels reset.`, "server-save");
                            lastResetDate = todayDate;
                        } catch (err) {
                            log(`CRITICAL error during player level reset execution: ${err}`, "server-save");
                        }
                    }
                }

                // 10:15 CET - Full guild sync
                if (hour === 10 && minute >= 15 && minute < 20) {
                    if (lastFullSyncDate !== todayDate) {
                        log(`Trigger conditions met for Post-Save Full Guild Sync (Hour: ${hour}, Minute: ${minute}). Executing...`, "post-save-sync");
                        try {
                            log(`Post-save sync: Fetching tracked guilds list from database...`, "post-save-sync");
                            const guilds = await storage.getGuilds();
                            log(`Post-save sync: Found ${guilds.length} guilds to synchronize. Starting batch processing...`, "post-save-sync");

                            let totalUpdated = 0;
                            let totalCreated = 0;
                            const MEMBER_BATCH_SIZE = 10;

                            for (const guild of guilds) {
                                try {
                                    log(`Post-save sync: Requesting TibiaData API for members of guild: "${guild.name}"...`, "post-save-sync");
                                    const members = await fetchGuildMembers(guild.name);
                                    log(`Post-save sync: TibiaData returned ${members.length} members for "${guild.name}". Processing database updates...`, "post-save-sync");

                                    if (!members.length) {
                                        log(`Post-save sync: [Warning] Received empty members list for "${guild.name}", skipping.`, "post-save-sync");
                                        continue;
                                    }

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
                                        } else {
                                            log(`Post-save sync: [Error] A batch failed during execution: ${r.reason}`, "post-save-sync");
                                        }
                                    }

                                    log(`Post-save sync: Finished guild "${guild.name}". Sleeping for 2000ms to respect API rate limits...`, "post-save-sync");
                                    await new Promise(r => setTimeout(r, 2000));
                                } catch (guildErr) {
                                    log(`Post-save sync: Error occurred while syncing guild "${guild.name}": ${guildErr}`, "post-save-sync");
                                }
                            }

                            log(`Post-save sync SUMMARY: Process complete! -> ${totalUpdated} players updated, ${totalCreated} new players created.`, "post-save-sync");
                            lastFullSyncDate = todayDate;
                        } catch (err) {
                            log(`CRITICAL error inside full post-save guild sync engine: ${err}`, "post-save-sync");
                        }
                    }
                }
            }, 60000);

            log(`Server save scheduler started (reset 10:00, full sync 10:15 CET)`);
            log(`All background jobs initialized (mode: ${isDevMode ? 'development' : 'production'})`);
        },
    );
})();