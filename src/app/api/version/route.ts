import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Restituisce l'id del deploy corrente. Il client lo confronta con quello con
// cui e' stato caricato: se cambia, vuol dire che e' uscito un nuovo deploy.
export async function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
