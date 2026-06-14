import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL non impostata");
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// Lo schema (tabelle clienti, pagamenti, login_attempts) viene creato UNA volta
// dalla console SQL di Turso — vedi README / scripts/schema.sql.
//
// Non eseguiamo le CREATE TABLE a runtime di proposito: su Turso le istruzioni
// DDL passano per i "migration jobs" e alcune versioni del client falliscono con
// "Unexpected status code while fetching migration jobs: 400". Tenendo qui solo
// operazioni DML (INSERT/SELECT/UPDATE/DELETE) il problema non si presenta.
export async function ensureSchema(): Promise<void> {
  // no-op: lo schema è gestito esternamente.
}
