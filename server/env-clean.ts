import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Please set it in your .env file or environment variables."
  );
}

export function getEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
    PORT: process.env.PORT || "5000",
    NODE_ENV: process.env.NODE_ENV || "development",
    REPL_ID: process.env.REPL_ID,
  };
}

