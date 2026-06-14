import { NextResponse } from "next/server";

// Trasforma un errore lato server in una risposta JSON leggibile,
// cosi' l'interfaccia puo' mostrare il motivo reale invece di un generico errore.
export function apiError(e: unknown) {
  const message = e instanceof Error ? e.message : "Errore interno del server";
  console.error("API error:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
