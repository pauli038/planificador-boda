import ExcelJS from "exceljs";
import { dbError, ensureSchema, sql } from "@/lib/db";
import { RSVP, seats, tableSort, todayISO, type Config, type Guest, type Rsvp, type Table } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const ACCENT = "FF35614F";
const HEAD_FILL = "FFE2ECE6";

function styleSheet(ws: ExcelJS.Worksheet) {
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: ACCENT } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (ws.rowCount > 1) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  try {
    await ensureSchema();
    const rows = await sql<{ col: string; id: string; data: Record<string, unknown> }[]>`
      SELECT col, id, data FROM items WHERE col IN ('guests', 'tables', 'config')`;
    const guests = rows.filter((r) => r.col === "guests").map((r) => ({ ...r.data, id: r.id }) as Guest)
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    const tables = rows.filter((r) => r.col === "tables").map((r) => ({ ...r.data, id: r.id }) as Table).sort(tableSort);
    const config = (rows.find((r) => r.col === "config")?.data ?? {}) as Config;
    const tableName = Object.fromEntries(tables.map((t) => [t.id, t.nombre]));
    const mesa = (g: Guest) => (g.mesa ? tableName[g.mesa] ?? g.mesa : "");
    const estado = (g: Guest) => RSVP[(g.rsvp || "pendiente") as Rsvp][0];

    const wb = new ExcelJS.Workbook();
    wb.creator = "Planificador de Boda";
    wb.created = new Date();

    // Hoja 1: lista completa
    const ws = wb.addWorksheet("Invitados");
    ws.columns = [
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Invitado de", key: "lado", width: 13 },
      { header: "Acompañantes", key: "acomp", width: 14 },
      { header: "Personas", key: "personas", width: 10 },
      { header: "Confirmación", key: "rsvp", width: 14 },
      { header: "Mesa", key: "mesa", width: 14 },
      { header: "Teléfono", key: "telefono", width: 16 },
      { header: "Notas", key: "notas", width: 40 },
      { header: "Mensaje del invitado", key: "mensaje", width: 40 },
      { header: "Link de confirmación", key: "link", width: 48 },
    ];
    for (const g of guests) {
      ws.addRow({
        nombre: g.nombre, lado: g.lado, acomp: Number(g.acomp) || 0, personas: seats(g), rsvp: estado(g), mesa: mesa(g),
        telefono: g.telefono, notas: g.notas, mensaje: g.mensaje || "", link: g.codigo ? `${origin}/confirmar/${g.codigo}` : "",
      });
    }
    ws.getColumn("mensaje").alignment = { wrapText: true, vertical: "top" };
    ws.getColumn("notas").alignment = { wrapText: true, vertical: "top" };
    styleSheet(ws);

    // Hoja 2: acomodo por mesa, lista para el salón o la coordinadora
    const wm = wb.addWorksheet("Por mesa");
    wm.columns = [
      { header: "Mesa", key: "mesa", width: 16 },
      { header: "Invitado", key: "nombre", width: 30 },
      { header: "Personas", key: "personas", width: 10 },
      { header: "Confirmación", key: "rsvp", width: 14 },
      { header: "Notas", key: "notas", width: 40 },
    ];
    const attending = guests.filter((g) => g.rsvp !== "no");
    for (const t of tables) {
      const at = attending.filter((g) => g.mesa === t.id);
      for (const g of at) wm.addRow({ mesa: t.nombre, nombre: g.nombre, personas: seats(g), rsvp: estado(g), notas: g.notas });
      const used = at.reduce((n, g) => n + seats(g), 0);
      const total = wm.addRow({ mesa: t.nombre, nombre: `Total (${used} de ${Number(t.capacidad) || 0} lugares)`, personas: used });
      total.font = { bold: true };
    }
    const unseated = attending.filter((g) => !g.mesa || !tableName[g.mesa]);
    for (const g of unseated) wm.addRow({ mesa: "Sin mesa", nombre: g.nombre, personas: seats(g), rsvp: estado(g), notas: g.notas });
    styleSheet(wm);

    // Hoja 3: resumen
    const sum = (list: Guest[]) => list.reduce((n, g) => n + seats(g), 0);
    const wr = wb.addWorksheet("Resumen");
    wr.columns = [{ header: "Concepto", key: "k", width: 28 }, { header: "Cantidad", key: "v", width: 12 }];
    const lines: [string, number][] = [
      ["Invitaciones", guests.length],
      ["Personas invitadas", sum(guests)],
      ["Confirmadas", sum(guests.filter((g) => g.rsvp === "si"))],
      ["Pendientes", sum(guests.filter((g) => !g.rsvp || g.rsvp === "pendiente"))],
      ["No asistirán", sum(guests.filter((g) => g.rsvp === "no"))],
      ["De la novia", sum(guests.filter((g) => g.lado === "Novia"))],
      ["Del novio", sum(guests.filter((g) => g.lado === "Novio"))],
      ["De ambos", sum(guests.filter((g) => g.lado !== "Novia" && g.lado !== "Novio"))],
      ["Mesas", tables.length],
      ["Sentadas en mesa", sum(attending) - sum(unseated)],
      ["Sin mesa", sum(unseated)],
    ];
    for (const [k, v] of lines) wr.addRow({ k, v });
    styleSheet(wr);
    wr.autoFilter = undefined as unknown as ExcelJS.AutoFilter;

    const buf = await wb.xlsx.writeBuffer();
    const slug = (config.nombres || "boda").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="invitados-${slug || "boda"}-${todayISO()}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return dbError(e);
  }
}
