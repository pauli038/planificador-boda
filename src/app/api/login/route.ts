import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, createToken } from "@/lib/session";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.APP_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Falta configurar APP_PASSWORD en el servidor." }, { status: 500 });
  if (typeof password !== "string" || password !== expected) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
