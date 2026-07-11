import { NextResponse } from "next/server";
import { ensurePagamentiColumns, getDb } from "@/lib/db";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

// Elenco pagamenti (ordine alfabetico per persona).
export async function GET() {
  try {
    await ensurePagamentiColumns();
    const result = await getDb().execute(
      `SELECT id, persona, importo, scadenza, pagato, note, lamezia, rende, bonifico
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

    await ensurePagamentiColumns();
    await getDb().execute({
      sql: `INSERT INTO pagamenti (persona, importo, scadenza, pagato, note, lamezia, rende, bonifico)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        persona,
        Number.isFinite(importo) ? importo : 0,
        String(body.scadenza ?? "").trim() || null,
        body.pagato ? 1 : 0,
        String(body.note ?? "").trim() || null,
        body.lamezia ? 1 : 0,
        body.rende ? 1 : 0,
        body.bonifico ? 1 : 0,
      ],
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
