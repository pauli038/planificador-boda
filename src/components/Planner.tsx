"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./Icons";
import { ItemForm, SettingsForm } from "./Forms";
import { AssignSheet, BulkTablesSheet, SeatingView, occupancy } from "./Seating";
import {
  RSVP, STAGES, SUGGESTED_TASKS, VSTATE,
  budgetStats, daysUntil, expenseTotal, fmtDate, guestStats, money, num, seats, taskSort, taskStats, todayISO, uid,
  type Col, type Config, type Data, type Expense, type Guest, type Row, type RowInput, type Rsvp, type Table, type Task, type Vendor, type VendorState,
} from "@/lib/catalog";

type Tab = "inicio" | "invitados" | "mesas" | "presupuesto" | "tareas" | "proveedores";
// [clave, nombre, nombre corto para la barra del teléfono, ícono]
const TABS: [Tab, string, string, IconName][] = [
  ["inicio", "Inicio", "Inicio", "home"], ["invitados", "Invitados", "Invitados", "guests"], ["mesas", "Mesas", "Mesas", "tables"],
  ["presupuesto", "Presupuesto", "Gastos", "budget"], ["tareas", "Tareas", "Tareas", "tasks"], ["proveedores", "Proveedores", "Proveed.", "vendors"],
];
const TAB_COL: Partial<Record<Tab, Col>> = { invitados: "guests", mesas: "tables", presupuesto: "budget", tareas: "tasks", proveedores: "vendors" };
const EMPTY: Data = { config: {}, guests: [], budget: [], tasks: [], vendors: [], tables: [] };
const POLL_MS = 8000;

type Sheet = { kind: "item"; col: Col; id?: string } | { kind: "settings" } | { kind: "assign"; id: string } | { kind: "bulkTables" } | null;

type Theme = "system" | "light" | "dark";
const THEMES: Record<Theme, [string, IconName, Theme]> = {
  system: ["Tema: automático", "auto", "light"],
  light: ["Tema: claro", "sun", "dark"],
  dark: ["Tema: oscuro", "moon", "system"],
};

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  try { localStorage.setItem("boda-theme", t); } catch {}
}

