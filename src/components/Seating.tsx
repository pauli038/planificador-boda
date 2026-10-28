"use client";

import { useMemo, useState } from "react";
import { Field, Sheet } from "./Forms";
import { num, seats, tableSort, type Guest, type Table } from "@/lib/catalog";

/** Invitados que ocupan lugar: todos menos los que ya dijeron que no van. */
const attending = (g: Guest) => g.rsvp !== "no";

export function occupancy(tables: Table[], guests: Guest[]) {
  const ids = new Set(tables.map((t) => t.id));
  const byTable: Record<string, Guest[]> = {};
  const unseated: Guest[] = [];
  for (const g of guests.filter(attending)) {
    if (g.mesa && ids.has(g.mesa)) (byTable[g.mesa] ||= []).push(g);
    else unseated.push(g);
  }
  return { byTable, unseated };
}

/** Mesa redonda vista desde arriba: un punto por silla, relleno si está ocupada. */
function TableRing({ capacity, used }: { capacity: number; used: number }) {
  const n = Math.min(Math.max(capacity, 1), 24);
  const over = used > capacity;
  const R = 34, r = n > 14 ? 4 : 5.5;
  return (
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="22" className="ring-table" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={50 + R * Math.cos(a)} cy={50 + R * Math.sin(a)} r={r} className={i < used ? (over ? "seat over" : "seat on") : "seat"} />;
      })}
      <text x="50" y="50" className="ring-num" textAnchor="middle" dominantBaseline="central">{used}/{capacity}</text>
    </svg>
  );
}

export function SeatingView({ tables, guests, readOnly, onEditTable, onAssign, onEditGuest, onBulk, onAddTable }: {
  tables: Table[]; guests: Guest[]; readOnly?: boolean;
  onEditTable: (id: string) => void; onAssign: (id: string) => void; onEditGuest: (id: string) => void;
  onBulk: () => void; onAddTable: () => void;
}) {
  const { byTable, unseated } = useMemo(() => occupancy(tables, guests), [tables, guests]);
  const sorted = useMemo(() => [...tables].sort(tableSort), [tables]);
  const capacity = tables.reduce((n, t) => n + num(t.capacidad), 0);
  const seated = Object.values(byTable).flat().reduce((n, g) => n + seats(g), 0);
  const waiting = unseated.reduce((n, g) => n + seats(g), 0);
  const overTables = sorted.filter((t) => (byTable[t.id] || []).reduce((n, g) => n + seats(g), 0) > num(t.capacidad)).length;

  return (
    <>
      <div className="spread">
        <h2>Acomodo de mesas</h2>
        <button className="chip" onClick={onBulk} disabled={readOnly}>Crear varias mesas</button>
      </div>
      <div className="stats">
        <div className="stat"><small>Mesas</small><b>{tables.length}</b></div>
        <div className="stat"><small>Lugares</small><b>{capacity}</b><small>{capacity - seated >= 0 ? `${capacity - seated} libres` : `${seated - capacity} de más`}</small></div>
        <div className="stat"><small>Sentados</small><b style={{ color: "var(--ok)" }}>{seated}</b></div>
        <div className="stat"><small>Sin mesa</small><b style={{ color: waiting ? "var(--warn)" : undefined }}>{waiting}</b><small>personas</small></div>
      </div>
      {overTables > 0 && <p className="note" style={{ color: "var(--bad)", margin: 0 }}>{overTables === 1 ? "Hay 1 mesa" : `Hay ${overTables} mesas`} con más personas que lugares.</p>}

      {tables.length === 0 ? (
        <div className="empty">
          <strong>Aún no hay mesas</strong>
          <span>Crea todas las mesas de una vez (por ejemplo 15 mesas de 10) y luego sienta a tus invitados en cada una.</span>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={onBulk} disabled={readOnly}>Crear varias mesas</button>
            <button className="btn ghost" onClick={onAddTable} disabled={readOnly}>Agregar una mesa</button>
          </div>
        </div>
      ) : (
        <div className="tables-grid">
          {sorted.map((t) => {
            const at = byTable[t.id] || [];
            const used = at.reduce((n, g) => n + seats(g), 0);
            const cap = num(t.capacidad);
            return (
              <section key={t.id} className="table-card">
                <button className="table-head" onClick={() => onEditTable(t.id)} aria-label={`Editar ${t.nombre}`}>
                  <TableRing capacity={cap} used={used} />
                  <div className="main">
                    <span className="t">{t.nombre}</span>
                    <span className={`pill ${used > cap ? "bad" : used === cap ? "ok" : ""}`}>
                      {used > cap ? `${used - cap} de más` : used === cap ? "Llena" : `${cap - used} libres`}
                    </span>
                    {t.notas && <span className="s">{t.notas}</span>}
                  </div>
                </button>
                {at.length > 0 && (
                  <ul className="seated">
                    {[...at].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((g) => (
                      <li key={g.id}>
                        <button onClick={() => onEditGuest(g.id)}>
                          {g.nombre}{g.acomp > 0 && <span className="s"> +{g.acomp}</span>}
                          {g.rsvp !== "si" && <span className="dot warn" title="Sin confirmar" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="btn ghost" onClick={() => onAssign(t.id)} disabled={readOnly}>Sentar invitados</button>
              </section>
            );
          })}
        </div>
      )}

      {tables.length > 0 && (
        <section className="card">
          <div className="spread"><h3>Sin mesa</h3><span className="pill warn">{waiting} personas</span></div>
          {unseated.length ? (
            <div className="list" style={{ border: 0 }}>
              {[...unseated].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((g) => (
                <button key={g.id} className="item" onClick={() => onEditGuest(g.id)}>
                  <div className="main"><span className="t">{g.nombre}</span><span className="s">{[g.lado, g.acomp > 0 ? `+${g.acomp} acomp.` : "", g.rsvp === "si" ? "Confirmado" : "Sin confirmar"].filter(Boolean).join(" · ")}</span></div>
                </button>
              ))}
            </div>
          ) : (
            <p className="note" style={{ margin: 0 }}>{guests.length ? "Todos los invitados tienen mesa." : "Agrega invitados en la sección Invitados para poder sentarlos."}</p>
          )}
        </section>
      )}
    </>
  );
}

/** Elegir quién se sienta en una mesa: casillas con el conteo de lugares en vivo. */
export function AssignSheet({ table, tables, guests, onSave, onClose }: {
  table: Table; tables: Table[]; guests: Guest[];
  onSave: (changed: Guest[]) => void; onClose: () => void;
}) {
  const [picked, setPicked] = useState(() => new Set(guests.filter((g) => g.mesa === table.id).map((g) => g.id)));
  const [q, setQ] = useState("");
  const names = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t.nombre])), [tables]);
  const cap = num(table.capacidad);
  const used = guests.filter((g) => picked.has(g.id) && attending(g)).reduce((n, g) => n + seats(g), 0);

  const rank = (g: Guest) => (g.mesa === table.id ? 0 : !g.mesa || !names[g.mesa] ? 1 : 2);
  const list = guests
    .filter(attending)
    .filter((g) => !q.trim() || g.nombre.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => rank(a) - rank(b) || a.nombre.localeCompare(b.nombre, "es"));

  function save() {
    const changed: Guest[] = [];
    for (const g of guests) {
      const want = picked.has(g.id);
      if (want && g.mesa !== table.id) changed.push({ ...g, mesa: table.id });
      if (!want && g.mesa === table.id) changed.push({ ...g, mesa: "" });
    }
    onSave(changed);
  }

  return (
    <Sheet title={`Sentar en ${table.nombre}`} error="" onSave={save} onClose={onClose}>
      <div className="spread">
        <span className="note">Marca a quién quieres en esta mesa.</span>
        <span className={`pill ${used > cap ? "bad" : used === cap ? "ok" : "acc"}`}>{used} / {cap} lugares</span>
      </div>
      <input className="search" id="assignSearch" type="search" placeholder="Buscar invitado…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar invitado" />
      {list.length ? (
        <div className="list pick-list">
          {list.map((g) => {
            const elsewhere = g.mesa && g.mesa !== table.id && names[g.mesa];
            return (
              <label key={g.id} className="item">
                <input
                  type="checkbox"
                  checked={picked.has(g.id)}
                  onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(g.id); else n.delete(g.id); return n; })}
                />
                <div className="main">
                  <span className="t">{g.nombre}{g.acomp > 0 && <span className="s"> +{g.acomp}</span>}</span>
                  {elsewhere && <span className="s">Ahora en {names[g.mesa]}{picked.has(g.id) ? ": se cambia aquí" : ""}</span>}
                </div>
                <span className="s">{seats(g)} {seats(g) === 1 ? "lugar" : "lugares"}</span>
              </label>
            );
          })}
        </div>
      ) : <p className="note">{guests.length ? "Nadie coincide con la búsqueda." : "Primero agrega invitados en la sección Invitados."}</p>}
    </Sheet>
  );
}

