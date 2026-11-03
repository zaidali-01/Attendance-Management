"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { classLabel, type Student } from "@/lib/types";

/** A searchable dropdown of students (by name or roll #). */
export function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: Student[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const selected = students.find((s) => s.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.roll_no ?? "").toLowerCase().includes(q) || classLabel(s.class_name).toLowerCase().includes(q));
  }, [students, query]);

  return (
    <div className="relative" ref={box}>
      <button type="button" className="input flex items-center justify-between gap-2 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`truncate ${selected ? "" : "text-emerald-900/40"}`}>
          {selected ? `${selected.name} · ${classLabel(selected.class_name)}${selected.roll_no ? ` · Roll ${selected.roll_no}` : ""}` : "Choose a student"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-emerald-900/40" />
      </button>
      {open && (
        <div className="absolute inset-x-0 z-30 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-emerald-900/10">
          <div className="relative border-b border-emerald-900/10">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-900/40" />
            <input
              autoFocus
              className="w-full py-2.5 pr-3 pl-9 text-sm outline-none"
              placeholder="Search name, roll # or class"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) {
                  e.preventDefault();
                  onChange(shown[0].id);
                  setOpen(false);
                }
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-4 py-3 text-sm text-emerald-900/50">No students found</li>}
            {shown.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-emerald-50 ${s.id === value ? "bg-emerald-50/60" : ""}`}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-emerald-950">{s.name}</span>
                    <span className="text-xs text-emerald-900/55">
                      {classLabel(s.class_name)}
                      {s.roll_no ? ` · Roll ${s.roll_no}` : ""}
                    </span>
                  </span>
                  {s.id === value && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
