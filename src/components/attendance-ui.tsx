"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { eachDay, monthEndOf, monthStartOf, MONTHS, weekday } from "@/lib/format";
import { DAY_STATUSES, STATUS_LABEL, type DayStatus } from "@/lib/types";

export const STATUS_STYLE: Record<DayStatus, { solid: string; soft: string; dot: string; text: string; cell: string; letter: string }> = {
  present: {
    solid: "bg-emerald-600 text-white ring-emerald-600",
    soft: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    cell: "bg-emerald-600 hover:bg-emerald-700",
    letter: "P",
  },
  late: {
    solid: "bg-amber-500 text-white ring-amber-500",
    soft: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
    text: "text-amber-600",
    cell: "bg-amber-500 hover:bg-amber-600",
    letter: "L",
  },
  absent: {
    solid: "bg-red-600 text-white ring-red-600",
    soft: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
    text: "text-red-600",
    cell: "bg-red-600 hover:bg-red-700",
    letter: "A",
  },
  holiday: {
    solid: "bg-sky-600 text-white ring-sky-600",
    soft: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    text: "text-sky-600",
    cell: "bg-sky-600 hover:bg-sky-700",
    letter: "H",
  },
};

export function StatusBadge({ status }: { status: DayStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status].soft}`}>{STATUS_LABEL[status]}</span>
  );
}

/** Present / Late / Absent / Holiday. Clicking the chosen one again clears it. */
export function StatusButtons({
  value,
  onChange,
  compact,
  disabled,
}: {
  value: DayStatus | null;
  onChange: (s: DayStatus | null) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex gap-1" role="radiogroup">
      {DAY_STATUSES.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            title={STATUS_LABEL[s]}
            disabled={disabled}
            onClick={() => onChange(on ? null : s)}
            className={`rounded-lg text-xs font-semibold ring-1 transition-colors ring-inset disabled:opacity-50 ${compact ? "h-8 w-8" : "h-8 px-2.5 sm:px-3"} ${
              on ? STATUS_STYLE[s].solid : "bg-white text-emerald-900/55 ring-emerald-900/15 hover:bg-emerald-50"
            }`}
          >
            {compact ? STATUS_STYLE[s].letter : (
              <>
                <span className="sm:hidden">{STATUS_STYLE[s].letter}</span>
                <span className="hidden sm:inline">{STATUS_LABEL[s]}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-emerald-900/65">
      {DAY_STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[s].dot}`} /> {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

const HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A day's marks for a whole class: coloured counts and a bar split by status (grey = not marked yet). */
export function ClassDaySummary({ counts, size }: { counts: Record<DayStatus, number>; size: number }) {
  const marked = DAY_STATUSES.reduce((a, s) => a + counts[s], 0);
  if (!marked) return null;
  return (
    <span className="mt-auto flex w-full flex-col gap-1">
      <span className="flex flex-wrap justify-center gap-x-1 text-[10px] leading-none font-bold sm:text-[11px]">
        {DAY_STATUSES.map((s) =>
          counts[s] ? (
            <span key={s} className={STATUS_STYLE[s].text}>
              {counts[s]}
              <span className="hidden sm:inline">{STATUS_STYLE[s].letter}</span>
            </span>
          ) : null,
        )}
      </span>
      <span className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
        {DAY_STATUSES.map((s) => (counts[s] ? <span key={s} className={STATUS_STYLE[s].dot} style={{ width: `${(counts[s] / Math.max(size, marked)) * 100}%` }} /> : null))}
      </span>
    </span>
  );
}

/**
 * A Monday-first month calendar. `status` fills a day solid in that status colour;
 * `renderDay` adds content under the date. Clicking a day selects it.
 */
export function MonthCalendar({
  year,
  month,
  selected,
  today,
  onSelect,
  onMonthChange,
  renderDay,
  status,
}: {
  year: number;
  month: number;
  selected: string | null;
  today: string;
  onSelect: (day: string) => void;
  onMonthChange: (year: number, month: number) => void;
  renderDay?: (day: string) => React.ReactNode;
  status?: (day: string) => DayStatus | null | undefined;
}) {
  const days = eachDay(monthStartOf(year, month), monthEndOf(year, month));
  const lead = (weekday(days[0]) + 6) % 7;
  const shift = (d: number) => {
    const i = year * 12 + (month - 1) + d;
    onMonthChange(Math.floor(i / 12), (i % 12) + 1);
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-50" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold text-emerald-950">
          {MONTHS[month - 1]} {year}
        </div>
        <button type="button" className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-50" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wide text-emerald-900/45 uppercase">
        {HEAD.map((h) => (
          <div key={h} className={h === "Sun" ? "text-red-400" : ""}>
            {h}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`x${i}`} />
        ))}
        {days.map((d) => {
          const isSel = d === selected;
          const isToday = d === today;
          const sunday = weekday(d) === 0;
          const st = status?.(d) ?? null;
          const cell = st
            ? `${STATUS_STYLE[st].cell} border-transparent`
            : `${sunday ? "bg-slate-50" : "bg-white"} border-emerald-900/10 hover:border-emerald-400`;
          const num = st
            ? isToday
              ? "bg-white text-emerald-950"
              : "text-white"
            : isToday
              ? "bg-emerald-700 text-white"
              : sunday
                ? "text-red-500"
                : "text-emerald-950";
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={`${d}${st ? ` ${STATUS_LABEL[st]}` : ""}`}
              title={st ? STATUS_LABEL[st] : undefined}
              className={`flex min-h-14 flex-col items-center rounded-xl border p-1 text-sm transition sm:min-h-[4.5rem] sm:p-1.5 ${cell} ${
                isSel ? "ring-2 ring-emerald-900 ring-offset-2" : ""
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${num}`}>{Number(d.slice(8))}</span>
              {st && (
                <span className="mt-auto text-[10px] leading-none font-bold text-white">
                  <span className="sm:hidden">{STATUS_STYLE[st].letter}</span>
                  <span className="hidden sm:inline">{STATUS_LABEL[st]}</span>
                </span>
              )}
              {!st && renderDay?.(d)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
