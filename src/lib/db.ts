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

// Esegue una istruzione DDL tollerando un falso errore del client Turso.
// Su Turso le istruzioni di schema passano per i "migration jobs": alcune
// versioni del client segnalano "Unexpected status code while fetching
// migration jobs: 400" ANCHE quando la tabella viene creata correttamente.
// Ignoriamo solo quel caso specifico; ogni altro errore viene rilanciato.
async function runDDL(db: Client, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("migration jobs")) return;
    throw e;
  }
}

let schemaReady: Promise<void> | null = null;

// Crea le tabelle se non esistono. Eseguito una sola volta per processo.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await runDDL(
        db,
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
      await runDDL(
        db,
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
      await runDDL(
        db,
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
