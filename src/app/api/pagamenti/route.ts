import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

// Elenco pagamenti (prima quelli da pagare).
export async function GET() {
  try {
    await ensureSchema();
    const result = await getDb().execute(
      `SELECT id, persona, importo, scadenza, pagato, note
       FROM pagamenti
       ORDER BY persona ASC`
    );
    return NextResponse.json({ items: result.rows });
  } catch (e) {
    return apiError(e);
  }
}

// Crea un nuovo pagamento.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

    const persona = String(body.persona ?? "").trim();
    if (!persona) return NextResponse.json({ error: "La persona è obbligatoria" }, { status: 400 });

    const importo = Number.parseFloat(String(body.importo ?? "0").replace(",", "."));

    await ensureSchema();
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
  } catch (e) {
    return apiError(e);
  }
}
