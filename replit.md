# TibiaGuildBot Panel

## Overview

This is a Discord bot management panel for Tibia game guilds.

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