export default function Planner() {
  const [data, setData] = useState<Data>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("inicio");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [gFilter, setGFilter] = useState("todos");
  const [gQuery, setGQuery] = useState("");
  const [tFilter, setTFilter] = useState("pendientes");
  const [vFilter, setVFilter] = useState("todos");
  const [theme, setTheme] = useState<Theme>("system");
  const pending = useRef(0);

  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem("boda-theme"); } catch {}
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  function cycleTheme() {
    const next = THEMES[theme][2];
    setTheme(next);
    applyTheme(next);
  }

  const toast = useCallback((m: string) => setToastMsg(m), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  /* ---------- Sincronización con el servidor ---------- */
  const refresh = useCallback(async () => {
    const res = await fetch("/api/data", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return void (window.location.href = "/login");
    if (!res?.ok) return;
    const next = (await res.json()) as Data;
    // No pisar cambios locales que aún se están guardando
    if (pending.current === 0) setData(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (TABS.some(([k]) => k === h)) setTab(h as Tab);
    refresh();
    const iv = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  const send = useCallback(async (url: string, method: string, body?: unknown) => {
    pending.current++;
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.status === 401) return void (window.location.href = "/login");
      if (!res.ok) throw new Error();
    } catch {
      toast("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      pending.current--;
      if (pending.current === 0) refresh();
    }
  }, [refresh, toast]);

  const saveItem = useCallback((col: Col, id: string, row: RowInput) => {
    setData((d) => {
      const list = d[col] as Row[];
      const full = { ...row, id } as Row;
      const exists = list.some((x) => x.id === id);
      return { ...d, [col]: exists ? list.map((x) => (x.id === id ? full : x)) : [...list, full] };
    });
    return send(`/api/items/${col}/${id}`, "PUT", row);
  }, [send]);

  const removeItem = useCallback((col: Col, id: string) => {
    setData((d) => ({ ...d, [col]: (d[col] as Row[]).filter((x) => x.id !== id) }));
    return send(`/api/items/${col}/${id}`, "DELETE");
  }, [send]);

  const saveMany = useCallback((col: Col, rows: Row[]) => {
    if (!rows.length) return Promise.resolve();
    const byId = new Map(rows.map((r) => [r.id, r]));
    setData((d) => {
      const list = d[col] as Row[];
      const kept = list.map((x) => byId.get(x.id) ?? x);
      const added = rows.filter((r) => !list.some((x) => x.id === r.id));
      return { ...d, [col]: [...kept, ...added] };
    });
    return send(`/api/items/${col}`, "POST", rows);
  }, [send]);

  const saveConfig = useCallback((config: Config) => {
    setData((d) => ({ ...d, config }));
    return send("/api/config", "PUT", config);
  }, [send]);

  async function seedTasks() {
    const rows: Task[] = SUGGESTED_TASKS.map(([etapa, titulo], i) => ({ id: uid() + i, titulo, etapa, fecha: "", responsable: "", hecho: false, notas: "", creado: Date.now() }));
    setData((d) => ({ ...d, tasks: [...d.tasks, ...rows] }));
    await send("/api/items/tasks", "POST", rows);
    toast("Checklist cargado");
  }

  function toggleTask(t: Task) {
    const { id, ...rest } = t;
    saveItem("tasks", id, { ...rest, hecho: !t.hecho });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  function go(t: Tab) {
    setTab(t);
    history.replaceState(null, "", "#" + t);
    window.scrollTo(0, 0);
  }

  /* ---------- Vistas ---------- */
  const { config, guests, budget, tasks, vendors, tables } = data;
  const seatInfo = useMemo(() => occupancy(tables, guests), [tables, guests]);
  const seatedCount = Object.values(seatInfo.byTable).flat().reduce((n, g) => n + seats(g), 0);
  const unseatedCount = seatInfo.unseated.reduce((n, g) => n + seats(g), 0);
  const tableName = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t.nombre])), [tables]);
  const gs = useMemo(() => guestStats(guests), [guests]);
  const bs = useMemo(() => budgetStats(budget, config), [budget, config]);
  const ts = useMemo(() => taskStats(tasks), [tasks]);
  const d = daysUntil(config.fecha);

  const openItem = (col: Col, id?: string) => setSheet({ kind: "item", col, id });

  const taskRow = (t: Task) => {
    const overdue = !t.hecho && t.fecha && t.fecha < todayISO();
    const sub = [t.fecha ? fmtDate(t.fecha) : "", t.responsable].filter(Boolean).join(" · ");
    return (
      <div key={t.id} className={`item ${t.hecho ? "done" : ""}`}>
        <button className={`check ${t.hecho ? "on" : ""}`} onClick={() => toggleTask(t)} aria-label={`${t.hecho ? "Marcar pendiente" : "Marcar hecha"}: ${t.titulo}`}>
          {t.hecho && <Icon name="check" />}
        </button>
        <button className="main" style={{ border: 0, background: "none", textAlign: "left", padding: 0 }} onClick={() => openItem("tasks", t.id)}>
          <span className="t">{t.titulo}</span>
          {sub && <span className="s">{sub}</span>}
        </button>
        {overdue && <span className="pill bad">Vencida</span>}
      </div>
    );
  };

  const empty = (title: string, text: string) => (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
      <button className="btn" onClick={() => TAB_COL[tab] && openItem(TAB_COL[tab]!)}>Agregar</button>
    </div>
  );

  function vInicio() {
    const goal = bs.goal || bs.real;
    const pctB = goal ? Math.min(100, Math.round((bs.real / goal) * 100)) : 0;
    const upcoming = tasks.filter((t) => !t.hecho).sort(taskSort).slice(0, 4);
    const label = d === null ? "" : d > 1 ? "días para el gran día" : d === 1 ? "día para el gran día" : d === 0 ? "¡Hoy es el gran día!" : "días desde la boda";
    return (
      <>
        {d === null ? (
          <section className="hero hero-empty">
            <h2>¡Bienvenidos!</h2>
            <p style={{ margin: 0 }}>Pon sus nombres y la fecha para empezar la cuenta regresiva.</p>
            <div><button className="btn" onClick={() => setSheet({ kind: "settings" })}>Configurar boda</button></div>
          </section>
        ) : (
          <section className="hero">
            <div>
              <div className="days">{d === 0 ? "♥" : Math.abs(d)}</div>
              <div className="lbl">{label}</div>
            </div>
            <div className="meta">
              <span>{fmtDate(config.fecha, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{config.hora ? ` · ${config.hora}` : ""}</span>
              {config.lugar && <span>{config.lugar}</span>}
            </div>
          </section>
        )}
        <div className="stats">
          <button className="stat" onClick={() => go("invitados")}>
            <small>Confirmados</small>
            <b>{gs.si}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: ".9rem" }}> / {gs.total}</span></b>
            <small>{gs.pend} por confirmar</small>
          </button>
          <button className="stat" onClick={() => go("presupuesto")}>
            <small>Gasto previsto</small><b>{money(bs.real)}</b>
            <div className={`bar ${bs.goal && bs.real > bs.goal ? "over" : ""}`}><i style={{ width: `${pctB}%` }} /></div>
          </button>
          <button className="stat" onClick={() => go("presupuesto")}>
            <small>Pagado</small><b>{money(bs.paid)}</b><small>Faltan {money(bs.left)}</small>
          </button>
          <button className="stat" onClick={() => go("tareas")}>
            <small>Tareas</small><b>{ts.pct}%</b>
            <div className="bar"><i style={{ width: `${ts.pct}%` }} /></div>
          </button>
        </div>
        <div className="cols">
        <section className="card">
          <div className="spread"><h3>Siguientes pendientes</h3><button className="chip" onClick={() => go("tareas")}>Ver todas</button></div>
          {upcoming.length ? (
            <div className="list" style={{ border: 0 }}>{upcoming.map(taskRow)}</div>
          ) : (
            <p className="note" style={{ margin: 0 }}>{tasks.length ? "Todo al día. ¡Bien hecho!" : "Aún no hay tareas. Ve a Tareas para cargar un checklist sugerido."}</p>
          )}
        </section>
        <section className="card">
          <h3>Proveedores</h3>
          <div className="row">
            {(Object.keys(VSTATE) as VendorState[]).map((k) => (
              <span key={k} className={`pill ${VSTATE[k][1]}`}>{VSTATE[k][0]}: {vendors.filter((v) => (v.estado || "cotizando") === k).length}</span>
            ))}
          </div>
          <div className="spread" style={{ marginTop: 6 }}><h3>Mesas</h3><button className="chip" onClick={() => go("mesas")}>Acomodar</button></div>
          <p className="note" style={{ margin: 0 }}>
            {tables.length
              ? `${tables.length} ${tables.length === 1 ? "mesa" : "mesas"} · ${seatedCount} personas sentadas · ${unseatedCount} sin mesa`
              : "Aún no hay mesas. Créalas en la sección Mesas."}
          </p>
        </section>
        </div>
      </>
    );
  }

  function vInvitados() {
    const q = gQuery.trim().toLowerCase();
    let list = guests.filter((g) => gFilter === "todos" || (g.rsvp || "pendiente") === gFilter || g.lado === gFilter);
    if (q) list = list.filter((g) => [g.nombre, tableName[g.mesa] ?? g.mesa, g.notas, g.telefono].join(" ").toLowerCase().includes(q));
    list = [...list].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    const chips: [string, string][] = [["todos", "Todos"], ["pendiente", "Pendientes"], ["si", "Confirmados"], ["no", "No asisten"], ["Novia", "Novia"], ["Novio", "Novio"], ["Ambos", "Ambos"]];
    return (
      <>
        <div className="spread"><h2>Invitados</h2><span className="pill acc">{gs.total} personas</span></div>
        <div className="stats">
          <div className="stat"><small>Invitaciones</small><b>{gs.invit}</b></div>
          <div className="stat"><small>Confirmados</small><b style={{ color: "var(--ok)" }}>{gs.si}</b></div>
          <div className="stat"><small>Pendientes</small><b style={{ color: "var(--warn)" }}>{gs.pend}</b></div>
          <div className="stat"><small>No asisten</small><b style={{ color: "var(--bad)" }}>{gs.no}</b></div>
        </div>
        <div className="toolbar">
          <input className="search" id="gSearch" type="search" placeholder="Buscar por nombre, mesa…" value={gQuery} onChange={(e) => setGQuery(e.target.value)} aria-label="Buscar invitado" />
          <div className="chips">
            {chips.map(([k, l]) => <button key={k} className={`chip ${gFilter === k ? "on" : ""}`} onClick={() => setGFilter(k)}>{l}</button>)}
          </div>
        </div>
        {guests.length === 0 ? empty("Agrega a tu primer invitado", "Cuenta cada invitación con sus acompañantes y marca quién confirma.") :
          list.length ? (
            <div className="list">
              {list.map((g: Guest) => {
                const [l, cls] = RSVP[(g.rsvp || "pendiente") as Rsvp];
                const sub = [g.lado, g.acomp > 0 ? `+${g.acomp} acomp.` : "", g.mesa ? (tableName[g.mesa] ?? `Mesa ${g.mesa}`) : ""].filter(Boolean).join(" · ");
                return (
                  <button key={g.id} className="item" onClick={() => openItem("guests", g.id)}>
                    <div className="main"><span className="t">{g.nombre}</span>{sub && <span className="s">{sub}</span>}</div>
                    <span className={`pill ${cls}`}>{l}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="note">Nadie coincide con ese filtro.</p>}
      </>
    );
  }

  function vPresupuesto() {
    const goal = bs.goal;
    const pct = goal ? Math.round((bs.real / goal) * 100) : 0;
    const groups: Record<string, Expense[]> = {};
    budget.forEach((b) => (groups[b.categoria || "Otros"] ||= []).push(b));
    return (
      <>
        <h2>Presupuesto</h2>
        <section className="card">
          <div className="spread"><h3>Total previsto</h3><button className="chip" onClick={() => setSheet({ kind: "settings" })}>{goal ? `Meta ${money(goal)}` : "Poner meta"}</button></div>
          <div style={{ fontSize: "1.9rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(bs.real)}</div>
          {goal > 0 && (
            <>
              <div className={`bar ${bs.real > goal ? "over" : ""}`}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
              <p className="note" style={{ margin: 0 }}>{bs.real > goal ? `Te pasas por ${money(bs.real - goal)}` : `Te quedan ${money(goal - bs.real)} disponibles (${100 - pct}%)`}</p>
            </>
          )}
          <div className="two">
            <div><h3>Pagado</h3><b style={{ fontVariantNumeric: "tabular-nums" }}>{money(bs.paid)}</b></div>
            <div><h3>Por pagar</h3><b style={{ fontVariantNumeric: "tabular-nums" }}>{money(bs.left)}</b></div>
          </div>
        </section>
        {budget.length === 0 ? empty("Agrega tu primer gasto", "Anota lo estimado, lo que realmente cuesta y cuánto has pagado.") : (
          <div className="list">
            {Object.keys(groups).sort().map((c) => (
              <div key={c} style={{ display: "contents" }}>
                <div className="group-h"><h3>{c}</h3><span style={{ fontVariantNumeric: "tabular-nums", fontSize: ".8rem", color: "var(--muted)" }}>{money(groups[c].reduce((s, x) => s + expenseTotal(x), 0))}</span></div>
                {groups[c].map((b) => {
                  const total = expenseTotal(b), paid = num(b.pagado);
                  const st = paid >= total && total > 0 ? ["Pagado", "ok"] : paid > 0 ? ["Anticipo", "warn"] : ["Sin pagar", ""];
                  return (
                    <button key={b.id} className="item" onClick={() => openItem("budget", b.id)}>
                      <div className="main">
                        <span className="t">{b.concepto}</span>
                        <span className="row">
                          <span className={`pill ${st[1]}`}>{st[0]}</span>
                          {num(b.real) > 0 && num(b.estimado) > 0 && num(b.real) !== num(b.estimado) && <span className="s">Estimado {money(b.estimado)}</span>}
                        </span>
                      </div>
                      <span className="amt">{money(total)}<small>pagado {money(paid)}</small></span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function vTareas() {
    const list = tasks.filter((t) => tFilter === "todas" || (tFilter === "hechas" ? t.hecho : !t.hecho)).sort(taskSort);
    const groups: Record<string, Task[]> = {};
    list.forEach((t) => (groups[t.etapa || "Sin etapa"] ||= []).push(t));
    const order = [...STAGES, "Sin etapa"].filter((s) => groups[s]);
    return (
      <>
        <div className="spread"><h2>Checklist</h2><span className="pill acc">{ts.done} de {ts.total}</span></div>
        {ts.total > 0 && <div className="bar"><i style={{ width: `${ts.pct}%` }} /></div>}
        <div className="chips">
          {[["pendientes", "Pendientes"], ["hechas", "Hechas"], ["todas", "Todas"]].map(([k, l]) => (
            <button key={k} className={`chip ${tFilter === k ? "on" : ""}`} onClick={() => setTFilter(k)}>{l}</button>
          ))}
        </div>
        {tasks.length === 0 ? (
          <div className="empty">
            <strong>Su checklist está vacío</strong>
            <span>Carguen {SUGGESTED_TASKS.length} tareas típicas de una boda, ordenadas por etapa, y ajústenlas a su gusto.</span>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={seedTasks}>Cargar checklist sugerido</button>
              <button className="btn ghost" onClick={() => openItem("tasks")}>Agregar una tarea</button>
            </div>
          </div>
        ) : list.length ? (
          <div className="list">
            {order.map((s) => (
              <div key={s} style={{ display: "contents" }}>
                <div className="group-h"><h3>{s}</h3></div>
                {groups[s].map(taskRow)}
              </div>
            ))}
          </div>
        ) : <p className="note">{tFilter === "pendientes" ? "¡No quedan pendientes!" : "Nada por aquí todavía."}</p>}
      </>
    );
  }

  function vProveedores() {
    const list = vendors
      .filter((v) => vFilter === "todos" || (v.estado || "cotizando") === vFilter)
      .sort((a, b) => String(a.servicio).localeCompare(String(b.servicio), "es") || String(a.nombre).localeCompare(String(b.nombre), "es"));
    return (
      <>
        <h2>Proveedores</h2>
        <div className="chips">
          {[["todos", "Todos"], ...(Object.keys(VSTATE) as VendorState[]).map((k) => [k, VSTATE[k][0]])].map(([k, l]) => (
            <button key={k} className={`chip ${vFilter === k ? "on" : ""}`} onClick={() => setVFilter(k)}>{l}</button>
          ))}
        </div>
        {vendors.length === 0 ? empty("Agrega tu primer proveedor", "Guarda contactos, cotizaciones y en qué va cada trato.") :
          list.length ? (
            <div className="list">
              {list.map((v: Vendor) => {
                const [l, cls] = VSTATE[(v.estado || "cotizando") as VendorState];
                return (
                  <button key={v.id} className="item" onClick={() => openItem("vendors", v.id)}>
                    <div className="main"><span className="t">{v.nombre}</span><span className="s">{[v.servicio, v.contacto, v.telefono].filter(Boolean).join(" · ")}</span></div>
                    <span className="amt">{num(v.costo) ? money(v.costo) : ""}<small><span className={`pill ${cls}`}>{l}</span></small></span>
                  </button>
                );
              })}
            </div>
          ) : <p className="note">Nada con ese estado.</p>}
      </>
    );
  }

  const vMesas = () => (
    <SeatingView
      tables={tables}
      guests={guests}
      onEditTable={(id) => openItem("tables", id)}
      onAssign={(id) => setSheet({ kind: "assign", id })}
      onEditGuest={(id) => openItem("guests", id)}
      onBulk={() => setSheet({ kind: "bulkTables" })}
      onAddTable={() => openItem("tables")}
    />
  );

  function deleteItem(col: Col, id: string) {
    removeItem(col, id);
    // Quien estaba en una mesa borrada queda sin mesa
    if (col === "tables") saveMany("guests", guests.filter((g) => g.mesa === id).map((g) => ({ ...g, mesa: "" })));
  }

  const views: Record<Tab, () => React.ReactNode> = { inicio: vInicio, invitados: vInvitados, mesas: vMesas, presupuesto: vPresupuesto, tareas: vTareas, proveedores: vProveedores };
  const col = TAB_COL[tab];
  const sub = d === null ? "Configura la fecha para ver la cuenta regresiva" : d > 0 ? `Faltan ${d} ${d === 1 ? "día" : "días"} · ${fmtDate(config.fecha)}` : d === 0 ? "¡Hoy es el día!" : `Casados el ${fmtDate(config.fecha)}`;
  const editing = sheet?.kind === "item" && sheet.id ? (data[sheet.col] as Row[]).find((x) => x.id === sheet.id) : undefined;

  const assignTable = sheet?.kind === "assign" ? tables.find((t) => t.id === sheet.id) : undefined;
  const [themeLabel, themeIcon] = THEMES[theme];

  return (
    <>
      <header className="top">
        <div className="wrap wide">
          <div className="brand">
            <h1>{config.nombres || "Nuestra boda"}</h1>
            <p>{sub}</p>
          </div>
          <div className="hdr-actions">
            <button className="icon-btn" onClick={cycleTheme} aria-label={`${themeLabel}. Cambiar tema`} title={themeLabel}><Icon name={themeIcon} /></button>
            <button className="icon-btn" onClick={() => setSheet({ kind: "settings" })} aria-label="Datos de la boda" title="Datos de la boda"><Icon name="settings" /></button>
            <button className="icon-btn desktop-only" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" /></button>
          </div>
        </div>
      </header>

      <div className="shell">
        <nav className="tabs" aria-label="Secciones">
          <div className="in">
            {TABS.map(([k, l, short, i]) => (
              <button key={k} onClick={() => go(k)} aria-current={k === tab ? "page" : undefined} aria-label={l}>
                <Icon name={i} /><span className="long">{l}</span><span className="short" aria-hidden="true">{short}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="content">
          <div className="view">
            {loaded ? views[tab]() : <p className="note">Cargando sus datos…</p>}
            {loaded && tab === "inicio" && (
              <button className="chip mobile-only" style={{ justifySelf: "center" }} onClick={logout}>Cerrar sesión</button>
            )}
          </div>
        </main>
      </div>

      {col && loaded && (
        <button className="fab" onClick={() => openItem(col)} aria-label="Agregar" title="Agregar"><Icon name="plus" /></button>
      )}

      {sheet?.kind === "settings" && (
        <SettingsForm config={config} onClose={() => setSheet(null)} onSave={(c) => { saveConfig(c); setSheet(null); toast("Datos guardados"); }} />
      )}
      {sheet?.kind === "item" && (!sheet.id || editing) && (
        <ItemForm
          key={sheet.id || "new"}
          col={sheet.col}
          item={editing}
          tables={tables}
          guests={guests}
          onClose={() => setSheet(null)}
          onSave={(row) => { saveItem(sheet.col, sheet.id || uid(), row); setSheet(null); toast(sheet.id ? "Cambios guardados" : "Agregado"); }}
          onDelete={sheet.id ? () => { deleteItem(sheet.col, sheet.id!); setSheet(null); toast("Eliminado"); } : undefined}
        />
      )}
      {assignTable && (
        <AssignSheet
          table={assignTable}
          tables={tables}
          guests={guests}
          onClose={() => setSheet(null)}
          onSave={(changed) => { saveMany("guests", changed); setSheet(null); toast(changed.length ? `${assignTable.nombre} actualizada` : "Sin cambios"); }}
        />
      )}
      {sheet?.kind === "bulkTables" && (
        <BulkTablesSheet
          tables={tables}
          onClose={() => setSheet(null)}
          onSave={(rows) => { saveMany("tables", rows.map((r, i) => ({ ...r, id: uid() + i }) as Table)); setSheet(null); toast(`${rows.length} mesas creadas`); }}
        />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}
