import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  // Página pública para que cada invitado confirme con su link personal
  if (pathname.startsWith("/confirmar/") || pathname.startsWith("/api/rsvp/")) return NextResponse.next();

  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
