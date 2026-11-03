"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { Alert, Loading, PageHeader, Spinner } from "@/components/ui";
import { FitToWidth, COPY_WIDTH, VoucherCopy } from "@/components/voucher";
import { api, errorMessage } from "@/lib/client";
import { currentMonth, dueDate, money, ordinal, todayYmd } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [{ year, month }] = useState(currentMonth);
  const [today] = useState(todayYmd);

  useEffect(() => {
    api<Settings>("/api/settings").then(setSettings, (e) => setError(errorMessage(e)));
  }, []);

  if (error && !settings) return <Alert kind="error">{error}</Alert>;
  if (!settings) return <Loading />;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSettings(await api<Settings>("/api/settings", { method: "PUT", json: settings }));
      toast("success", "Settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="What is printed on every fee challan." />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <form onSubmit={save} className="card space-y-5 self-start p-5 sm:p-6">
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <label className="label" htmlFor="s-fee">Fee on the challan (Rs)</label>
            <input id="s-fee" className="input" type="number" min={1} required value={settings.challanFee} onChange={(e) => set("challanFee", Number(e.target.value))} />
            <p className="mt-1 text-xs text-emerald-900/50">Printed on every student&apos;s challan, even if their own fee is different. Now {money(settings.challanFee)}.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-due">Last day to pay (day of month)</label>
              <input id="s-due" className="input" type="number" min={1} max={31} required value={settings.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))} />
              <p className="mt-1 text-xs text-emerald-900/50">Default last date on challans, e.g. {ordinal(settings.dueDay || 1)} of each month. You can still change it per challan.</p>
            </div>
            <div>
              <label className="label" htmlFor="s-noclass">No classes without fee after the</label>
              <input id="s-noclass" className="input" type="number" min={1} max={31} required value={settings.noClassAfterDay} onChange={(e) => set("noClassAfterDay", Number(e.target.value))} />
              <p className="mt-1 text-xs text-emerald-900/50">Shown as “after the {ordinal(settings.noClassAfterDay || 1)}”.</p>
            </div>
            <div>
              <label className="label" htmlFor="s-fine">Late payment fine (Rs)</label>
              <input id="s-fine" className="input" type="number" min={0} required value={settings.lateFine} onChange={(e) => set("lateFine", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="s-phone">WhatsApp number for screenshots</label>
              <input id="s-phone" className="input" required value={settings.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end border-t border-emerald-900/10 pt-4">
            <button className="btn-primary" disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save settings
            </button>
          </div>
        </form>

        <div className="card self-start bg-slate-100 p-4 lg:w-[320px]">
          <div className="mb-2 text-xs font-semibold tracking-wide text-emerald-900/60 uppercase">Live preview</div>
          <FitToWidth width={COPY_WIDTH}>
            <VoucherCopy
              settings={settings}
              data={{ name: "Student Name", rollNo: "12", className: "10", year, month, issueDate: today, dueDate: dueDate(year, month, settings.dueDay || 1) }}
            />
          </FitToWidth>
        </div>
      </div>
    </div>
  );
}