export function BulkTablesSheet({ tables, onSave, onClose }: {
  tables: Table[]; onSave: (rows: Omit<Table, "id">[]) => void; onClose: () => void;
}) {
  const nextNum = tables.reduce((m, t) => Math.max(m, parseInt(t.nombre.replace(/\D+/g, "")) || 0), 0) + 1;
  const [count, setCount] = useState("10");
  const [cap, setCap] = useState("10");
  const [start, setStart] = useState(String(nextNum));
  const [error, setError] = useState("");

  function save() {
    const n = Math.round(num(count)), c = Math.round(num(cap)), s = Math.round(num(start));
    if (n < 1 || n > 100) return setError("Escribe cuántas mesas, entre 1 y 100.");
    if (c < 1) return setError("Cada mesa necesita al menos 1 lugar.");
    onSave(Array.from({ length: n }, (_, i) => ({ nombre: `Mesa ${s + i}`, capacidad: c, notas: "", creado: Date.now() + i })));
  }

  const n = Math.round(num(count)) || 0, s = Math.round(num(start)) || 1;
  return (
    <Sheet title="Crear varias mesas" error={error} onSave={save} onClose={onClose}>
      <div className="two">
        <Field label="Cuántas mesas" id="f_count"><input id="f_count" type="number" min={1} max={100} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
        <Field label="Lugares por mesa" id="f_cap"><input id="f_cap" type="number" min={1} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} /></Field>
      </div>
      <Field label="Empezar a numerar en" id="f_start"><input id="f_start" type="number" min={1} inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      {n > 0 && <p className="note">Se crearán de <b>Mesa {s}</b> a <b>Mesa {s + n - 1}</b>, con {n * (Math.round(num(cap)) || 0)} lugares en total. Luego puedes renombrar cualquiera (por ejemplo, &quot;Principal&quot;).</p>}
    </Sheet>
  );
}
