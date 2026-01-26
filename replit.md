# ShrooomzEye

## Overview

ShrooomzEye is a guild intelligence dashboard for Tibia game guilds. It provides comprehensive tracking, analytics, and management tools for Discord-integrated guild operations.

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

**Note:** Discord integration was set up manually (not via Replit integration). If reconfiguring, obtain credentials from https://discord.com/developers/applications The application provides a web-based dashboard for managing guild members, tracking PvP statistics, organizing quests and boss events, and monitoring player activity. It integrates with external APIs like TibiaData for player information and supports multi-guild configurations across different Discord servers.

## User Preferences

Preferred communication style: Simple, everyday language.
Interface language: English (UI should be in English)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with custom dark fantasy theme, shadcn/ui component library
- **Build Tool**: Vite with custom plugins for Replit integration

Key design decisions:
- Component library uses Radix UI primitives wrapped with shadcn/ui for consistent, accessible components
- Custom theming with CSS variables for a dark RPG-inspired aesthetic using Cinzel and Inter fonts
- Path aliases configured: `@/` for client source, `@shared/` for shared code, `@assets/` for attached assets

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Pattern**: RESTful JSON API endpoints under `/api/`
- **Database ORM**: Drizzle ORM with Zod schema validation

Key design decisions:
- Monorepo structure with `client/`, `server/`, and `shared/` directories
- Shared schema definitions ensure type consistency between frontend and backend
- Production build bundles specific dependencies to optimize cold start times on Replit

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Managed via Drizzle Kit with output to `./migrations`

Core entities:
- `guilds`: Tibia guilds being tracked (name, server, enemy status, verification)
- `players`: Individual players linked to guilds with level tracking
- `pvpLogs`: Daily PvP kill/death statistics per guild
- `templates`: Reusable event templates for quests and boss runs
- `users`: Basic user authentication records

### Authentication
- Mock authentication implemented via localStorage for development
- Designed to integrate with Discord OAuth2 for production (guild leader/vice-leader verification)
- Session-based authentication support via `connect-pg-simple` and `express-session`

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres using `@neondatabase/serverless` with WebSocket support
- Connection string via `DATABASE_URL` environment variable

### APIs & Integrations
- **TibiaData API**: For fetching player statistics, death records, and online status
- **Discord Integration**: Planned Discord.js or discord-php bot integration for slash commands and reaction-based event signups
- **Tibia.com Scraping**: Backup method for online player detection when API unavailable

### Key Runtime Dependencies
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Async state management
- `recharts`: Data visualization for leaderboards and statistics
- `express` / `express-session`: HTTP server and session management
- `ws`: WebSocket support for Neon database connections

### Development Environment
- Designed for Replit free tier compatibility
- Vite dev server on port 5000 with HMR
- TypeScript with bundler module resolution
- Custom Vite plugins for Replit-specific features (cartographer, dev banner, meta images)

## Server Save Scheduler

Tibia performs a daily server save at 10:00 CET. The application schedules key operations around this time.

### Scheduled Jobs (CET)
- **10:00** - Reset all players' `startLevel` to current level (levelsGained = 0)
- **10:15** - Full guild sync from TibiaData API for all tracked guilds

### Level Tracking
- `startLevel`: Baseline level set at server save (10:00 CET)
- `levelsGained`: Calculated as `currentLevel - startLevel`
- Shows daily progress since last server save, not since last scan

### Manual Endpoints
- `POST /api/reset-all-levels` - Admin can manually trigger server save reset
- `POST /api/guilds/:id/reset-tracking` - Reset single guild's level tracking

### Implementation
- Scheduler runs every minute, checking current CET time
- Prevents duplicate runs using date tracking (`lastResetDate`, `lastFullSyncDate`)
- 2-second delay between guild syncs to avoid API rate limiting

## TibSpy Scraper (Experimental)

The TibSpy scraper is an optional, secondary enrichment source for character data. It operates with strict limits and safety measures.

### Safety Measures
- **Global Daily Limit**: Max 100 character scrapes per day (configurable)
- **Per-Character Cooldown**: Each character can only be scraped once per 24 hours
- **Batch Processing**: Processes 5-10 characters per batch with delays
- **Nightly Execution Window**: Only runs between 01:00-05:00 server time by default
- **Automatic Blocking**: If TibSpy blocks requests, scraper stops until next day

### Priority System
Characters are scraped in this priority order:
1. Newly added characters (high priority, manual trigger)
2. Enemy guild characters (normal priority)
3. Main guild characters (low priority)

