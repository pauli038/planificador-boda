"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/";
      return;
    }
    const body = await res?.json().catch(() => null);
    setError(body?.error || "No se pudo conectar. Revisa tu internet e intenta de nuevo.");
    setBusy(false);
  }

  return (
    <main className="wrap login">
      <form onSubmit={submit}>
        <h1>Nuestra Boda</h1>
        <p>Escribe la contraseña que comparten tú y tu pareja.</p>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !password}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
