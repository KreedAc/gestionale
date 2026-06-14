import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// Aggiorna un pagamento (anche solo per cambiare lo stato pagato).
export async function PUT(req: Request, { params }: Params) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const persona = String(body.persona ?? "").trim();
  if (!persona) return NextResponse.json({ error: "La persona è obbligatoria" }, { status: 400 });

  const importo = Number.parseFloat(String(body.importo ?? "0").replace(",", "."));

  const result = await getDb().execute({
    sql: `UPDATE pagamenti
          SET persona = ?, importo = ?, scadenza = ?, pagato = ?, note = ?,
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      persona,
      Number.isFinite(importo) ? importo : 0,
      String(body.scadenza ?? "").trim() || null,
      body.pagato ? 1 : 0,
      String(body.note ?? "").trim() || null,
      params.id,
    ],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Elimina un pagamento.
export async function DELETE(_req: Request, { params }: Params) {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `DELETE FROM pagamenti WHERE id = ?`,
    args: [params.id],
  });
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
