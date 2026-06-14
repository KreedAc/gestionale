import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";

export const runtime = "nodejs";

// Elenco pagamenti (prima quelli da pagare).
export async function GET() {
  await ensureSchema();
  const result = await getDb().execute(
    `SELECT id, persona, importo, scadenza, pagato, note
     FROM pagamenti
     ORDER BY pagato ASC, (scadenza IS NULL), scadenza ASC, persona ASC`
  );
  return NextResponse.json({ items: result.rows });
}

// Crea un nuovo pagamento.
export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const persona = String(body.persona ?? "").trim();
  if (!persona) return NextResponse.json({ error: "La persona è obbligatoria" }, { status: 400 });

  const importo = Number.parseFloat(String(body.importo ?? "0").replace(",", "."));

  await getDb().execute({
    sql: `INSERT INTO pagamenti (persona, importo, scadenza, pagato, note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      persona,
      Number.isFinite(importo) ? importo : 0,
      String(body.scadenza ?? "").trim() || null,
      body.pagato ? 1 : 0,
      String(body.note ?? "").trim() || null,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
