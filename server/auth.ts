import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import crypto from "crypto";
import { storage } from "./storage";

// Extend session to include user and oauth state
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      discordId: string;
      username: string;
      avatar: string | null;
      role: string;
    };
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
  return "http://localhost:5000/api/auth/discord/callback";
}
const DISCORD_REDIRECT_URI = getRedirectUri();
console.log(`[Auth] Discord redirect URI: ${DISCORD_REDIRECT_URI}`);

// Require SESSION_SECRET in production
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" 
  ? (() => { throw new Error("SESSION_SECRET must be set in production"); })()
  : "dev-tibia-bot-secret-key");

export function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);
  
  const sessionConfig: session.SessionOptions = {
    secret: SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

  // Discord OAuth2 Login with CSRF protection
  app.get("/api/auth/discord", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;
    
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify guilds",
      state,
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  // Discord OAuth2 Callback with CSRF validation
  app.get("/api/auth/discord/callback", async (req, res) => {
    const { code, state } = req.query;
    
    // Validate CSRF state
    if (!state || state !== req.session.oauthState) {
      return res.redirect("/login?error=invalid_state");
    }
    delete req.session.oauthState;
    
    if (!code) return res.redirect("/login?error=no_code");

    try {
      // Exchange code for token
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

      // Get user info
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = await userRes.json();

      // Find or create user
      let user = await storage.getUserByDiscordId(discordUser.id);
      if (!user) {
        user = await storage.createUser({
          discordId: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          role: "USER",
        });
      }

      // Store in session
      req.session.user = {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar,
        role: user.role || "USER",
      };

      res.redirect("/");
    } catch (error) {
      console.error("Discord auth error:", error);
      res.redirect("/login?error=auth_failed");
    }
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ success: true });
    });
  });
}

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Support demo mode for development
  if (req.headers["x-demo-mode"] === "true" || req.query.demo === "true") {
    req.session.user = {
      id: 0,
      discordId: "demo",
      username: "Demo User",
      avatar: null,
      role: "ADMIN",
    };
  }
  
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Role-based access
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
