"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Info, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { MONTHS } from "@/lib/format";
import { classLabel, classShort, METHOD_LABEL, type Payment } from "@/lib/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-emerald-900/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-emerald-900/60">
      <Spinner /> {label}
    </div>
  );
}

export function Alert({
  kind = "info",
  children,
}: {
  kind?: "info" | "warning" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
  }[kind];
  const Icon = kind === "info" ? Info : AlertTriangle;
  return (
    <div className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="text-emerald-300">{icon}</div>
      <h3 className="mt-3 font-semibold text-emerald-950">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-emerald-900/60">{children}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-900/10 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-emerald-950">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-900/60 hover:bg-emerald-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="text-sm text-emerald-950/80">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

const CLASS_STYLE: Record<string, string> = {
  "9": "bg-sky-50 text-sky-700 ring-sky-600/20",
  "10": "bg-violet-50 text-violet-700 ring-violet-600/20",
  "11": "bg-amber-50 text-amber-800 ring-amber-600/20",
  "12": "bg-rose-50 text-rose-700 ring-rose-600/20",
};

/** Class pill; `short` ("9th") for table columns already headed "Class". */
export function ClassBadge({ className: c, short }: { className: string; short?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${CLASS_STYLE[c] ?? "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>
      {short ? classShort(c) : classLabel(c)}
    </span>
  );
}

/** Paid (with method) / Unpaid / Overdue. */
export function FeeBadge({ payment, overdue }: { payment: Payment | null; overdue?: boolean }) {
  if (payment) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
        <CheckCircle2 className="h-3 w-3" /> Paid · {METHOD_LABEL[payment.method]}
      </span>
    );
  }
  return overdue ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-red-700 ring-1 ring-red-600/20 ring-inset">
      <AlertTriangle className="h-3 w-3" /> Overdue
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800 ring-1 ring-amber-600/20 ring-inset">
      <CircleDashed className="h-3 w-3" /> Unpaid
    </span>
  );
}

export function FormBadge({ submitted }: { submitted: boolean }) {
  return submitted ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
      <CheckCircle2 className="h-3 w-3" /> Submitted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-600 ring-1 ring-slate-500/20 ring-inset">
      <CircleDashed className="h-3 w-3" /> Pending
    </span>
  );
}

/** Pill buttons for picking one option. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-emerald-900/5 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-lg font-semibold whitespace-nowrap transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
            value === o.value ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-900/60 hover:text-emerald-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** ‹ November 2026 › with a dropdown for quick jumps. */
export function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const shift = (d: number) => {
    const i = year * 12 + (month - 1) + d;
    onChange(Math.floor(i / 12), (i % 12) + 1);
  };
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-900/15 bg-white p-1 shadow-xs">
      <button type="button" className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <select
        aria-label="Month"
        className="cursor-pointer bg-transparent px-1 py-1 text-sm font-semibold text-emerald-950 outline-none"
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        className="cursor-pointer bg-transparent px-1 py-1 text-sm font-semibold text-emerald-950 outline-none"
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
      >
        {Array.from({ length: 7 }, (_, i) => year - 3 + i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button type="button" className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "emerald",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "emerald" | "amber" | "sky" | "red" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    red: "bg-red-100 text-red-700",
    violet: "bg-violet-100 text-violet-700",
  }[tone];
  return (
    <div className="card flex items-start gap-3 p-3.5 sm:p-4">
      <div className={`hidden rounded-xl p-2.5 sm:block ${tones}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-wide text-emerald-900/55 uppercase sm:text-xs">{label}</div>
        <div className="mt-0.5 text-xl font-bold text-emerald-950 tabular-nums sm:text-2xl">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-emerald-900/55">{hint}</div>}
      </div>
    </div>
  );
}

/** On/off switch. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 ${disabled ? "opacity-60" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
      </button>
      <span className="text-sm text-emerald-950">{label}</span>
    </label>
  );
}
