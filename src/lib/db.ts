import postgres from "postgres";

// Neon agrega `channel_binding=require` a su cadena de conexión. Es una opción solo de libpq:
// postgres.js la reenvía al servidor como parámetro y la conexión falla, así que se quita.
const url = (process.env.DATABASE_URL || "")
  .replace(/([?&])channel_binding=[^&]*(&|$)/, (_, pre, post) => (post ? pre : ""))
  .trim();

// Una sola conexión por instancia: ideal para funciones serverless (Vercel).
// Los poolers (Supabase en el puerto 6543, Neon con "-pooler" en el host) trabajan por
// transacción, así que se desactivan los prepared statements.
const pooled = /:6543\//.test(url) || /-pooler\./.test(url);
export const sql = postgres(url, { max: 1, prepare: !pooled });

/** Respuesta de error legible para la app, y el detalle completo en los logs de Vercel. */
export function dbError(e: unknown) {
  console.error(e);
  const message = e instanceof Error ? e.message : String(e);
  return Response.json({ error: message }, { status: 500 });
}

export const COLLECTIONS = ["guests", "budget", "tasks", "vendors", "tables", "schedule", "honeymoon"] as const;
export type Collection = (typeof COLLECTIONS)[number];
export const isCollection = (c: string): c is Collection => (COLLECTIONS as readonly string[]).includes(c);

let ready: Promise<unknown> | null = null;

// Crea la tabla la primera vez; no hace falta correr migraciones a mano.
export function ensureSchema() {
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL.");
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS items (
      col text NOT NULL,
      id text NOT NULL,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (col, id)
    )`.catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
