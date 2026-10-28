import { NextResponse } from "next/server";
import { COLLECTIONS, ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Todo el estado de la boda en una sola respuesta: es poco y así cada sincronización es una consulta.
export async function GET() {
  await ensureSchema();
  const rows = await sql<{ col: string; id: string; data: Record<string, unknown> }[]>`
    SELECT col, id, data FROM items ORDER BY updated_at`;
  const out: Record<string, unknown> = { config: {} };
  for (const c of COLLECTIONS) out[c] = [];
  for (const r of rows) {
    if (r.col === "config") out.config = r.data;
    else if (Array.isArray(out[r.col])) (out[r.col] as unknown[]).push({ ...r.data, id: r.id });
  }
  return NextResponse.json(out);
}
