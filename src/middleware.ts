import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isLoginPage = pathname === "/login";
  const isLoginApi = pathname === "/api/login";
  const isVersionApi = pathname === "/api/version";

  // Utente non autenticato: lascia passare solo login (pagina e API) e il
  // controllo versione (serve all'aggiornamento automatico).
  if (!session && !isLoginPage && !isLoginApi && !isVersionApi) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Gia' autenticato: non mostrare di nuovo il login.
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
