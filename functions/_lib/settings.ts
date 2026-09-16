import type { D1Database } from "@cloudflare/workers-types";

const SETTINGS_KEY = "submissions_locked";

export const TOTP_SECRET_KEY = "admin_totp_secret";
export const TOTP_PENDING_KEY = "admin_totp_pending";

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string | null): Promise<void> {
  if (value === null) {
    await db.prepare("DELETE FROM settings WHERE key = ?").bind(key).run();
    return;
  }
  await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").bind(key, value).run();
}

export async function isSubmissionsLocked(db: D1Database): Promise<boolean> {
  const row = await(db.prepare("SELECT value FROM settings WHERE key = ?").bind(SETTINGS_KEY).first<{ value: string }>());
  return row?.value === "1";
}

export async function setSubmissionsLocked(db: D1Database, locked: boolean): Promise<void> {
  await db
    .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))")
    .bind(SETTINGS_KEY, locked ? "1" : "0")
    .run();
}
