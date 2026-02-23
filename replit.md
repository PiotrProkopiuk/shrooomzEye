# ShrooomzEye

## Overview

ShrooomzEye is a multi-tenant guild intelligence dashboard for Tibia game guilds. It provides comprehensive tracking, analytics, and management tools for Discord-integrated guild operations with role-based access control, subscription management, and referral systems.

## Branding

**Project Name:** ShrooomzEye  
**Tagline:** your guild intelligence dashboard

### Branding Locations
- **Sidebar Header:** Project name with Eye icon
- **Page Title:** `<title>ShrooomzEye - Guild Intelligence Dashboard</title>`
- **Footer:** Project name (left) + tagline (right)
- **Hover Tooltip:** Tagline displays on hover over brand elements
- **Meta Tags:** OpenGraph and Twitter cards use project name and tagline

### Branding Guidelines
- Font: Cinzel (display font) for project name
- Icon: Eye icon from Lucide
- Color: Primary theme color (gold/amber)
- Keep branding subtle and non-intrusive
- Do not duplicate branding in page content areas

## Discord OAuth2 Configuration

The application uses Discord OAuth2 for authentication. Required secrets:
- `DISCORD_CLIENT_ID` - From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - From Discord Developer Portal

**Note:** Discord integration was set up manually (not via Replit integration). If reconfiguring, obtain credentials from https://discord.com/developers/applications

## User Preferences

Preferred communication style: Simple, everyday language.
Interface language: English (UI should be in English)

## System Architecture

### Multi-Tenant Architecture
The application is a multi-tenant platform where each guild is a tenant:
- Users belong to multiple guilds via `guildUsers` table
- Session tracks `activeGuildId` for data scoping
- Guild selector in sidebar switches active context
- All data queries scoped to active guild

### Authentication & Authorization
- **Discord OAuth2**: Real sessions via `express-session` + `connect-pg-simple`
- **Demo Mode**: Password "Codex123!" creates DB-backed demo user with ADMIN role
- **AuthProvider**: React context (`client/src/lib/auth.tsx`) wraps app, provides `useAuth()` hook
- **No localStorage auth**: All auth is session-based via `/api/auth/me`

### RBAC (Role-Based Access Control)
**Global Roles** (users.globalRole):
- `ADMIN`: Full system access, admin panel
- `USER`: Standard user

**Guild Roles** (guildUsers.role):
- `LEADER`: All permissions, ownership transfer
- `VICE_LEADER`: Manage members, tracking, templates, settings
- `OFFICER`: Manage templates
- `MEMBER`: Read-only

Middleware: `server/rbac.ts` provides `requireGuildRole()` and `requireGuildPermission()`

### Subscription Model
- **FREE**: Basic tracking, limited features
- **PREMIUM**: Full features, paid with Tibia Coins
- Payment flow: User submits payment request → Admin confirms → Guild upgraded
- Subscriptions have expiry dates

### Referral System
- Each user gets a unique 8-char referral code
- Registration with `?ref=CODE` creates referral record
- When referred user's guild gets PREMIUM: referrer gets +7 days

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, AuthProvider context for auth
- **Styling**: Tailwind CSS v4 with custom dark fantasy theme, shadcn/ui component library
- **Build Tool**: Vite with custom plugins for Replit integration

Key design decisions:
- Component library uses Radix UI primitives wrapped with shadcn/ui
- Custom theming with CSS variables for a dark RPG-inspired aesthetic using Cinzel and Inter fonts
- Path aliases: `@/` for client source, `@shared/` for shared code, `@assets/` for assets

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Pattern**: RESTful JSON API endpoints under `/api/`
- **Database ORM**: Drizzle ORM with Zod schema validation

Key design decisions:
- Monorepo structure with `client/`, `server/`, and `shared/` directories
- Shared schema definitions ensure type consistency between frontend and backend
- Production build bundles specific dependencies to optimize cold start times

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Applied via `npm run db:push` (Drizzle Kit)

Core entities:
- `users`: Discord-authenticated users with globalRole, referralCode, blocked status
- `guilds`: Tibia guilds with ownerId, subscriptionStatus, subscriptionExpiresAt
- `guildUsers`: Multi-tenant membership (userId, guildId, role, permissions JSON)
- `guildInvites`: Invite tokens with role, expiry, createdBy
- `paymentRequests`: Tibia Coin payment requests (PENDING/CONFIRMED/REJECTED)
- `referrals`: Referrer→referred tracking with rewardApplied flag
- `players`: Individual players linked to guilds with level tracking
- `deaths`: Death records with deathHash uniqueness
- `pvpLogs`: Daily PvP kill/death statistics per guild
- `templates`: Reusable event templates (guild-scoped)
- `events` / `eventParticipants`: Quest/boss events
- `deathTrackerConfig`: Per-guild Discord webhook configuration
- `guildMembers` / `guildMembershipEvents`: Join/leave tracking
- `onlineSnapshots` / `onlineSessions` / `onlineCharacters`: Online activity
- `tibspyCharacterData` / `tibspyScrapeLogs` / `tibspyConfig`: TibSpy enrichment
- `scanCache`: Character scan cache
- `pvpActionConfig`: PvP action configuration

