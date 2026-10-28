import { NextResponse } from "next/server";
import { dbError, ensureSchema, isCollection, sql } from "@/lib/db";

type Ctx = { params: Promise<{ col: string; id: string }> };

async function target(ctx: Ctx) {
  const { col, id } = await ctx.params;
  if (!isCollection(col) || !/^[\w-]{1,64}$/.test(id)) return null;
  return { col, id };
}

export async function PUT(req: Request, ctx: Ctx) {
  const t = await target(ctx);
  const data = await req.json().catch(() => null);
  if (!t || !data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  delete data.id;
  try {
    await ensureSchema();
    await sql`
      INSERT INTO items (col, id, data) VALUES (${t.col}, ${t.id}, ${sql.json(data)})
      ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const t = await target(ctx);
  if (!t) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await ensureSchema();
    await sql`DELETE FROM items WHERE col = ${t.col} AND id = ${t.id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
