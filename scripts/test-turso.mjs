// Verifica la connessione a Turso: crea lo schema, scrive/legge/cancella una riga di prova.
// Uso (dalla tua macchina, dalla radice del progetto):
//   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/test-turso.mjs
// Oppure, se hai gia' compilato il file .env, lancia: npm run test:turso
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Mancano TURSO_DATABASE_URL e/o TURSO_AUTH_TOKEN nell'ambiente.");
  process.exit(1);
}

const db = createClient({ url, authToken });

try {
  await db.execute(`CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    username TEXT,
    password_cifrata TEXT,
    scadenza TEXT,
    credito_mesi INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pagamenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona TEXT NOT NULL,
    importo REAL NOT NULL DEFAULT 0,
    scadenza TEXT,
    pagato INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  console.log("OK  schema creato/verificato (clienti, pagamenti)");

  const ins = await db.execute({
    sql: "INSERT INTO clienti (nome, username, scadenza, credito_mesi) VALUES (?, ?, ?, ?)",
    args: ["__TEST__", "prova", "2026-12-31", 3],
  });
  console.log("OK  scrittura: inserito cliente di prova id=" + ins.lastInsertRowid);

  const sel = await db.execute("SELECT nome, credito_mesi FROM clienti WHERE nome = '__TEST__'");
  console.log("OK  lettura:", JSON.stringify(sel.rows[0]));

  await db.execute("DELETE FROM clienti WHERE nome = '__TEST__'");
  console.log("OK  pulizia: riga di prova rimossa");

  console.log("\nCONNESSIONE A TURSO FUNZIONANTE");
} catch (e) {
  console.error("ERRORE:", e.message);
  process.exit(1);
}
