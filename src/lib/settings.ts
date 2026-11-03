import "server-only";
import { getDb } from "./db";
import { DEFAULT_SETTINGS, type Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  const sql = await getDb();
  const rows = await sql<{ key: string; value: string }[]>`select key, value from settings`;
  const stored = Object.fromEntries(
    rows.filter((r) => r.key in DEFAULT_SETTINGS).map((r) => [r.key, safeParse(r.value)]),
  ) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const sql = await getDb();
  const entries = Object.entries(patch).filter(([k]) => k in DEFAULT_SETTINGS);
  for (const [key, value] of entries) {
    await sql`
      insert into settings (key, value) values (${key}, ${JSON.stringify(value)})
      on conflict (key) do update set value = excluded.value`;
  }
  return getSettings();
}

function safeParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
