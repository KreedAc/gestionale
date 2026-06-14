// Importa i dati da un file Excel (.xlsx) nelle tabelle Turso (clienti, pagamenti).
//
// Uso (dalla tua macchina, dalla radice del progetto):
//   1) prova senza scrivere niente (mostra cosa importerebbe):
//        TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." ENCRYPTION_KEY="..." \
//        node scripts/import-excel.mjs ./dati.xlsx
//   2) import vero (scrive nel database):
//        ...stesse env... node scripts/import-excel.mjs ./dati.xlsx --commit
//
// IMPORTANTE: ENCRYPTION_KEY deve essere la STESSA del file .env dell'app,
// altrimenti l'app non potra' decifrare le password importate.
import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { createClient } from "@libsql/client";

// --- Mappatura colonne: a sinistra il nostro campo, a destra i possibili nomi di colonna nell'Excel ---
const MAP_CLIENTI = {
  nome: ["nome", "cliente", "nominativo", "name"],
  username: ["username", "utente", "user", "login", "email"],
  password: ["password", "pass", "pwd", "psw"],
  scadenza: ["scadenza", "scadenze", "data scadenza", "scad", "expiry"],
  credito_mesi: ["credito", "credito mesi", "mesi", "mesi da erogare", "credit"],
};
const MAP_PAGAMENTI = {
  persona: ["persona", "nome", "cliente"],
  importo: ["importo", "euro", "amount", "cifra", "prezzo"],
  scadenza: ["scadenza", "data", "entro"],
  pagato: ["pagato", "saldato", "paid"],
  note: ["note", "nota", "descrizione"],
};

// --- Cifratura (stessa logica di src/lib/crypto.ts) ---
function encrypt(plain) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY deve essere 32 byte in base64");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

const norm = (s) => String(s ?? "").trim().toLowerCase();

// Trova, per ogni nostro campo, l'indice di colonna nel foglio in base alla riga di intestazione.
function resolveColumns(headerRow, mapping) {
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = norm(cell.value);
  });
  const resolved = {};
  for (const [field, candidates] of Object.entries(mapping)) {
    const col = headers.findIndex((h) => h && candidates.includes(h));
    resolved[field] = col >= 0 ? col : null;
  }
  return resolved;
}

function cellText(row, col) {
  if (!col) return "";
  const v = row.getCell(col).value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String(v.text).trim(); // hyperlink/rich text
  return String(v).trim();
}

// Normalizza una data in formato YYYY-MM-DD.
function parseDate(row, col) {
  if (!col) return null;
  const v = row.getCell(col).value;
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // dd/mm/yyyy
  if (m) {
    const [, d, mo, y] = m;
    const yyyy = y.length === 2 ? "20" + y : y;
    return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s; // lasciala com'e' se non riconosciuta
}

function parseInt0(row, col) {
  const n = Number.parseInt(cellText(row, col), 10);
  return Number.isFinite(n) ? n : 0;
}
function parseFloat0(row, col) {
  const n = Number.parseFloat(cellText(row, col).replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function parseBool(row, col) {
  const t = cellText(row, col).toLowerCase();
  return ["1", "si", "sì", "true", "x", "pagato", "yes"].includes(t) ? 1 : 0;
}

async function main() {
  const file = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!file) {
    console.error("Uso: node scripts/import-excel.mjs <file.xlsx> [--commit]");
    process.exit(1);
  }
  for (const k of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "ENCRYPTION_KEY"]) {
    if (!process.env[k]) {
      console.error(`Manca la variabile d'ambiente ${k}.`);
      process.exit(1);
    }
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log(commit ? "MODALITA': IMPORT REALE\n" : "MODALITA': PROVA (nessuna scrittura). Aggiungi --commit per importare davvero.\n");

  // --- CLIENTI: primo foglio, oppure un foglio chiamato "clienti" ---
  const wsClienti =
    wb.worksheets.find((w) => norm(w.name).includes("client")) || wb.worksheets[0];
  if (wsClienti) {
    const cols = resolveColumns(wsClienti.getRow(1), MAP_CLIENTI);
    console.log(`Foglio CLIENTI: "${wsClienti.name}" — colonne riconosciute:`, cols);
    let n = 0;
    for (let r = 2; r <= wsClienti.rowCount; r++) {
      const row = wsClienti.getRow(r);
      const nome = cellText(row, cols.nome);
      if (!nome) continue;
      const password = cellText(row, cols.password);
      const rec = {
        nome,
        username: cellText(row, cols.username) || null,
        password_cifrata: password ? encrypt(password) : null,
        scadenza: parseDate(row, cols.scadenza),
        credito_mesi: parseInt0(row, cols.credito_mesi),
      };
      n++;
      if (commit) {
        await db.execute({
          sql: `INSERT INTO clienti (nome, username, password_cifrata, scadenza, credito_mesi)
                VALUES (?, ?, ?, ?, ?)`,
          args: [rec.nome, rec.username, rec.password_cifrata, rec.scadenza, rec.credito_mesi],
        });
      } else if (n <= 5) {
        console.log("  anteprima:", { ...rec, password_cifrata: rec.password_cifrata ? "<cifrata>" : null });
      }
    }
    console.log(`  ${commit ? "importati" : "da importare"}: ${n} clienti\n`);
  }

  // --- PAGAMENTI: solo se esiste un foglio dedicato ---
  const wsPag = wb.worksheets.find((w) => norm(w.name).includes("pagam"));
  if (wsPag) {
    const cols = resolveColumns(wsPag.getRow(1), MAP_PAGAMENTI);
    console.log(`Foglio PAGAMENTI: "${wsPag.name}" — colonne riconosciute:`, cols);
    let n = 0;
    for (let r = 2; r <= wsPag.rowCount; r++) {
      const row = wsPag.getRow(r);
      const persona = cellText(row, cols.persona);
      if (!persona) continue;
      const rec = {
        persona,
        importo: parseFloat0(row, cols.importo),
        scadenza: parseDate(row, cols.scadenza),
        pagato: parseBool(row, cols.pagato),
        note: cellText(row, cols.note) || null,
      };
      n++;
      if (commit) {
        await db.execute({
          sql: `INSERT INTO pagamenti (persona, importo, scadenza, pagato, note)
                VALUES (?, ?, ?, ?, ?)`,
          args: [rec.persona, rec.importo, rec.scadenza, rec.pagato, rec.note],
        });
      } else if (n <= 5) {
        console.log("  anteprima:", rec);
      }
    }
    console.log(`  ${commit ? "importati" : "da importare"}: ${n} pagamenti\n`);
  } else {
    console.log('Nessun foglio "pagamenti" trovato: importo solo i clienti.\n');
  }

  console.log(commit ? "Import completato." : "Prova completata. Controlla la mappatura, poi rilancia con --commit.");
}

main().catch((e) => {
  console.error("ERRORE:", e.message);
  process.exit(1);
});
