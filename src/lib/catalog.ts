export type Guest = { id: string; nombre: string; rsvp: Rsvp; lado: string; acomp: number; mesa: string; telefono: string; notas: string; creado?: number };
export type Expense = { id: string; concepto: string; categoria: string; estimado: number; real: number; pagado: number; notas: string; creado?: number };
export type Task = { id: string; titulo: string; etapa: string; fecha: string; responsable: string; hecho: boolean; notas: string; creado?: number };
export type Vendor = { id: string; nombre: string; servicio: string; estado: VendorState; contacto: string; telefono: string; email: string; costo: number; notas: string; creado?: number };
export type Table = { id: string; nombre: string; capacidad: number; notas: string; creado?: number };
export type ScheduleItem = { id: string; hora: string; titulo: string; lugar: string; responsable: string; notas: string; creado?: number };
export type HoneyItem = { id: string; tipo: string; titulo: string; fecha: string; costo: number; reservado: boolean; confirmacion: string; notas: string; creado?: number };
export type Config = {
  nombres?: string; fecha?: string; hora?: string; lugar?: string; presupuesto?: number;
  lunaDestino?: string; lunaSalida?: string; lunaRegreso?: string; lunaPresupuesto?: number;
};

export type Rsvp = "pendiente" | "si" | "no";
export type VendorState = "cotizando" | "apartado" | "contratado" | "descartado";

export type Data = { config: Config; guests: Guest[]; budget: Expense[]; tasks: Task[]; vendors: Vendor[]; tables: Table[]; schedule: ScheduleItem[]; honeymoon: HoneyItem[] };
export type Col = "guests" | "budget" | "tasks" | "vendors" | "tables" | "schedule" | "honeymoon";
export type Row = Guest | Expense | Task | Vendor | Table | ScheduleItem | HoneyItem;

export const STAGES = ["12+ meses antes", "9–12 meses antes", "6–9 meses antes", "3–6 meses antes", "1–3 meses antes", "Último mes", "Semana de la boda", "Después de la boda"];
export const BUDGET_CATS = ["Recepción y banquete", "Ceremonia", "Vestido y atuendo", "Fotografía y video", "Música", "Flores y decoración", "Invitaciones", "Anillos", "Pastel", "Bebidas", "Transporte", "Belleza", "Luna de miel", "Otros"];
export const SERVICES = ["Salón / Jardín", "Banquete", "Fotografía", "Video", "DJ / Música", "Flores", "Decoración", "Pastel", "Vestido", "Traje", "Maquillaje y peinado", "Invitaciones", "Iglesia / Juez", "Barra de bebidas", "Transporte", "Wedding planner", "Otro"];
export const SIDES = ["Novia", "Novio", "Ambos"];
export const RSVP: Record<Rsvp, [string, string]> = { pendiente: ["Pendiente", "warn"], si: ["Confirmado", "ok"], no: ["No asistirá", "bad"] };
export const VSTATE: Record<VendorState, [string, string]> = { cotizando: ["Cotizando", ""], apartado: ["Apartado", "warn"], contratado: ["Contratado", "ok"], descartado: ["Descartado", "bad"] };

export const SUGGESTED_TASKS: [string, string][] = [
  ["12+ meses antes", "Definir presupuesto total"], ["12+ meses antes", "Hacer la primera lista de invitados"], ["12+ meses antes", "Elegir fecha y estilo de boda"], ["12+ meses antes", "Reservar salón o jardín"], ["12+ meses antes", "Reservar iglesia o juez civil"],
  ["9–12 meses antes", "Contratar fotógrafo y video"], ["9–12 meses antes", "Contratar banquete"], ["9–12 meses antes", "Elegir padrinos y damas"], ["9–12 meses antes", "Enviar save the date"],
  ["6–9 meses antes", "Comprar vestido"], ["6–9 meses antes", "Contratar DJ o grupo"], ["6–9 meses antes", "Contratar flores y decoración"], ["6–9 meses antes", "Reservar luna de miel"], ["6–9 meses antes", "Abrir mesa de regalos"],
  ["3–6 meses antes", "Ordenar invitaciones"], ["3–6 meses antes", "Elegir pastel"], ["3–6 meses antes", "Comprar anillos"], ["3–6 meses antes", "Traje del novio"], ["3–6 meses antes", "Prueba de maquillaje y peinado"], ["3–6 meses antes", "Trámites del civil (papeles y análisis)"],
  ["1–3 meses antes", "Enviar invitaciones"], ["1–3 meses antes", "Degustación del menú"], ["1–3 meses antes", "Definir el programa del día"], ["1–3 meses antes", "Pruebas finales del vestido"],
  ["Último mes", "Confirmar asistencia de invitados"], ["Último mes", "Hacer el acomodo de mesas"], ["Último mes", "Confirmar horarios con cada proveedor"], ["Último mes", "Preparar pagos finales y propinas"],
  ["Semana de la boda", "Entregar lista final al banquete"], ["Semana de la boda", "Preparar maleta de luna de miel"], ["Semana de la boda", "Ensayo de la ceremonia"],
  ["Después de la boda", "Enviar agradecimientos"], ["Después de la boda", "Recoger fotos y video"],
];

