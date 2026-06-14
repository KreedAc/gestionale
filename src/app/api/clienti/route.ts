import { NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

// Elenco clienti (senza password in chiaro).
export async function GET() {
  await ensureSchema();
  const result = await getDb().execute(
    `SELECT id, nome, username, scadenza, credito_mesi
     FROM clienti
     ORDER BY (scadenza IS NULL), scadenza ASC, nome ASC`
  );
  return NextResponse.json({ items: result.rows });
}

// Crea un nuovo cliente.
export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const nome = String(body.nome ?? "").trim();
  if (!nome) return NextResponse.json({ error: "Il nome è obbligatorio" }, { status: 400 });

  const password = String(body.password ?? "");
  const credito = Number.parseInt(String(body.credito_mesi ?? "0"), 10);

  await getDb().execute({
    sql: `INSERT INTO clienti (nome, username, password_cifrata, scadenza, credito_mesi)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      nome,
      String(body.username ?? "").trim() || null,
      password ? encrypt(password) : null,
      String(body.scadenza ?? "").trim() || null,
      Number.isFinite(credito) ? credito : 0,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
