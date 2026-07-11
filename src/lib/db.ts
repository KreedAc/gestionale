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

let pagamentiColsReady: Promise<void> | null = null;

// Aggiunge (una volta) le colonne sezione alla tabella pagamenti se mancano.
// Tollera sia "duplicate column" (gia' presenti) sia l'eventuale falso errore
// "migration jobs" di Turso: la colonna viene comunque creata sul database.
export function ensurePagamentiColumns(): Promise<void> {
  if (!pagamentiColsReady) {
    pagamentiColsReady = (async () => {
      const db = getDb();
      const alters = [
        "ALTER TABLE pagamenti ADD COLUMN lamezia INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE pagamenti ADD COLUMN rende INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE pagamenti ADD COLUMN bonifico INTEGER NOT NULL DEFAULT 0",
      ];
      for (const sql of alters) {
        try {
          await db.execute(sql);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("duplicate column") || msg.includes("migration jobs")) continue;
          throw e;
        }
      }
    })();
  }
  return pagamentiColsReady;
}
