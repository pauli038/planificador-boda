import postgres from "postgres";

const url = process.env.DATABASE_URL || "";

// Una sola conexión por instancia: ideal para funciones serverless (Vercel).
// El pooler de transacciones de Supabase (puerto 6543) no admite prepared statements.
export const sql = postgres(url, { max: 1, prepare: !/:6543\//.test(url) });

export const COLLECTIONS = ["guests", "budget", "tasks", "vendors", "tables"] as const;
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
