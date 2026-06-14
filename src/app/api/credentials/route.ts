import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

// Elenco credenziali (senza i segreti in chiaro).
export async function GET() {
  await ensureSchema();
  const result = await getDb().execute(
    `SELECT id, person_name, service, username, notes, expires_at, updated_at
     FROM credentials
     ORDER BY (expires_at IS NULL), expires_at ASC, person_name ASC`
  );
  return NextResponse.json({ items: result.rows });
}

// Crea una nuova credenziale.
export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const person_name = String(body.person_name ?? "").trim();
  const service = String(body.service ?? "").trim();
  if (!person_name || !service) {
    return NextResponse.json({ error: "Persona e servizio sono obbligatori" }, { status: 400 });
  }

  const secret = String(body.secret ?? "");
  await getDb().execute({
    sql: `INSERT INTO credentials (person_name, service, username, secret_encrypted, notes, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      person_name,
      service,
      String(body.username ?? "").trim() || null,
      secret ? encrypt(secret) : null,
      String(body.notes ?? "").trim() || null,
      String(body.expires_at ?? "").trim() || null,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
