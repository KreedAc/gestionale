import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// Dettaglio di una credenziale, con il segreto decifrato (per modifica/visualizzazione).
export async function GET(_req: Request, { params }: Params) {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `SELECT id, person_name, service, username, secret_encrypted, notes, expires_at
          FROM credentials WHERE id = ?`,
    args: [params.id],
  });
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Non trovata" }, { status: 404 });

  const enc = row.secret_encrypted as string | null;
  return NextResponse.json({
    item: {
      id: row.id,
      person_name: row.person_name,
      service: row.service,
      username: row.username,
      notes: row.notes,
      expires_at: row.expires_at,
      secret: enc ? decrypt(enc) : "",
    },
  });
}

// Aggiorna una credenziale.
export async function PUT(req: Request, { params }: Params) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const person_name = String(body.person_name ?? "").trim();
  const service = String(body.service ?? "").trim();
  if (!person_name || !service) {
    return NextResponse.json({ error: "Persona e servizio sono obbligatori" }, { status: 400 });
  }

  const secret = String(body.secret ?? "");
  const result = await getDb().execute({
    sql: `UPDATE credentials
          SET person_name = ?, service = ?, username = ?, secret_encrypted = ?,
              notes = ?, expires_at = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      person_name,
      service,
      String(body.username ?? "").trim() || null,
      secret ? encrypt(secret) : null,
      String(body.notes ?? "").trim() || null,
      String(body.expires_at ?? "").trim() || null,
      params.id,
    ],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovata" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Elimina una credenziale.
export async function DELETE(_req: Request, { params }: Params) {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `DELETE FROM credentials WHERE id = ?`,
    args: [params.id],
  });
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Non trovata" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
