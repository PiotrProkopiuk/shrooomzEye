# Objective
Refactor ShrooomzEye into a multi-tenant guild-based platform with Discord OAuth, RBAC, subscriptions, invites, referrals, and admin panel. Must preserve all existing tracking logic.

# Tasks

### T001: Schema ✅ COMPLETE
### T002: Auth Refactor ✅ COMPLETE  
### T004: RBAC Middleware ✅ COMPLETE

### T003: Backend Routes - All New API Endpoints + Tenant Scoping
- **Blocked By**: [] (all blockers complete)
- **Details**:
  - Update routes.ts: fix existing TS errors (req.params typing), replace requireRole("ADMIN","MODERATOR") with RBAC middleware
  - Guild ownership: POST /api/guilds creates guild and assigns LEADER role, sets ownerId
  - GET /api/my-guilds - user's guilds via guildUsers join
  - POST /api/auth/select-guild (already in auth.ts)
  - Invite system: POST /api/guilds/:id/invites, GET /api/invites/:token, POST /api/invites/:token/accept
  - Ownership transfer: POST /api/guilds/:id/transfer (atomic)
  - Payment: POST /api/guilds/:id/payment-request, admin payment endpoints
  - Admin routes: /api/admin/users, guilds, metrics, activate, downgrade, block
  - Referral: GET /api/referrals/my
  - Plan limits: create server/planLimits.ts
  - Scope existing data endpoints to activeGuildId
  - Update storage.ts with new CRUD methods
  - Files: `server/routes.ts`, `server/storage.ts`, `server/planLimits.ts`
  - Acceptance: All API endpoints working, TS compiles

### T005: Frontend - Complete UI Refactor
- **Blocked By**: [T003]
- **Details**:
  - Create client/src/lib/auth.tsx AuthProvider using /api/auth/me
  - Rewrite App.tsx: AuthProvider wraps app, no localStorage auth
  - Rewrite Login.tsx: Discord OAuth button + demo mode with real sessions
  - Update Layout.tsx: guild selector, subscription badge, admin nav link
  - Create Admin.tsx: metrics/users/guilds/payments tabs
  - Create InviteAccept.tsx: /invite/:token acceptance page
  - Update Settings.tsx: invite management, subscription/payment sections, ownership transfer
  - Register new routes in App.tsx
  - Files: `client/src/lib/auth.tsx`, `client/src/App.tsx`, `client/src/pages/Login.tsx`, `client/src/components/Layout.tsx`, `client/src/pages/Admin.tsx`, `client/src/pages/InviteAccept.tsx`, `client/src/pages/Settings.tsx`
  - Acceptance: Full auth flow, guild switching, admin panel, invites, subscriptions