export const money = (n: unknown) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(n) || 0);
export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const fmtDate = (iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", opts);
};
export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - t.getTime()) / 86400000);
};

export function guestStats(guests: Guest[]) {
  const persons = (g: Guest) => 1 + (num(g.acomp) || 0);
  const total = guests.reduce((s, g) => s + persons(g), 0);
  const si = guests.filter((g) => g.rsvp === "si").reduce((s, g) => s + persons(g), 0);
  const no = guests.filter((g) => g.rsvp === "no").reduce((s, g) => s + persons(g), 0);
  return { total, si, no, pend: total - si - no, invit: guests.length };
}

export const expenseTotal = (b: Expense) => num(b.real) || num(b.estimado);

export function budgetStats(budget: Expense[], config: Config) {
  const goal = num(config.presupuesto);
  const real = budget.reduce((s, b) => s + expenseTotal(b), 0);
  const paid = budget.reduce((s, b) => s + num(b.pagado), 0);
  return { goal, real, paid, left: real - paid };
}

export function taskStats(tasks: Task[]) {
  const done = tasks.filter((t) => t.hecho).length;
  return { total: tasks.length, done, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function taskSort(a: Task, b: Task) {
  return (
    STAGES.indexOf(a.etapa) - STAGES.indexOf(b.etapa) ||
    (a.fecha || "9999").localeCompare(b.fecha || "9999") ||
    String(a.titulo).localeCompare(String(b.titulo), "es")
  );
}

export type RowInput = Omit<Guest, "id"> | Omit<Expense, "id"> | Omit<Task, "id"> | Omit<Vendor, "id"> | Omit<Table, "id"> | Omit<ScheduleItem, "id"> | Omit<HoneyItem, "id">;

/** Personas que ocupa una invitación (titular + acompañantes). */
export const seats = (g: Guest) => 1 + (num(g.acomp) || 0);

/** Número de mesa natural para ordenar "Mesa 2" antes que "Mesa 10". */
export const tableSort = (a: Table, b: Table) => String(a.nombre).localeCompare(String(b.nombre), "es", { numeric: true });

export const HONEY_TYPES = ["Vuelo", "Hospedaje", "Transporte", "Actividad", "Documentos", "Maleta", "Otro"];

export const SUGGESTED_HONEY: [string, string][] = [
  ["Documentos", "Revisar vigencia de pasaportes"], ["Documentos", "Tramitar visa (si aplica)"], ["Documentos", "Contratar seguro de viaje"],
  ["Vuelo", "Comprar vuelo de ida"], ["Vuelo", "Comprar vuelo de regreso"], ["Hospedaje", "Reservar hotel"],
  ["Transporte", "Traslado aeropuerto – hotel"], ["Actividad", "Cena romántica"], ["Actividad", "Tour o excursión"],
  ["Maleta", "Ropa de playa / clima"], ["Maleta", "Cargadores y adaptador de enchufe"], ["Maleta", "Medicinas y bloqueador"],
  ["Otro", "Avisar al banco del viaje"], ["Otro", "Cambiar moneda"],
];

export const SUGGESTED_SCHEDULE: [string, string, string][] = [
  ["11:00", "Peinado y maquillaje", "Casa de la novia"], ["14:00", "Sesión de fotos de preparación", "Casa de la novia"],
  ["16:00", "Ceremonia", ""], ["17:00", "Fotos con familia y padrinos", ""], ["18:00", "Coctel de bienvenida", "Salón"],
  ["19:00", "Entrada de los novios", "Salón"], ["19:15", "Primer baile", "Salón"], ["19:30", "Brindis y palabras", "Salón"],
  ["20:00", "Cena", "Salón"], ["21:30", "Corte del pastel", "Salón"], ["22:00", "Fiesta", "Salón"],
  ["23:30", "Lanzamiento del ramo", "Salón"], ["01:00", "Salida de los novios", ""],
];

/** Orden del programa: lo de la madrugada (antes de las 6) va al final, porque es la misma noche. */
export const scheduleSort = (a: ScheduleItem, b: ScheduleItem) => {
  const k = (h: string) => (h && h < "06:00" ? "z" + h : h || "zz");
  return k(a.hora).localeCompare(k(b.hora)) || String(a.titulo).localeCompare(String(b.titulo), "es");
};