## API Endpoints

### Auth
- `GET /api/auth/discord` - Discord OAuth2 login (supports `?ref=CODE`)
- `GET /api/auth/discord/callback` - OAuth callback
- `GET /api/auth/me` - Current user + guilds + activeGuildId
- `POST /api/auth/select-guild` - Set active guild in session
- `POST /api/auth/demo` - Demo login (password: Codex123!)
- `POST /api/auth/logout` - Destroy session

### Guild Management
- `GET /api/guilds` - All guilds
- `GET /api/my-guilds` - User's guilds via guildUsers
- `POST /api/guilds` - Create guild (auto-assigns LEADER role)
- `DELETE /api/guilds/:id` - Delete guild (LEADER only)
- `POST /api/guilds/:id/transfer` - Transfer ownership (LEADER → VICE_LEADER)

### Invite System
- `POST /api/guilds/:id/invites` - Generate invite (LEADER/VICE_LEADER)
- `GET /api/guilds/:id/invites` - List guild invites
- `GET /api/invites/:token` - Get invite info (public)
- `POST /api/invites/:token/accept` - Accept invite (authenticated)
- `DELETE /api/invites/:id` - Delete invite

### Subscriptions & Payments
- `POST /api/guilds/:id/payment-request` - Submit TC payment request (LEADER)
- `GET /api/guilds/:id/payments` - Guild payment history

### Referrals
- `GET /api/referrals/my` - User's referral stats

### Admin Panel (`/api/admin/*` - ADMIN only)
- `GET /api/admin/users` - All users with pagination
- `GET /api/admin/guilds` - All guilds with subscription info
- `GET /api/admin/metrics` - Summary dashboard (totals, premium count, TC revenue)
- `GET /api/admin/payments` - All payment requests
- `POST /api/admin/payments/:id/confirm` - Confirm payment → PREMIUM
- `POST /api/admin/payments/:id/reject` - Reject payment
- `POST /api/admin/guilds/:id/activate` - Manually activate subscription
- `POST /api/admin/guilds/:id/downgrade` - Downgrade to FREE
- `POST /api/admin/users/:id/block` - Toggle block status
- `POST /api/admin/users/:id/role` - Change global role

### Existing Tracking APIs
- Players: `/api/players`, `/api/players/:id/scan`, `/api/guilds/:id/scan-members`
- Deaths: `/api/deaths/:guildId`, `/api/death-tracker/*`
- Events: `/api/events/:guildId`, `/api/templates`
- Online: `/api/online/*`
- TibSpy: `/api/tibspy/*`
- Guild Sync: `/api/guilds/:id/reset-tracking`, `/api/reset-all-levels`

## Frontend Pages

- `/login` - Discord OAuth + demo mode login
- `/` - Dashboard
- `/guilds` - Guild management
- `/players` - Player list
- `/online` - Online activity
- `/history` - Combat & Activity (deaths, PvP, system log)
- `/levels` - Progress & Rankings
- `/events` - Events & Quests
- `/templates` - Event Templates
- `/settings` - Webhook config, invite management, subscription, ownership transfer
- `/verification` - Guild verification
- `/stats` - Guild statistics
- `/guild-changes` - Join/leave tracker
- `/character/:name` - Character profile
- `/admin` - Admin panel (ADMIN only) - metrics, users, guilds, payments
- `/invite/:token` - Invite acceptance page

## Key Files
- `server/auth.ts` - Discord OAuth2, session management, demo mode
- `server/rbac.ts` - Guild role/permission middleware
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database CRUD operations
- `server/planLimits.ts` - Subscription plan definitions
- `server/deathTracker.ts` - Death tracking background service
- `server/guildSyncService.ts` - Guild member sync
- `server/onlineScraper.ts` - Online player scraper
- `client/src/lib/auth.tsx` - AuthProvider context
- `client/src/App.tsx` - Router with auth guards
- `client/src/components/Layout.tsx` - Sidebar, guild selector, user info
- `shared/schema.ts` - All Drizzle table definitions and types

## Server Save Scheduler

Tibia performs a daily server save at 10:00 CET. The application schedules key operations around this time.

### Scheduled Jobs (CET)
- **10:00** - Reset all players' `startLevel` to current level (levelsGained = 0)
- **10:15** - Full guild sync from TibiaData API for all tracked guilds

### Implementation
- Scheduler runs every minute, checking current CET time
- Prevents duplicate runs using date tracking (`lastResetDate`, `lastFullSyncDate`)
- 2-second delay between guild syncs to avoid API rate limiting

## Death Tracker

- Priority checks run every 1 minute for online + recently-offline players (10-min window)
- Full guild checks every 15 minutes (production) / 120 minutes (development)
- Overlap guard prevents pile-ups
- Batch processing in groups of 5 with delays

## TibSpy Scraper (Experimental)

Optional secondary enrichment source. See API endpoints above for management.
- Global daily limit: 100 scrapes
- Per-character cooldown: 24 hours
- Nightly execution window: 01:00-05:00
- NOT required for core functionality
