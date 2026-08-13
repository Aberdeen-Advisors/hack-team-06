/**
 * Conductor — single JSON document store.
 *
 * The whole database is one in-memory object held on a `globalThis` key so that Next.js hot
 * reload (which re-evaluates modules) does not reset it. Reads are synchronous from memory;
 * every mutation goes through `mutate()`, which appends audit events and schedules a debounced
 * write to disk.
 *
 * PERSISTENCE LIMITATION — read this before demoing on a serverless host.
 * The store writes to `process.env.DATA_DIR ?? '.data'`, falling back to `/tmp/atlas-data`, and
 * finally to memory only. On a serverless platform the filesystem is ephemeral and per-instance:
 * an edit survives within the instance that handled it, but a cold start (or a request routed to
 * a different instance) reloads the seed and loses the edit. There is no shared database. This
 * is acceptable for a demo — the flows are all completable inside one warm instance — and it is
 * stated in the README. Do not build anything on the assumption that a write is durable.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { buildSeed } from './seed';
import type { AuditEvent, Database } from './types';

export type StorageMode = 'file' | 'memory';

interface StoreState {
  db: Database;
  storageMode: StorageMode;
  filePath: string | null;
  writeTimer: NodeJS.Timeout | null;
  lastWriteAt: string | null;
  auditSeq: number;
}

const GLOBAL_KEY = '__conductor_store__';

const DEBOUNCE_MS = 250;
const FILE_NAME = 'conductor-db.json';

function candidateDirs(): string[] {
  const primary = process.env.DATA_DIR ?? '.data';
  return [path.resolve(process.cwd(), primary), '/tmp/atlas-data'];
}

/** Detected once per process and recorded, so we never probe the filesystem on a read path. */
function resolveStorage(): { storageMode: StorageMode; filePath: string | null } {
  for (const dir of candidateDirs()) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return { storageMode: 'file', filePath: path.join(dir, FILE_NAME) };
    } catch {
      // Try the next candidate.
    }
  }
  return { storageMode: 'memory', filePath: null };
}

/**
 * The seed shape is fingerprinted into the persisted file. If the seed changes during
 * development, a stale file is discarded rather than merged, which keeps the demo predictable.
 */
function seedFingerprint(db: Database): string {
  const shape = {
    keys: Object.keys(db).sort(),
    counts: Object.fromEntries(
      Object.entries(db).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1]),
    ),
    users: db.users.map((u) => u.email).sort(),
  };
  return createHash('sha256').update(JSON.stringify(shape)).digest('hex').slice(0, 16);
}

interface PersistedFile {
  fingerprint: string;
  savedAt: string;
  db: Database;
}

function loadFromDisk(filePath: string, fingerprint: string): Database | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedFile;
    if (!parsed || parsed.fingerprint !== fingerprint || !parsed.db) return null;
    return parsed.db;
  } catch {
    return null;
  }
}

function init(): StoreState {
  const seed = buildSeed();
  const { storageMode, filePath } = resolveStorage();
  const fingerprint = seedFingerprint(seed);
  const fromDisk = filePath ? loadFromDisk(filePath, fingerprint) : null;
  const state: StoreState = {
    db: fromDisk ?? seed,
    storageMode,
    filePath,
    writeTimer: null,
    lastWriteAt: null,
    auditSeq: 0,
  };
  if (!fromDisk) scheduleWrite(state);
  return state;
}

function globalState(): StoreState {
  const g = globalThis as unknown as Record<string, StoreState | undefined>;
  let state = g[GLOBAL_KEY];
  if (!state) {
    state = init();
    g[GLOBAL_KEY] = state;
  }
  return state;
}

function writeNow(state: StoreState): void {
  if (state.storageMode !== 'file' || !state.filePath) return;
  try {
    const payload: PersistedFile = {
      fingerprint: seedFingerprint(state.db),
      savedAt: new Date().toISOString(),
      db: state.db,
    };
    const tmp = `${state.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, state.filePath);
    state.lastWriteAt = payload.savedAt;
  } catch {
    // A write failure must never break a request. Drop to memory-only and carry on.
    state.storageMode = 'memory';
    state.filePath = null;
  }
}

function scheduleWrite(state: StoreState): void {
  if (state.storageMode !== 'file') return;
  if (state.writeTimer) clearTimeout(state.writeTimer);
  state.writeTimer = setTimeout(() => {
    state.writeTimer = null;
    writeNow(state);
  }, DEBOUNCE_MS);
  // Do not hold the process open for a pending debounce.
  state.writeTimer.unref?.();
}

/** Synchronous read straight from memory. Callers must not mutate the returned object. */
export function getDb(): Database {
  return globalState().db;
}

export function storageMode(): StorageMode {
  return globalState().storageMode;
}

export function storageLocation(): string {
  const state = globalState();
  return state.filePath ?? 'memory only (no writable directory found)';
}

export interface AuditInput {
  engagementId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
}

export interface MutationContext {
  db: Database;
  /** Append an audit event. Every mutation should record at least one. */
  audit: (input: AuditInput) => AuditEvent;
  /** Monotonic id helper for new entities. */
  id: (prefix: string) => string;
}

/**
 * Apply a mutation. The callback receives the live database plus an audit helper; whatever it
 * returns is passed back to the caller. A debounced write is scheduled on completion.
 */
export function mutate<T>(fn: (ctx: MutationContext) => T): T {
  const state = globalState();
  const created: AuditEvent[] = [];
  const ctx: MutationContext = {
    db: state.db,
    audit: (input) => {
      state.auditSeq += 1;
      const event: AuditEvent = {
        id: `audit_${Date.now().toString(36)}_${state.auditSeq.toString(36)}`,
        ...input,
        at: new Date().toISOString(),
      };
      state.db.auditEvents.push(event);
      created.push(event);
      return event;
    },
    id: (prefix) => {
      state.auditSeq += 1;
      return `${prefix}_${Date.now().toString(36)}${state.auditSeq.toString(36)}`;
    },
  };
  const result = fn(ctx);
  scheduleWrite(state);
  return result;
}

/** Drop everything and rebuild from the seed, so the demo can be re-run. */
export function resetToSeed(): Database {
  const state = globalState();
  state.db = buildSeed();
  state.auditSeq = 0;
  writeNow(state);
  return state.db;
}

export function auditTrail(engagementId: string, limit = 50): AuditEvent[] {
  return getDb()
    .auditEvents.filter((e) => e.engagementId === engagementId)
    .slice()
    .reverse()
    .slice(0, limit);
}
