"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Alert, PageHeader, Spinner } from "@/components/ui";
import { useUser } from "@/components/user-context";
import { api, errorMessage } from "@/lib/client";

const MIN = 6;

export default function AccountPage() {
  const toast = useToast();
  const { user } = useUser();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next.length < MIN) return setError(`New password must be at least ${MIN} characters.`);
    if (form.next !== form.confirm) return setError("The new passwords do not match.");
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "PUT", json: { currentPassword: form.current, newPassword: form.next } });
      setForm({ current: "", next: "", confirm: "" });
      toast("success", "Password changed");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Change password"
        description={user ? `Signed in as ${user.username}` : undefined}
      />
      <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label" htmlFor="cur">Current password</label>
          <input id="cur" type="password" className="input" required autoComplete="current-password" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="new">New password</label>
          <input id="new" type="password" className="input" required autoComplete="new-password" value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} />
          <p className="mt-1 text-xs text-emerald-900/50">At least {MIN} characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type="password" className="input" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} Change password
        </button>
        <p className="text-center text-xs text-emerald-900/50">Your other signed-in devices will be signed out.</p>
      </form>
    </div>
  );
}
