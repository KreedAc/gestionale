import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// Dettaglio cliente con password decifrata (per modifica/visualizzazione).
export async function GET(_req: Request, { params }: Params) {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `SELECT id, nome, username, password_cifrata, scadenza, credito_mesi
          FROM clienti WHERE id = ?`,
    args: [params.id],
  });
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const enc = row.password_cifrata as string | null;
  return NextResponse.json({
    item: {
      id: row.id,
      nome: row.nome,
      username: row.username,
      scadenza: row.scadenza,
      credito_mesi: row.credito_mesi,
      password: enc ? decrypt(enc) : "",
    },
  });
}

// Aggiorna un cliente.
export async function PUT(req: Request, { params }: Params) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const nome = String(body.nome ?? "").trim();
  if (!nome) return NextResponse.json({ error: "Il nome è obbligatorio" }, { status: 400 });

  const password = String(body.password ?? "");
  const credito = Number.parseInt(String(body.credito_mesi ?? "0"), 10);

  const result = await getDb().execute({
    sql: `UPDATE clienti
          SET nome = ?, username = ?, password_cifrata = ?, scadenza = ?,
              credito_mesi = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      nome,
      String(body.username ?? "").trim() || null,
      password ? encrypt(password) : null,
      String(body.scadenza ?? "").trim() || null,
      Number.isFinite(credito) ? credito : 0,
      params.id,
    ],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Elimina un cliente.
export async function DELETE(_req: Request, { params }: Params) {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `DELETE FROM clienti WHERE id = ?`,
    args: [params.id],
  });
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
