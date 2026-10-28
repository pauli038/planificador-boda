import { NextResponse } from "next/server";
import { dbError, ensureSchema, sql } from "@/lib/db";

export async function PUT(req: Request) {
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await ensureSchema();
    await sql`
      INSERT INTO items (col, id, data) VALUES ('config', 'main', ${sql.json(data)})
      ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
