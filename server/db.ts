import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is not configured!");
    throw new Error("DATABASE_URL environment variable must be set to start the server");
}

// Używamy standardowej puli połączeń TCP zamiast WebSockets
export const pool = new pg.Pool({
    connectionString: DATABASE_URL
});

export const db = drizzle(pool, { schema });