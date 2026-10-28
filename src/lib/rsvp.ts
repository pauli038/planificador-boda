import { ensureSchema, sql } from "@/lib/db";
import { invitedSeats, type Config, type Guest } from "@/lib/catalog";

export const validCode = (c: string) => /^[a-z2-9]{6,32}$/.test(c);

/** Lo que ve el invitado en su página: solo sus datos y los de la boda, nada de otros invitados. */
export type Invitation = {
  nombre: string; lugares: number; rsvp: Guest["rsvp"]; asistentes: number; mensaje: string;
  /** Si el invitado ya respondió él mismo desde su link. */
  respondio: boolean;
  boda: Pick<Config, "nombres" | "fecha" | "hora" | "lugar">;
};

export async function findInvitation(code: string): Promise<{ id: string; guest: Guest; invitation: Invitation } | null> {
  if (!validCode(code)) return null;
  await ensureSchema();
  const [row] = await sql<{ id: string; data: Guest }[]>`
    SELECT id, data FROM items WHERE col = 'guests' AND data->>'codigo' = ${code} LIMIT 1`;
  if (!row) return null;
  const [cfg] = await sql<{ data: Config }[]>`SELECT data FROM items WHERE col = 'config' AND id = 'main'`;
  const g = row.data;
  const c = cfg?.data ?? {};
  return {
    id: row.id,
    guest: g,
    invitation: {
      nombre: g.nombre,
      lugares: invitedSeats(g),
      rsvp: g.rsvp || "pendiente",
      asistentes: Number(g.asistentes) || 0,
      mensaje: g.mensaje || "",
      respondio: !!g.respondio,
      boda: { nombres: c.nombres, fecha: c.fecha, hora: c.hora, lugar: c.lugar },
    },
  };
}
