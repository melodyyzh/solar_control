"use client";

import { useState } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/";
    } else {
      setError("That token didn't open the airlock.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ borderColor: "var(--edge)", background: "var(--surface-raised)" }}
      >
        <div className="mb-1 text-2xl">☀</div>
        <h1 className="text-lg font-semibold">My Solar System</h1>
        <p className="mb-6 mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          Enter your access token to dock.
        </p>
        <input
          type="password"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="DASH_TOKEN"
          className="field mb-3"
        />
        {error && (
          <p className="mb-3 text-sm" style={{ color: "var(--status-nothing-works)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || token.length === 0}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {busy ? "Docking…" : "Enter orbit"}
        </button>
      </form>
    </main>
  );
}
