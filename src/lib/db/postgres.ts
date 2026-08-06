import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var fastcleanPostgresPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("railway.internal") ? false : { rejectUnauthorized: false }
  });
}

export function getPostgresPool() {
  if (!global.fastcleanPostgresPool) {
    global.fastcleanPostgresPool = createPool() ?? undefined;
  }

  return global.fastcleanPostgresPool ?? null;
}

export async function queryPostgres<T>(sql: string, values: unknown[] = []) {
  const pool = getPostgresPool();

  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return pool.query<T>(sql, values);
}
