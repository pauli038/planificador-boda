"use client";

import { useEffect, useState } from "react";
import {
  BUDGET_CATS, HONEY_TYPES, RSVP, SERVICES, SIDES, STAGES, VSTATE, num, seats, tableSort,
  type Col, type Config, type Expense, type Guest, type Row, type RowInput, type HoneyItem, type Rsvp, type ScheduleItem, type Table, type Task, type Vendor, type VendorState,
} from "@/lib/catalog";

type Draft = Record<string, string | number | boolean>;

export function Sheet({ title, children, error, onSave, onDelete, onClose }: {
  title: string; children: React.ReactNode; error: string;
  onSave: () => void; onDelete?: () => void; onClose: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label={title} noValidate onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <div className="grip" />
        <h2>{title}</h2>
        <div className="form">{children}</div>
        {error && <p className="note" style={{ color: "var(--bad)" }}>{error}</p>}
        <div className="actions">
          {onDelete && (
            <button type="button" className={`btn danger ${armed ? "armed" : ""}`} onClick={() => (armed ? onDelete() : setArmed(true))}>
              {armed ? "¿Seguro? Eliminar" : "Eliminar"}
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn">Guardar</button>
        </div>
      </form>
    </div>
  );
}

export function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function useDraft(initial: Draft) {
  const [d, setD] = useState<Draft>(initial);
  const bind = (k: string) => ({
    id: `f_${k}`,
    name: k,
    value: String(d[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD((p) => ({ ...p, [k]: e.target.value })),
  });
  return { d, setD, bind };
}

const s = (v: unknown) => String(v ?? "").trim();

export function ItemForm({ col, item, tables = [], guests = [], onSave, onDelete, onClose }: {
  col: Col; item?: Row; tables?: Table[]; guests?: Guest[];
  onSave: (data: RowInput) => void; onDelete?: () => void; onClose: () => void;
}) {
  const it = (item ?? {}) as Draft;
  const { d, setD, bind } = useDraft({ ...it, num_acomp: (it.acomp as number) ?? 0 });
  const [error, setError] = useState("");
  const edit = !!item;

  function save() {
    let data: RowInput;
    let err = "";
    if (col === "guests") {
      const g: Omit<Guest, "id"> = { nombre: s(d.nombre), rsvp: (d.rsvp as Rsvp) || "pendiente", lado: s(d.lado) || "Ambos", acomp: Math.max(0, Math.round(num(d.num_acomp))), mesa: s(d.mesa), telefono: s(d.telefono), notas: s(d.notas) };
      if (!g.nombre) err = "Escribe el nombre del invitado.";
      data = g;
    } else if (col === "budget") {
      const b: Omit<Expense, "id"> = { concepto: s(d.concepto), categoria: s(d.categoria) || BUDGET_CATS[0], estimado: num(d.estimado), real: num(d.real), pagado: num(d.pagado), notas: s(d.notas) };
      if (!b.concepto) err = "Escribe el concepto del gasto.";
      data = b;
    } else if (col === "tasks") {
      const t: Omit<Task, "id"> = { titulo: s(d.titulo), etapa: s(d.etapa) || STAGES[0], fecha: s(d.fecha), responsable: s(d.responsable), hecho: !!d.hecho, notas: s(d.notas) };
      if (!t.titulo) err = "Escribe la tarea.";
      data = t;
    } else if (col === "schedule") {
      const e: Omit<ScheduleItem, "id"> = { hora: s(d.hora), titulo: s(d.titulo), lugar: s(d.lugar), responsable: s(d.responsable), notas: s(d.notas) };
      if (!e.titulo) err = "Escribe qué pasa a esa hora.";
      else if (!e.hora) err = "Pon la hora.";
      data = e;
    } else if (col === "honeymoon") {
      const h: Omit<HoneyItem, "id"> = { tipo: s(d.tipo) || HONEY_TYPES[0], titulo: s(d.titulo), fecha: s(d.fecha), costo: num(d.costo), reservado: !!d.reservado, confirmacion: s(d.confirmacion), notas: s(d.notas) };
      if (!h.titulo) err = "Escribe qué es (vuelo, hotel, actividad…).";
      data = h;
    } else if (col === "tables") {
      const t: Omit<Table, "id"> = { nombre: s(d.nombre), capacidad: Math.max(1, Math.round(num(d.capacidad)) || 10), notas: s(d.notas) };
      if (!t.nombre) err = "Escribe el nombre de la mesa.";
      data = t;
    } else {
      const v: Omit<Vendor, "id"> = { nombre: s(d.nombre), servicio: s(d.servicio) || SERVICES[0], estado: (d.estado as VendorState) || "cotizando", contacto: s(d.contacto), telefono: s(d.telefono), email: s(d.email), costo: num(d.costo), notas: s(d.notas) };
      if (!v.nombre) err = "Escribe el nombre del proveedor.";
      data = v;
    }
    if (err) return setError(err);
    onSave({ ...data, creado: (item?.creado as number) || Date.now() });
  }

  const titles: Record<Col, [string, string]> = {
    guests: ["Nuevo invitado", "Editar invitado"], budget: ["Nuevo gasto", "Editar gasto"],
    tasks: ["Nueva tarea", "Editar tarea"], vendors: ["Nuevo proveedor", "Editar proveedor"],
    tables: ["Nueva mesa", "Editar mesa"], schedule: ["Nuevo momento", "Editar momento"],
    honeymoon: ["Nuevo pendiente del viaje", "Editar pendiente del viaje"],
  };

  return (
    <Sheet title={titles[col][edit ? 1 : 0]} error={error} onSave={save} onDelete={onDelete} onClose={onClose}>
      {col === "guests" && (
        <>
          <Field label="Nombre (o familia)" id="f_nombre"><input {...bind("nombre")} autoComplete="off" /></Field>
          <div className="field">
            <label>Confirmación</label>
            <div className="seg">
              {(Object.keys(RSVP) as Rsvp[]).map((k) => (
                <button type="button" key={k} className={(d.rsvp || "pendiente") === k ? "on" : ""} onClick={() => setD((p) => ({ ...p, rsvp: k }))}>{RSVP[k][0]}</button>
              ))}
            </div>
          </div>
          <div className="two">
            <Field label="Invitado de" id="f_lado"><select {...bind("lado")} value={String(d.lado || "Ambos")}>{SIDES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Acompañantes" id="f_num_acomp"><input {...bind("num_acomp")} type="number" min={0} inputMode="numeric" /></Field>
          </div>
          <div className="two">
            <Field label="Mesa" id="f_mesa">
              <select {...bind("mesa")}>
                <option value="">Sin mesa</option>
                {[...tables].sort(tableSort).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                {d.mesa && !tables.some((t) => t.id === d.mesa) && <option value={String(d.mesa)}>{String(d.mesa)}</option>}
              </select>
            </Field>
            <Field label="Teléfono" id="f_telefono"><input {...bind("telefono")} type="tel" /></Field>
          </div>
          <Field label="Notas (alergias, niños, etc.)" id="f_notas"><textarea {...bind("notas")} /></Field>
        </>
      )}
      {col === "budget" && (
        <>
          <Field label="Concepto" id="f_concepto"><input {...bind("concepto")} autoComplete="off" placeholder="Ej. Anticipo del salón" /></Field>
          <Field label="Categoría" id="f_categoria"><select {...bind("categoria")} value={String(d.categoria || BUDGET_CATS[0])}>{BUDGET_CATS.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <div className="two">
            <Field label="Estimado (₡)" id="f_estimado"><input {...bind("estimado")} value={d.estimado ? String(d.estimado) : ""} inputMode="decimal" /></Field>
            <Field label="Costo real (₡)" id="f_real"><input {...bind("real")} value={d.real ? String(d.real) : ""} inputMode="decimal" /></Field>
          </div>
          <Field label="Pagado hasta hoy (₡)" id="f_pagado"><input {...bind("pagado")} value={d.pagado ? String(d.pagado) : ""} inputMode="decimal" /></Field>
          <Field label="Notas" id="f_notas"><textarea {...bind("notas")} /></Field>
        </>
      )}
      {col === "tasks" && (
        <>
          <Field label="Tarea" id="f_titulo"><input {...bind("titulo")} autoComplete="off" /></Field>
          <Field label="Etapa" id="f_etapa"><select {...bind("etapa")} value={String(d.etapa || STAGES[0])}>{STAGES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <div className="two">
            <Field label="Fecha límite" id="f_fecha"><input {...bind("fecha")} type="date" /></Field>
            <Field label="Responsable" id="f_responsable"><input {...bind("responsable")} /></Field>
          </div>
          <label className="toggle"><input type="checkbox" id="f_hecho" checked={!!d.hecho} onChange={(e) => setD((p) => ({ ...p, hecho: e.target.checked }))} /> Ya está hecha</label>
          <Field label="Notas" id="f_notas"><textarea {...bind("notas")} /></Field>
        </>
      )}
      {col === "schedule" && (
        <>
          <div className="two">
            <Field label="Hora" id="f_hora"><input {...bind("hora")} type="time" /></Field>
            <Field label="Lugar" id="f_lugar"><input {...bind("lugar")} placeholder="Ej. Jardín" /></Field>
          </div>
          <Field label="¿Qué pasa?" id="f_titulo"><input {...bind("titulo")} autoComplete="off" placeholder="Ej. Primer baile" /></Field>
          <Field label="Responsable" id="f_responsable"><input {...bind("responsable")} placeholder="Ej. DJ, coordinadora, padrino" /></Field>
          <Field label="Notas (canción, quién habla, qué llevar…)" id="f_notas"><textarea {...bind("notas")} /></Field>
        </>
      )}
      {col === "honeymoon" && (
        <>
          <div className="two">
            <Field label="Tipo" id="f_tipo"><select {...bind("tipo")} value={String(d.tipo || HONEY_TYPES[0])}>{HONEY_TYPES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Fecha" id="f_fecha"><input {...bind("fecha")} type="date" /></Field>
          </div>
          <Field label="¿Qué es?" id="f_titulo"><input {...bind("titulo")} autoComplete="off" placeholder="Ej. Vuelo San José – Cancún" /></Field>
          <div className="two">
            <Field label="Costo (₡)" id="f_costo"><input {...bind("costo")} value={d.costo ? String(d.costo) : ""} inputMode="decimal" /></Field>
            <Field label="Confirmación / folio" id="f_confirmacion"><input {...bind("confirmacion")} autoComplete="off" /></Field>
          </div>
          <label className="toggle"><input type="checkbox" id="f_reservado" checked={!!d.reservado} onChange={(e) => setD((p) => ({ ...p, reservado: e.target.checked }))} /> Ya está reservado o listo</label>
          <Field label="Notas" id="f_notas"><textarea {...bind("notas")} /></Field>
        </>
      )}
      {col === "tables" && (
        <>
          <div className="two">
            <Field label="Nombre" id="f_nombre"><input {...bind("nombre")} autoComplete="off" placeholder="Ej. Mesa 1, Principal" /></Field>
            <Field label="Lugares" id="f_capacidad"><input {...bind("capacidad")} value={d.capacidad === undefined ? "10" : String(d.capacidad)} type="number" min={1} inputMode="numeric" /></Field>
          </div>
          <Field label="Notas (ubicación, quiénes van…)" id="f_notas"><textarea {...bind("notas")} /></Field>
          {edit && (
            <p className="note">
              {(() => {
                const at = guests.filter((g) => g.mesa === item!.id && g.rsvp !== "no");
                return at.length ? `${at.reduce((n, g) => n + seats(g), 0)} personas sentadas. Al eliminar la mesa quedan sin mesa.` : "Aún no hay nadie en esta mesa.";
              })()}
            </p>
          )}
        </>
      )}
      {col === "vendors" && (
        <>
          <Field label="Nombre o empresa" id="f_nombre"><input {...bind("nombre")} autoComplete="off" /></Field>
          <div className="two">
            <Field label="Servicio" id="f_servicio"><select {...bind("servicio")} value={String(d.servicio || SERVICES[0])}>{SERVICES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Estado" id="f_estado"><select {...bind("estado")} value={String(d.estado || "cotizando")}>{(Object.keys(VSTATE) as VendorState[]).map((k) => <option key={k} value={k}>{VSTATE[k][0]}</option>)}</select></Field>
          </div>
          <div className="two">
            <Field label="Persona de contacto" id="f_contacto"><input {...bind("contacto")} /></Field>
            <Field label="Teléfono" id="f_telefono"><input {...bind("telefono")} type="tel" /></Field>
          </div>
          <div className="two">
            <Field label="Correo" id="f_email"><input {...bind("email")} type="email" /></Field>
            <Field label="Cotización (₡)" id="f_costo"><input {...bind("costo")} value={d.costo ? String(d.costo) : ""} inputMode="decimal" /></Field>
          </div>
          <Field label="Notas (qué incluye, fechas de pago…)" id="f_notas"><textarea {...bind("notas")} /></Field>
          {(d.telefono || d.email) && (
            <p className="note">
              {d.telefono && <a href={`tel:${d.telefono}`}>Llamar</a>}
              {d.telefono && d.email && " · "}
              {d.email && <a href={`mailto:${d.email}`}>Enviar correo</a>}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

export function SettingsForm({ config, onSave, onClose }: { config: Config; onSave: (c: Config) => void; onClose: () => void }) {
  const { d, bind } = useDraft({ ...config } as Draft);
  return (
    <Sheet
      title="Datos de la boda"
      error=""
      onClose={onClose}
      onSave={() => onSave({ ...config, nombres: s(d.nombres), fecha: s(d.fecha), hora: s(d.hora), lugar: s(d.lugar), presupuesto: num(d.presupuesto) })}
    >
      <Field label="Nombres de la pareja" id="f_nombres"><input {...bind("nombres")} placeholder="Ej. Ana & Luis" autoComplete="off" /></Field>
      <div className="two">
        <Field label="Fecha" id="f_fecha"><input {...bind("fecha")} type="date" /></Field>
        <Field label="Hora" id="f_hora"><input {...bind("hora")} type="time" /></Field>
      </div>
      <Field label="Lugar" id="f_lugar"><input {...bind("lugar")} placeholder="Salón, ciudad" /></Field>
      <Field label="Presupuesto total (₡)" id="f_presupuesto"><input {...bind("presupuesto")} value={d.presupuesto ? String(d.presupuesto) : ""} inputMode="decimal" /></Field>
      <p className="note">Los cambios se guardan en la nube y tu pareja los ve en su teléfono en unos segundos.</p>
    </Sheet>
  );
}

export function TripForm({ config, onSave, onClose }: { config: Config; onSave: (c: Config) => void; onClose: () => void }) {
  const { d, bind } = useDraft({ ...config } as Draft);
  const [error, setError] = useState("");
  return (
    <Sheet
      title="Datos del viaje"
      error={error}
      onClose={onClose}
      onSave={() => {
        if (d.lunaSalida && d.lunaRegreso && String(d.lunaRegreso) < String(d.lunaSalida)) return setError("El regreso no puede ser antes de la salida.");
        onSave({ ...config, lunaDestino: s(d.lunaDestino), lunaSalida: s(d.lunaSalida), lunaRegreso: s(d.lunaRegreso), lunaPresupuesto: num(d.lunaPresupuesto) });
      }}
    >
      <Field label="Destino" id="f_lunaDestino"><input {...bind("lunaDestino")} placeholder="Ej. Playa Conchal, Guanacaste" autoComplete="off" /></Field>
      <div className="two">
        <Field label="Salida" id="f_lunaSalida"><input {...bind("lunaSalida")} type="date" /></Field>
        <Field label="Regreso" id="f_lunaRegreso"><input {...bind("lunaRegreso")} type="date" /></Field>
      </div>
      <Field label="Presupuesto del viaje (₡)" id="f_lunaPresupuesto"><input {...bind("lunaPresupuesto")} value={d.lunaPresupuesto ? String(d.lunaPresupuesto) : ""} inputMode="decimal" /></Field>
    </Sheet>
  );
}
