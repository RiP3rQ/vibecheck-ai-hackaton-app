import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  return databaseUrl;
}

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (!globalForDb.pgPool) {
  globalForDb.pgPool = pool;
}

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
