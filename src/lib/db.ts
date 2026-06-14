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

let schemaReady: Promise<void> | null = null;

// Crea la tabella se non esiste. Eseguito una sola volta per processo.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getDb()
      .execute(
        `CREATE TABLE IF NOT EXISTS credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_name TEXT NOT NULL,
          service TEXT NOT NULL,
          username TEXT,
          secret_encrypted TEXT,
          notes TEXT,
          expires_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      )
      .then(() => undefined);
  }
  return schemaReady;
}
