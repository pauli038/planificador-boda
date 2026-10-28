import { NextResponse } from "next/server";
import { dbError, sql } from "@/lib/db";
import { findInvitation } from "@/lib/rsvp";

type Ctx = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Este link de invitación no existe o ya no es válido." }, { status: 404 });

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const found = await findInvitation((await ctx.params).code);
    return found ? NextResponse.json(found.invitation) : notFound();
  } catch (e) {
    return dbError(e);
  }
}

// Respuesta del invitado: solo puede cambiar su confirmación, cuántos van y su mensaje.
export async function POST(req: Request, ctx: Ctx) {
  const body = await req.json().catch(() => null);
  const rsvp = body?.rsvp;
  if (rsvp !== "si" && rsvp !== "no") return NextResponse.json({ error: "Elige si asistirás o no." }, { status: 400 });
  try {
    const found = await findInvitation((await ctx.params).code);
    if (!found) return notFound();
    const max = found.invitation.lugares;
    const asistentes = rsvp === "si" ? Math.min(max, Math.max(1, Math.round(Number(body.asistentes) || 1))) : 0;
    const mensaje = String(body.mensaje ?? "").trim().slice(0, 1000);
    const patch = { rsvp, asistentes, mensaje, respondio: Date.now() };
    await sql`UPDATE items SET data = data || ${sql.json(patch)}, updated_at = now() WHERE col = 'guests' AND id = ${found.id}`;
    return NextResponse.json({ ok: true, ...patch });
  } catch (e) {
    return dbError(e);
  }
}
