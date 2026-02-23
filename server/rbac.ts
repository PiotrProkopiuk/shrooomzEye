import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { guildUsers, guilds } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export type GuildRole = "LEADER" | "VICE_LEADER" | "OFFICER" | "MEMBER";

export const ROLE_HIERARCHY: Record<GuildRole, number> = {
  LEADER: 4,
  VICE_LEADER: 3,
  OFFICER: 2,
  MEMBER: 1,
};

export const DEFAULT_PERMISSIONS: Record<GuildRole, Record<string, boolean>> = {
  LEADER: {
    manage_members: true,
    manage_tracking: true,
    manage_templates: true,
    manage_payments: true,
    manage_settings: true,
    transfer_ownership: true,
  },
  VICE_LEADER: {
    manage_members: true,
    manage_tracking: true,
    manage_templates: true,
    manage_payments: false,
    manage_settings: true,
    transfer_ownership: false,
  },
  OFFICER: {
    manage_members: false,
    manage_tracking: false,
    manage_templates: true,
    manage_payments: false,
    manage_settings: false,
    transfer_ownership: false,
  },
  MEMBER: {
    manage_members: false,
    manage_tracking: false,
    manage_templates: false,
    manage_payments: false,
    manage_settings: false,
    transfer_ownership: false,
  },
};

export async function getUserGuildRole(userId: number, guildId: number): Promise<{ role: GuildRole; permissions: Record<string, boolean> } | null> {
  const [membership] = await db.select().from(guildUsers)
    .where(and(
      eq(guildUsers.userId, userId),
      eq(guildUsers.guildId, guildId)
    ));

  if (!membership) return null;

  const role = membership.role as GuildRole;
  const customPermissions = membership.permissions as Record<string, boolean> | null;
  const permissions = customPermissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.MEMBER;

  return { role, permissions };
}

export function requireGuildRole(...allowedRoles: GuildRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.session.user.globalRole === "ADMIN") {
      return next();
    }

    const guildId = req.session.activeGuildId || parseInt(req.params.guildId as string) || parseInt(req.body?.guildId);
    if (!guildId) {
      return res.status(400).json({ error: "No guild context. Select a guild first." });
    }

    const roleInfo = await getUserGuildRole(req.session.user.id, guildId);
    if (!roleInfo) {
      return res.status(403).json({ error: "Not a member of this guild" });
    }

    const userLevel = ROLE_HIERARCHY[roleInfo.role] || 0;
    const minLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r] || 0));

    if (userLevel < minLevel) {
      return res.status(403).json({ error: "Insufficient guild permissions" });
    }

    next();
  };
}

export function requireGuildPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.session.user.globalRole === "ADMIN") {
      return next();
    }

    const guildId = req.session.activeGuildId || parseInt(req.params.guildId as string) || parseInt(req.body?.guildId);
    if (!guildId) {
      return res.status(400).json({ error: "No guild context" });
    }

    const roleInfo = await getUserGuildRole(req.session.user.id, guildId);
    if (!roleInfo) {
      return res.status(403).json({ error: "Not a member of this guild" });
    }

    if (!roleInfo.permissions[permission]) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }

    next();
  };
}
