"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import {
  HONEY_TYPES, daysUntil, fmtDate, money, num, scheduleSort, todayISO,
  type Config, type HoneyItem, type ScheduleItem,
} from "@/lib/catalog";

const fmtHora = (h: string) => {
  if (!h) return "";
  const [H, M] = h.split(":").map(Number);
  return new Date(2000, 0, 1, H, M).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
};

/** Hora actual "HH:MM", refrescada cada minuto (solo se usa el día de la boda). */
function useClock(active: boolean) {
  const now = () => new Date().toTimeString().slice(0, 5);
  const [t, setT] = useState(now);
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setT(now()), 60000);
    return () => clearInterval(iv);
  }, [active]);
  return t;
}

export function ScheduleView({ items, config, onEdit, onAdd, onSeed }: {
  items: ScheduleItem[]; config: Config; onEdit: (id: string) => void; onAdd: () => void; onSeed: () => void;
}) {
  const isToday = !!config.fecha && config.fecha === todayISO();
  const clock = useClock(isToday);
  const list = [...items].sort(scheduleSort);
  // El día de la boda: marca lo que está pasando y lo que sigue
  let currentId = "";
  if (isToday) for (const it of list) if (it.hora && it.hora <= clock && it.hora >= "06:00") currentId = it.id;
  const nextId = isToday ? list[list.findIndex((x) => x.id === currentId) + 1]?.id ?? (currentId ? "" : list[0]?.id) : "";

  return (
    <>
      <div className="spread">
        <h2>Programa del día</h2>
        {config.fecha && <span className="pill acc">{fmtDate(config.fecha, { weekday: "short", day: "numeric", month: "short" })}</span>}
      </div>
      <p className="note" style={{ margin: 0 }}>
        El minuto a minuto de la boda, para ustedes, la coordinadora y los proveedores.
        {isToday && " Hoy se marca lo que está pasando y lo que sigue."}
      </p>
      {list.length === 0 ? (
        <div className="empty">
          <strong>Aún no hay programa</strong>
          <span>Carguen un programa típico (de la preparación a la salida de los novios) y ajusten las horas a su boda.</span>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={onSeed}>Cargar programa típico</button>
            <button className="btn ghost" onClick={onAdd}>Agregar un momento</button>
          </div>
        </div>
      ) : (
        <ol className="timeline">
          {list.map((it) => (
            <li key={it.id} className={it.id === currentId ? "now" : it.id === nextId ? "next" : ""}>
              <span className="tl-time">{fmtHora(it.hora)}</span>
              <span className="tl-dot" aria-hidden="true" />
              <button className="tl-body" onClick={() => onEdit(it.id)}>
                <span className="t">
                  {it.titulo}
                  {it.id === currentId && <span className="pill ok">Ahora</span>}
                  {it.id === nextId && <span className="pill warn">Sigue</span>}
                </span>
                {(it.lugar || it.responsable) && <span className="s">{[it.lugar, it.responsable].filter(Boolean).join(" · ")}</span>}
                {it.notas && <span className="s notes">{it.notas}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function HoneymoonView({ items, config, onEdit, onAdd, onSeed, onToggle, onTrip }: {
  items: HoneyItem[]; config: Config; onEdit: (id: string) => void; onAdd: () => void; onSeed: () => void;
  onToggle: (it: HoneyItem) => void; onTrip: () => void;
}) {
  const spent = items.reduce((n, x) => n + num(x.costo), 0);
  const goal = num(config.lunaPresupuesto);
  const ready = items.filter((x) => x.reservado).length;
  const d = daysUntil(config.lunaSalida);
  const nights = config.lunaSalida && config.lunaRegreso ? (daysUntil(config.lunaRegreso) ?? 0) - (d ?? 0) : null;
  const groups: Record<string, HoneyItem[]> = {};
  items.forEach((x) => (groups[x.tipo || "Otro"] ||= []).push(x));
  const order = [...HONEY_TYPES, ...Object.keys(groups).filter((k) => !HONEY_TYPES.includes(k))].filter((k) => groups[k]);

  return (
    <>
      <h2>Luna de miel</h2>
      <button className={`trip ${config.lunaDestino ? "" : "trip-empty"}`} onClick={onTrip}>
        <span className="trip-kicker">{config.lunaDestino ? "Destino" : "Toca para agregar el viaje"}</span>
        <span className="trip-dest">{config.lunaDestino || "¿A dónde se van?"}</span>
        <span className="trip-meta">
          {config.lunaSalida ? `${fmtDate(config.lunaSalida, { day: "numeric", month: "short" })}${config.lunaRegreso ? ` – ${fmtDate(config.lunaRegreso, { day: "numeric", month: "short", year: "numeric" })}` : ""}` : "Agrega fechas de salida y regreso"}
          {nights !== null && nights > 0 && ` · ${nights} ${nights === 1 ? "noche" : "noches"}`}
        </span>
        {d !== null && d > 0 && <span className="trip-count"><b>{d}</b> {d === 1 ? "día para despegar" : "días para despegar"}</span>}
      </button>

      <div className="stats">
        <div className="stat"><small>Costo del viaje</small><b>{money(spent)}</b>{goal > 0 && <div className={`bar ${spent > goal ? "over" : ""}`}><i style={{ width: `${Math.min(100, Math.round((spent / goal) * 100))}%` }} /></div>}</div>
        <div className="stat"><small>{goal > 0 ? (spent > goal ? "Te pasas por" : "Disponible") : "Presupuesto"}</small><b>{goal > 0 ? money(Math.abs(goal - spent)) : "—"}</b>{!goal && <small>Ponlo en datos del viaje</small>}</div>
        <div className="stat"><small>Listo</small><b>{ready} / {items.length}</b><div className="bar"><i style={{ width: `${items.length ? Math.round((ready / items.length) * 100) : 0}%` }} /></div></div>
        <div className="stat"><small>Por reservar</small><b style={{ color: items.length - ready ? "var(--warn)" : undefined }}>{items.length - ready}</b></div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <strong>Organicen su viaje</strong>
          <span>Vuelos, hotel, documentos y la maleta en un solo lugar. Carguen una lista sugerida o agreguen lo suyo.</span>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={onSeed}>Cargar lista sugerida</button>
            <button className="btn ghost" onClick={onAdd}>Agregar algo</button>
          </div>
        </div>
      ) : (
        <div className="list">
          {order.map((k) => (
            <div key={k} style={{ display: "contents" }}>
              <div className="group-h"><h3>{k}</h3><span className="group-sum">{groups[k].filter((x) => x.reservado).length}/{groups[k].length}</span></div>
              {[...groups[k]].sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999")).map((x) => (
                <div key={x.id} className={`item ${x.reservado ? "done" : ""}`}>
                  <button className={`check ${x.reservado ? "on" : ""}`} onClick={() => onToggle(x)} aria-label={`${x.reservado ? "Marcar pendiente" : "Marcar listo"}: ${x.titulo}`}>
                    {x.reservado && <Icon name="check" />}
                  </button>
                  <button className="main" style={{ border: 0, background: "none", textAlign: "left", padding: 0 }} onClick={() => onEdit(x.id)}>
                    <span className="t">{x.titulo}</span>
                    {(x.fecha || x.confirmacion) && <span className="s">{[x.fecha ? fmtDate(x.fecha) : "", x.confirmacion ? `Folio ${x.confirmacion}` : ""].filter(Boolean).join(" · ")}</span>}
                  </button>
                  {num(x.costo) > 0 && <span className="amt">{money(x.costo)}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
