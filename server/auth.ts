import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { guildUsers, guilds, referrals, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      discordId: string;
      username: string;
      avatar: string | null;
      globalRole: string;
    };
    activeGuildId?: number;
    oauthState?: string;
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
function getRedirectUri() {
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return `https://${process.env.REPLIT_DEPLOYMENT_URL}/api/auth/discord/callback`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/discord/callback`;
  }
  return "https://mushroomz.fun/api/auth/discord/callback";
}
const DISCORD_REDIRECT_URI = getRedirectUri();
console.log(`[Auth] Discord redirect URI: ${DISCORD_REDIRECT_URI}`);

const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" 
  ? (() => { throw new Error("SESSION_SECRET must be set in production"); })()
  : "dev-tibia-bot-secret-key");

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  
  const sessionConfig: session.SessionOptions = {
    secret: SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (process.env.DATABASE_URL) {
    sessionConfig.store = new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "user_sessions",
    });
    console.log("[Auth] Using PostgreSQL session store");
  } else if (process.env.NODE_ENV === "production") {
    console.error("[Auth] WARNING: DATABASE_URL not set in production, using MemoryStore (sessions will not persist)");
  }

  app.use(session(sessionConfig));

  app.get("/api/auth/discord", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;
    
    const ref = req.query.ref as string | undefined;
    const stateData = ref ? `${state}:ref:${ref}` : state;
    
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify guilds",
      state: stateData,
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get("/api/auth/discord/callback", async (req, res) => {
    const { code, state } = req.query;
    
    const stateStr = state as string;
    const [actualState, , refCode] = stateStr?.includes(":ref:") 
      ? stateStr.split(":ref:").flatMap((s, i) => i === 0 ? [s, "ref"] : [s])
      : [stateStr, undefined, undefined];
    
    if (!actualState || actualState !== req.session.oauthState) {
      return res.redirect("/login?error=invalid_state");
    }
    delete req.session.oauthState;
    
    if (!code) return res.redirect("/login?error=no_code");

    try {
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect("/login?error=token_failed");
      }

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = await userRes.json();

      let user = await storage.getUserByDiscordId(discordUser.id);
      const isNewUser = !user;
      
      if (!user) {
        user = await storage.createUser({
          discordId: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          globalRole: "USER",
          referralCode: generateReferralCode(),
        });
        
        if (refCode && user) {
          const [referrer] = await db.select().from(users)
            .where(eq(users.referralCode, refCode));
          if (referrer && referrer.id !== user.id) {
            await db.insert(referrals).values({
              referrerUserId: referrer.id,
              referredUserId: user.id,
              rewardApplied: false,
            });
          }
        }
      } else {
        await db.update(users).set({
          username: discordUser.username,
          avatar: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
        }).where(eq(users.id, user.id));
      }

      if (user.blocked) {
        return res.redirect("/login?error=blocked");
      }

      req.session.user = {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        globalRole: user.globalRole || "USER",
      };

      const userGuilds = await db.select({ guildId: guildUsers.guildId })
        .from(guildUsers).where(eq(guildUsers.userId, user.id));
      if (userGuilds.length > 0) {
        req.session.activeGuildId = userGuilds[0].guildId;
      }

      res.redirect("/");
    } catch (error) {
      console.error("Discord auth error:", error);
      res.redirect("/login?error=auth_failed");
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.user) {
      const userGuilds = await db.select({
        guildId: guildUsers.guildId,
        role: guildUsers.role,
        guildName: guilds.name,
        guildServer: guilds.server,
        subscriptionStatus: guilds.subscriptionStatus,
      })
        .from(guildUsers)
        .innerJoin(guilds, eq(guildUsers.guildId, guilds.id))
        .where(eq(guildUsers.userId, req.session.user.id));

      res.json({
        ...req.session.user,
        activeGuildId: req.session.activeGuildId || null,
        guilds: userGuilds,
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/auth/select-guild", requireAuth, async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: "guildId required" });

    const [membership] = await db.select().from(guildUsers)
      .where(and(
        eq(guildUsers.userId, req.session.user!.id),
        eq(guildUsers.guildId, guildId)
      ));

    if (!membership && req.session.user!.globalRole !== "ADMIN") {
      return res.status(403).json({ error: "Not a member of this guild" });
    }

    req.session.activeGuildId = guildId;
    res.json({ success: true, activeGuildId: guildId });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ success: true });
    });
  });

  app.post("/api/auth/demo", async (req, res) => {
    const { password } = req.body;
    if (password !== "Codex123!") {
      return res.status(401).json({ error: "Invalid demo password" });
    }

    let demoUser = await storage.getUserByDiscordId("demo");
    if (!demoUser) {
      demoUser = await storage.createUser({
        discordId: "demo",
        username: "Demo User",
        avatar: null,
        globalRole: "ADMIN",
        referralCode: "DEMO0000",
      });
    }

    req.session.user = {
      id: demoUser.id,
      discordId: demoUser.discordId,
      username: demoUser.username,
      avatar: demoUser.avatar,
      globalRole: demoUser.globalRole || "ADMIN",
    };

    const userGuilds = await db.select({ guildId: guildUsers.guildId })
      .from(guildUsers).where(eq(guildUsers.userId, demoUser.id));
    if (userGuilds.length > 0) {
      req.session.activeGuildId = userGuilds[0].guildId;
    }

    res.json({ success: true });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.session.user.globalRole === "ADMIN") {
    return next();
  }
  next();
}

export function requireGlobalRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.session.user.globalRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return requireGlobalRole(...roles);
}
