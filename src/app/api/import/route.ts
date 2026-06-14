import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

// Possibili nomi di intestazione per ogni campo (case-insensitive).
const MAP: Record<string, string[]> = {
  nome: ["nome", "cliente", "nominativo", "name"],
  username: ["username", "utente", "user", "login", "email", "codice", "id"],
  password: ["password", "pass", "pwd", "psw"],
  scadenza: ["scadenza", "scadenze", "data scadenza", "scad", "expiry", "data"],
  credito_mesi: ["credito", "credito mesi", "mesi", "mesi da erogare", "credit"],
};

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function resolveColumns(headerRow: ExcelJS.Row) {
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = norm(cell.value);
  });
  const resolved: Record<string, number | null> = {};
  for (const [field, candidates] of Object.entries(MAP)) {
    const col = headers.findIndex((h) => h && candidates.includes(h));
    resolved[field] = col >= 0 ? col : null;
  }
  return { resolved, headers: headers.filter(Boolean) };
}

function cellText(row: ExcelJS.Row, col: number | null): string {
  if (!col) return "";
  const v = row.getCell(col).value;
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text: unknown }).text).trim();
  }
  return String(v).trim();
}

// Normalizza una data in formato YYYY-MM-DD. Accetta GG/MM/AAAA e celle data di Excel.
function parseDate(row: ExcelJS.Row, col: number | null): string | null {
  if (!col) return null;
  const v = row.getCell(col).value;
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // GG/MM/AAAA
  if (m) {
    const [, d, mo, y] = m;
    const yyyy = y.length === 2 ? "20" + y : y;
    return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

function parseIntSafe(row: ExcelJS.Row, col: number | null): number {
  const n = Number.parseInt(cellText(row, col), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    // cast: i tipi di exceljs usano un Buffer non generico, incompatibile con
    // i tipi recenti di @types/node, ma a runtime e' corretto.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buf as any);

    const ws = wb.worksheets.find((w) => norm(w.name).includes("client")) || wb.worksheets[0];
    if (!ws) {
      return NextResponse.json({ error: "Nessun foglio trovato nel file" }, { status: 400 });
    }

    const { resolved, headers } = resolveColumns(ws.getRow(1));
    if (!resolved.nome) {
      return NextResponse.json(
        {
          error:
            "Colonna 'Nome' non trovata. Intestazioni lette: " +
            (headers.join(", ") || "(nessuna)"),
        },
        { status: 400 }
      );
    }

    const statements: { sql: string; args: (string | number | null)[] }[] = [];
    let saltati = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const nome = cellText(row, resolved.nome);
      if (!nome) {
        saltati++;
        continue;
      }
      const password = cellText(row, resolved.password);
      statements.push({
        sql: `INSERT INTO clienti (nome, username, password_cifrata, scadenza, credito_mesi)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          nome,
          cellText(row, resolved.username) || null,
          password ? encrypt(password) : null,
          parseDate(row, resolved.scadenza),
          parseIntSafe(row, resolved.credito_mesi),
        ],
      });
    }

    // Un'unica operazione batch: tutte le righe in una sola chiamata a Turso.
    if (statements.length > 0) {
      await getDb().batch(statements, "write");
    }

    return NextResponse.json({ imported: statements.length, saltati });
  } catch (e) {
    return apiError(e);
  }
}
