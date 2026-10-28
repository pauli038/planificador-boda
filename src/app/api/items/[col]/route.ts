import { NextResponse } from "next/server";
import { ensureSchema, isCollection, sql } from "@/lib/db";

// Alta o actualización de varios registros a la vez (checklist sugerido, acomodo de mesas).
export async function POST(req: Request, ctx: { params: Promise<{ col: string }> }) {
  const { col } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!isCollection(col) || !Array.isArray(body) || body.length > 200) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const rows = body.filter((r) => r && typeof r.id === "string" && /^[\w-]{1,64}$/.test(r.id));
  await ensureSchema();
  await sql.begin(async (tx) => {
    for (const { id, ...data } of rows) {
      await tx`INSERT INTO items (col, id, data) VALUES (${col}, ${id}, ${tx.json(data)}) ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    }
  });
  return NextResponse.json({ ok: true, count: rows.length });
}
