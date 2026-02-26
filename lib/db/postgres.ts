import { Pool, type QueryResultRow } from "pg";

declare global {
  var __mulonePgPool: Pool | undefined;
}

function hasDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 0;
}

export function isDatabaseConfigured() {
  return hasDatabaseUrl();
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  if (!global.__mulonePgPool) {
    global.__mulonePgPool = createPool();
  }

  return global.__mulonePgPool;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return pool.query<T>(text, params);
}