### Configuration (Environment/Database)
All parameters are configurable via the API or database:
- `tibspy_daily_limit`: Max scrapes per day (default: 100)
- `tibspy_batch_size`: Characters per batch (default: 5)
- `tibspy_request_delay_ms`: Delay between requests (default: 2000ms)
- `tibspy_batch_delay_ms`: Delay between batches (default: 15000ms)
- `tibspy_cooldown_hours`: Per-character cooldown (default: 24)
- `tibspy_nightly_start_hour`: Start of execution window (default: 1)
- `tibspy_nightly_end_hour`: End of execution window (default: 5)
- `tibspy_enabled`: Enable/disable scraper (default: true)

### API Endpoints
- `GET /api/tibspy/status` - Get scraper status and config
- `GET /api/tibspy/metrics` - Get daily metrics
- `GET /api/tibspy/logs` - Get recent scrape logs
- `GET /api/tibspy/character/:name` - Get cached character data
- `POST /api/tibspy/queue` - Queue character for scraping (admin)
- `POST /api/tibspy/run-batch` - Manually trigger batch (admin)
- `POST /api/tibspy/enable` - Enable scraper (admin)
- `POST /api/tibspy/disable` - Disable scraper (admin)
- `PUT /api/tibspy/config` - Update configuration (admin)

### Database Tables
- `tibspy_character_data`: Cached character data with scrape history
- `tibspy_scrape_logs`: Daily metrics (attempts, success, failures)
- `tibspy_config`: Configurable parameters

### Important Notes
- TibSpy is NOT required for core functionality
- Data freshness is not critical - stale data is acceptable
- The scraper must behave politely and predictably
- Core logic does NOT depend on TibSpy availability

## Codebase Audit (January 2026)

### Completed Fixes
1. **Templates.tsx** - Converted from hardcoded TEMPLATES array to real API (`GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/:id`). Shows empty state when no templates exist.
2. **Events.tsx** - Removed mock event fallback data. Now shows proper empty state with call-to-action to create first event.
3. **Settings.tsx** - "Clear Server Data" button disabled with guidance to contact support (destructive action requires manual intervention).
4. **mockData.ts** - Removed unused mock data file.
5. **storage.ts** - Added `deleteTemplate()` method to interface and implementation.

### Known Placeholders (By Design)
- **Mock Authentication** - localStorage-based login in `Login.tsx`, `App.tsx`, `Layout.tsx`. Designed for development; Discord OAuth2 ready for production.
- **Danger Zone** - Server data clearing disabled pending proper confirmation flow.

### Data Sources
All UI pages now use real API endpoints connected to PostgreSQL:
- Dashboard: `/api/guilds`, `/api/players`, `/api/online/*`, `/api/death-tracker/*`
- Players: `/api/players`, `/api/tibspy/character/:name`
- Events: `/api/events/:guildId`, `/api/templates`
- Templates: `/api/templates`
- Combat & Activity: `/api/death-tracker/recent`, `/api/death-tracker/stats`
- Progress & Rankings: `/api/players`, `/api/guilds`
- Guilds: `/api/guilds`, `/api/tibia/guild/:name`
- Settings: `/api/death-tracker/config/:guildId`

## Dashboard Consolidation (January 2026)

### Merged Views
The following redundant dashboard views were consolidated to reduce duplication and improve maintainability:

1. **Combat & Activity** (formerly "Activity History" + "Deaths Dashboard")
   - Combined death tracking, PvP summary, and system activity logs into one unified page
   - Tabs: Death Log | PvP Summary | System Log
   - Removed redundant DeathsDashboard.tsx file
   - Path: `/history`

2. **Progress & Rankings** (formerly "Level Progress" + "Leaderboards")
   - Combined level tracking and guild leaderboards into one unified page
   - Tabs: Overview | Leaderboards | All Players
   - Removed redundant Leaderboards.tsx file
   - Path: `/levels`

### Removed Pages
- `DeathsDashboard.tsx` - Merged into ActivityHistory.tsx
- `Leaderboards.tsx` - Merged into LevelProgress.tsx

### Updated Navigation
Navigation reduced from 13 items to 11 items:
- Removed: "Deaths & PvP" (merged into "Combat & Activity")
- Removed: "Leaderboards" (merged into "Progress & Rankings")
- Removed: "Audit Log" (renamed to "Combat & Activity")

### Why These Merges
- **Deaths data** was displayed in 3 places (Dashboard, DeathsDashboard, ActivityHistory)
- **Level gains** were displayed in 3 places (Dashboard, LevelProgress, Leaderboards)
- **Top gainers** table was duplicated between LevelProgress and Leaderboards
- Consolidation reduces code duplication and provides unified experience

### Maintenance Notes
- All merged pages use tabs for organization
- API endpoints remain unchanged (reused existing services)
- Permissions and visibility rules preserved
- Data sources consolidated into single source of truth per metric