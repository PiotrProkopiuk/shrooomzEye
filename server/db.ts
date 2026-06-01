import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL is not configured!"
  );
  console.error(
    "   Please add DATABASE_URL to your .env file or environment variables"
  );
  console.error(
    "   Example: DATABASE_URL=postgres://user:password@host:5432/dbname"
  );
  throw new Error("DATABASE_URL environment variable must be set to start the server");
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
