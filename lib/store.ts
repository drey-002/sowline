// The only module that touches localStorage. Swap the four functions at the
// bottom for API calls and no screen has to change (PRD §2).
import type { AppState } from "./types";

const ROOT_KEY = "sowline.v1";
const SCHEMA_VERSION = 1;

export function emptyState(): AppState {
  return {
    version: SCHEMA_VERSION,
    plan: null,
    log: [],
    prefs: { showWhy: false, sortBy: "yield" },
  };
}

/** SSR and private-mode fallback: a module-level object that behaves like storage. */
let memory: AppState = emptyState();

function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__sowline_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Safari private mode throws on setItem rather than returning null.
    return false;
  }
}

/**
 * Schema migrations, keyed by the version they upgrade FROM. To add one: bump
 * SCHEMA_VERSION, then register a function that takes the old shape and
 * returns the next. They run in order, so a plan saved under any past version
 * walks forward to the current one.
 *
 *   const MIGRATIONS = {
 *     1: (s) => ({ ...s, version: 2, plan: s.plan && { ...s.plan, beds: [] } }),
 *   };
 */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {};

/** Why the last load could not use the stored data, for the UI to surface. */
export type LoadIssue =
  | { kind: "unreadable"; backupKey: string | null }
  | { kind: "from-future"; storedVersion: number; backupKey: string | null }
  | { kind: "no-migration-path"; storedVersion: number; backupKey: string | null };

let lastLoadIssue: LoadIssue | null = null;

export function getLoadIssue(): LoadIssue | null {
  return lastLoadIssue;
}

/**
 * Never discard a gardener's season without keeping a copy — there is no
 * server backup, so a dropped blob is gone for good.
 */
function backup(raw: string): string | null {
  if (!canUseStorage()) return null;
  const key = `${ROOT_KEY}.backup.${Date.now()}`;
  try {
    window.localStorage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

/** Shape-check a parsed blob so a hand-edited key cannot crash a render. */
function reconcile(raw: Record<string, unknown>): AppState {
  const base = emptyState();
  const candidate = raw as Partial<AppState>;
  return {
    version: SCHEMA_VERSION,
    plan: candidate.plan ?? null,
    log: Array.isArray(candidate.log) ? candidate.log : [],
    prefs: { ...base.prefs, ...(candidate.prefs ?? {}) },
  };
}

/** Walk a stored blob forward to the current schema version. */
export function migrate(parsed: Record<string, unknown>, rawText: string): AppState | null {
  const stored = typeof parsed.version === "number" ? parsed.version : 0;

  if (stored > SCHEMA_VERSION) {
    // An older build opened newer data. Keep the newer copy rather than
    // overwriting it with whatever this build saves next.
    lastLoadIssue = { kind: "from-future", storedVersion: stored, backupKey: backup(rawText) };
    return null;
  }

  let working = parsed;
  let version = stored;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      lastLoadIssue = { kind: "no-migration-path", storedVersion: stored, backupKey: backup(rawText) };
      return null;
    }
    working = step(working);
    version = typeof working.version === "number" ? working.version : version + 1;
  }
  return reconcile(working);
}

export function loadState(): AppState {
  lastLoadIssue = null;
  if (!canUseStorage()) return memory;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(ROOT_KEY);
  } catch {
    return emptyState();
  }
  if (!raw) return emptyState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    lastLoadIssue = { kind: "unreadable", backupKey: backup(raw) };
    return emptyState();
  }

  if (!parsed || typeof parsed !== "object") {
    lastLoadIssue = { kind: "unreadable", backupKey: backup(raw) };
    return emptyState();
  }

  return migrate(parsed as Record<string, unknown>, raw) ?? emptyState();
}

export function saveState(state: AppState): void {
  memory = state;
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(ROOT_KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode — the in-memory copy above keeps the session working.
  }
}

export function clearState(): void {
  memory = emptyState();
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(ROOT_KEY);
  } catch {
    // Nothing useful to do; the session continues from memory.
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
