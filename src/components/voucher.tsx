"use client";

import QRCode from "qrcode";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { PAYMENT_QR, QR_TITLE } from "@/lib/challan";
import { formatDate, MONTHS, ordinal } from "@/lib/format";
import type { Settings } from "@/lib/types";

export type VoucherData = {
  name: string;
  rollNo: string | null;
  className: string;
  year: number;
  month: number;
  issueDate: string;
  dueDate: string;
};

/** Natural size of one copy and of the sheet with two copies (CSS px; fits A4 with 10 mm margins). */
export const COPY_WIDTH = 340;
const GAP = 28;
export const SHEET_WIDTH = COPY_WIDTH * 2 + GAP;

const classText = (c: string) => (c === "other" ? "Other" : ordinal(Number(c)));

function QrSvg({ text, size }: { text: string; size: number }) {
  const { path, count } = useMemo(() => {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    return { path: d, count: n };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${count} ${count}`} width={size} height={size} shapeRendering="crispEdges" aria-label="Payment QR code">
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

function Line({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 items-end gap-2 ${className}`}>
      <span className="shrink-0 text-[13px] text-neutral-700">{label}</span>
      <span className="min-w-0 flex-1 truncate border-b border-black/70 px-1 pb-0.5 text-center text-[15px] leading-tight font-bold text-black">
        {value || "\u00a0"}
      </span>
    </div>
  );
}

/** One copy of the Monthly Fee Voucher, drawn like the academy's printed template. */
export const VoucherCopy = forwardRef<HTMLDivElement, { data: VoucherData; settings: Settings }>(function VoucherCopy({ data, settings }, ref) {
  return (
    <div ref={ref} className="voucher flex flex-col border border-black bg-white px-5 pt-5 pb-4" style={{ width: COPY_WIDTH }}>
      <div className="text-center">
        <div className="text-[22px] leading-tight font-bold">AL-ISMAT Academy</div>
        <div className="text-[11.5px]">Since 2006</div>
        <div className="mx-auto mt-2.5 w-fit border border-black px-5 py-1 text-[20px]">Monthly Fee Voucher</div>
      </div>

      <div className="mt-4 flex justify-end">
        <Line label="Date:" value={formatDate(data.issueDate)} className="w-[170px]" />
      </div>
      <Line label="Name:" value={data.name} className="mt-4" />
      <div className="mt-4 flex gap-4">
        <Line label="Class" value={classText(data.className)} className="flex-1" />
        <Line label="Roll #" value={data.rollNo} className="flex-1" />
      </div>
      <div className="mt-4 flex gap-4">
        <Line label="Month" value={MONTHS[data.month - 1]} className="flex-[1.25]" />
        <Line label="Year" value={data.year} className="flex-1" />
      </div>

      <div className="mt-5 flex items-center justify-between border-2 border-black px-3 py-2.5">
        <span className="text-[16px]">Monthly Tuition Fee&nbsp;&nbsp;=</span>
        <span className="text-[22px] font-bold">{settings.challanFee}/-</span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 text-[14px]">
        <span>Last day of Fee payment =</span>
        <span className="text-[15px] font-bold">{formatDate(data.dueDate)}</span>
      </div>

      <div className="mt-3 space-y-0.5 border border-black px-2.5 py-1.5 text-[10.5px] leading-snug">
        <div>
          - Fee must be paid <b>online only</b> <span className="text-[9px]">(details are below)</span>
        </div>
        <div>
          - A fine of <b>Rs. {settings.lateFine}/-</b> will be charged for late fee payment
        </div>
        <div>
          - Without fee, students <u>cannot</u> attend classes <b>after the {ordinal(settings.noClassAfterDay)}</b>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center">
        <div className="text-[11px] font-bold">{QR_TITLE}</div>
        <div className="mt-0.5 bg-black p-[5px]">
          <div className="bg-white p-[5px]">
            <QrSvg text={PAYMENT_QR} size={100} />
          </div>
        </div>
        <div className="mt-2 text-[15px] font-bold">Payment ONLY at above QR code</div>
        <div className="mt-1 bg-black px-3 py-1 text-[8.5px] font-bold text-white">
          Share payment screenshot &amp; student name at {settings.contactNumber}
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center">
        <div className="w-[130px] border-t border-black" />
        <div className="mt-1 text-[12px]">AL-ISMAT Academy</div>
      </div>
    </div>
  );
});

/** Two identical copies side by side (one for the student, one for the academy). */
export const VoucherSheet = forwardRef<HTMLDivElement, { data: VoucherData; settings: Settings }>(function VoucherSheet({ data, settings }, ref) {
  return (
    <div className="voucher-sheet flex bg-white" style={{ width: SHEET_WIDTH, gap: 0 }}>
      <VoucherCopy ref={ref} data={data} settings={settings} />
      <div className="flex justify-center" style={{ width: GAP }}>
        <div className="h-full border-l border-dashed border-black/40" />
      </div>
      <VoucherCopy data={data} settings={settings} />
    </div>
  );
});

/** Shrinks its child to fit the available width on screen (printing uses the natural size). */
export function FitToWidth({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(1, el.clientWidth / width);
      setScale(s);
      setHeight((inner.current?.offsetHeight ?? 0) * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outer} className="w-full">
      <div className="voucher-scaler" style={{ height, overflow: "visible" }}>
        <div ref={inner} className="voucher-scaler" style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
