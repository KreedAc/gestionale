import { NextResponse } from "next/server";
import { checkCredentials } from "@/lib/auth";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { ensureSchema, getDb } from "@/lib/db";
import type { Client } from "@libsql/client";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5; // tentativi falliti consentiti...
const WINDOW_MIN = 15; // ...entro questa finestra (minuti), per IP

// IP del client (su Netlify arriva da questi header).
function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  // Blocco anti-bruteforce basato su Turso. IMPORTANTE: se Turso non e'
  // raggiungibile NON blocchiamo il login (fail-open), cosi' un problema al
  // database non chiude fuori l'utente. Il rate limiting resta attivo quando
  // Turso risponde.
  let db: Client | null = null;
  let failed = 0;
  try {
    await ensureSchema();
    db = getDb();
    await db.execute({
      sql: `DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')`,
      args: [],
    });
    const recent = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM login_attempts
            WHERE ip = ? AND created_at > datetime('now', ?)`,
      args: [ip, `-${WINDOW_MIN} minutes`],
    });
    failed = Number(recent.rows[0]?.n ?? 0);
  } catch (e) {
    console.warn("Rate limiting non disponibile (Turso non raggiungibile):", (e as Error).message);
    db = null;
  }

  if (db && failed >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Troppi tentativi falliti. Riprova tra qualche minuto." },
      { status: 429 }
    );
  }

  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    if (db) {
      try {
        await db.execute({ sql: `INSERT INTO login_attempts (ip) VALUES (?)`, args: [ip] });
      } catch {
        /* ignora: il rate limiting non e' critico */
      }
    }
    const left = MAX_ATTEMPTS - failed - 1;
    return NextResponse.json(
      { error: db && left > 0 ? `Credenziali errate (${left} tentativi rimasti)` : "Credenziali errate" },
      { status: 401 }
    );
  }

  // accesso riuscito: azzera i tentativi di questo IP
  if (db) {
    try {
      await db.execute({ sql: `DELETE FROM login_attempts WHERE ip = ?`, args: [ip] });
    } catch {
      /* ignora */
    }
  }

  const token = await createSession(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
