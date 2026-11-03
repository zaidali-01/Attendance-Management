import { handle, HttpError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";

export const GET = handle(async () => {
  await requireUser();
  return Response.json(await getSettings());
});

export const PUT = handle(async (req: Request) => {
  await requireUser();
  const body = await readJson<Partial<Settings>>(req);
  const patch: Partial<Settings> = {};
  const int = (v: unknown, label: string, min: number, max: number) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}`);
    return n;
  };
  if (body.challanFee !== undefined) patch.challanFee = int(body.challanFee, "Challan fee", 1, 10_000_000);
  if (body.dueDay !== undefined) patch.dueDay = int(body.dueDay, "Last day to pay", 1, 31);
  if (body.lateFine !== undefined) patch.lateFine = int(body.lateFine, "Late fine", 0, 1_000_000);
  if (body.noClassAfterDay !== undefined) patch.noClassAfterDay = int(body.noClassAfterDay, "No classes after day", 1, 31);
  if (body.contactNumber !== undefined) {
    const c = String(body.contactNumber).trim();
    if (!c || c.length > 30) throw new HttpError(400, "Enter the contact number");
    patch.contactNumber = c;
  }
  return Response.json(await saveSettings(patch));
});
