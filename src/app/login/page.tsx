"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Alert, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/client";

/** The page to open after signing in: only paths on this site (never "//x" or "/\\x", which browsers treat as another site). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const url = new URL(next, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Sign in failed");
      // Full reload so every component picks up the new session. Only same-site paths are followed.
      window.location.assign(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-emerald-700 p-1">
            <Logo className="h-12 w-12" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-emerald-950">Al-Ismat Academy</h1>
          <p className="text-sm text-emerald-900/60">Students, fees and challans. Sign in to continue.</p>
        </div>
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <label className="label" htmlFor="username">Username</label>
        <input
          id="username"
          className="input"
          autoFocus
          required
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="label mt-4" htmlFor="pw">Password</label>
        <input id="pw" type="password" className="input" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} Sign in
        </button>
      </form>
    </div>
  );
}
