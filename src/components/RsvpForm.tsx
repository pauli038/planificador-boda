"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/catalog";
import type { Invitation } from "@/lib/rsvp";

export default function RsvpForm({ code, initial }: { code: string; initial: Invitation }) {
  const { boda, lugares, nombre } = initial;
  // Solo cuenta como respondido si lo hizo el invitado; lo que marcaron los novios queda preseleccionado
  const answered = initial.respondio && (initial.rsvp === "si" || initial.rsvp === "no");
  const [rsvp, setRsvp] = useState<"si" | "no" | "">(initial.rsvp === "si" || initial.rsvp === "no" ? initial.rsvp : "");
  const [asistentes, setAsistentes] = useState(initial.asistentes || lugares);
  const [mensaje, setMensaje] = useState(initial.mensaje);
  const [done, setDone] = useState(answered);
  const [editing, setEditing] = useState(!answered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvp) return setError("Elige si podrás acompañarnos.");
    setBusy(true);
    setError("");
    const res = await fetch(`/api/rsvp/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvp, asistentes, mensaje }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      return setError(body?.error || "No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
    setDone(true);
    setEditing(false);
  }

  const fecha = boda.fecha ? fmtDate(boda.fecha, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <section className="invite">
      <p className="invite-kicker">Nos casamos</p>
      <h1>{boda.nombres || "Nuestra boda"}</h1>
      {(fecha || boda.lugar) && (
        <div className="invite-when">
          {fecha && <span>{fecha}{boda.hora ? ` · ${boda.hora}` : ""}</span>}
          {boda.lugar && <span>{boda.lugar}</span>}
        </div>
      )}
      <hr className="invite-rule" />
      <p className="invite-hello">Hola, <b>{nombre}</b></p>
      <p className="invite-text">
        {lugares > 1 ? `Reservamos ${lugares} lugares para ustedes.` : "Reservamos un lugar para ti."} Nos encantaría que nos acompañen.
      </p>

      {done && !editing ? (
        <div className="invite-done" role="status">
          <strong>{rsvp === "si" ? "¡Gracias por confirmar!" : "Gracias por avisarnos"}</strong>
          <span>
            {rsvp === "si"
              ? `Te esperamos${asistentes > 1 ? `: ${asistentes} personas` : ""}.`
              : "Te vamos a extrañar."}
          </span>
          <button className="btn ghost" onClick={() => setEditing(true)}>Cambiar mi respuesta</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="choice">
            <button type="button" className={rsvp === "si" ? "on" : ""} aria-pressed={rsvp === "si"} onClick={() => setRsvp("si")}>Sí, ahí estaré</button>
            <button type="button" className={rsvp === "no" ? "on" : ""} aria-pressed={rsvp === "no"} onClick={() => setRsvp("no")}>No podré ir</button>
          </div>
          {rsvp === "si" && lugares > 1 && (
            <div className="field">
              <label htmlFor="asistentes">¿Cuántas personas van, contándote?</label>
              <select id="asistentes" value={asistentes} onChange={(e) => setAsistentes(Number(e.target.value))}>
                {Array.from({ length: lugares }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="mensaje">Mensaje para los novios (opcional)</label>
            <textarea id="mensaje" value={mensaje} maxLength={1000} onChange={(e) => setMensaje(e.target.value)} placeholder="Alergias, restricciones de comida o unas palabras bonitas" />
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy || !rsvp}>{busy ? "Enviando…" : "Enviar respuesta"}</button>
        </form>
      )}
    </section>
  );
}
