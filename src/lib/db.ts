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

// Crea le tabelle se non esistono. Eseguito una sola volta per processo.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(
        `CREATE TABLE IF NOT EXISTS clienti (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          username TEXT,
          password_cifrata TEXT,
          scadenza TEXT,
          credito_mesi INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      );
      await db.execute(
        `CREATE TABLE IF NOT EXISTS pagamenti (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          persona TEXT NOT NULL,
          importo REAL NOT NULL DEFAULT 0,
          scadenza TEXT,
          pagato INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      );
      await db.execute(
        `CREATE TABLE IF NOT EXISTS login_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      );
    })();
  }
  return schemaReady;
}
