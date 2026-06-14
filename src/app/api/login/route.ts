import { NextResponse } from "next/server";
import { checkCredentials } from "@/lib/auth";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    return NextResponse.json({ error: "Credenziali errate" }, { status: 401 });
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
