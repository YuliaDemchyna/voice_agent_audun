// SQLite persistence: session snapshots plus an append-only event log (D4).
// Hard checks in the evals are queries over the `events` table.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Session } from "../domain/session.js";

export interface StoredEvent {
  seq: number;
  sessionId: string;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

export class Store {
  private db: DatabaseSync;

  constructor(path = process.env.DB_PATH ?? "data/app.sqlite") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        ts TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_session ON events(session_id, seq);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
  }

  saveSession(session: Session): void {
    this.db
      .prepare("INSERT INTO sessions (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
      .run(session.id, JSON.stringify(session), new Date().toISOString());
  }

  getSession(id: string): Session | undefined {
    const row = this.db.prepare("SELECT data FROM sessions WHERE id = ?").get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Session) : undefined;
  }

  appendEvents(sessionId: string, events: ReadonlyArray<{ type: string } & Record<string, unknown>>): void {
    const insert = this.db.prepare("INSERT INTO events (session_id, type, payload, ts) VALUES (?, ?, ?, ?)");
    for (const { type, ...payload } of events) insert.run(sessionId, type, JSON.stringify(payload), new Date().toISOString());
  }

  listEvents(sessionId: string, afterSeq = 0): StoredEvent[] {
    const rows = this.db
      .prepare("SELECT seq, session_id, type, payload, ts FROM events WHERE session_id = ? AND seq > ? ORDER BY seq")
      .all(sessionId, afterSeq) as Array<{ seq: number; session_id: string; type: string; payload: string; ts: string }>;
    return rows.map((r) => ({ seq: r.seq, sessionId: r.session_id, type: r.type, payload: JSON.parse(r.payload), ts: r.ts }));
  }

  /** Newest first, with start time from the first event. */
  listSessions(limit = 50): Array<{ session: Session; startedAt: string }> {
    const rows = this.db
      .prepare(
        `SELECT s.data AS data, MIN(e.ts) AS started_at FROM sessions s
         JOIN events e ON e.session_id = s.id
         GROUP BY s.id ORDER BY started_at DESC LIMIT ?`,
      )
      .all(limit) as Array<{ data: string; started_at: string }>;
    return rows.map((r) => ({ session: JSON.parse(r.data) as Session, startedAt: r.started_at }));
  }

  setActiveSession(id: string): void {
    this.db.prepare("INSERT INTO kv (key, value) VALUES ('active_session', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
  }

  getActiveSessionId(): string | undefined {
    const row = this.db.prepare("SELECT value FROM kv WHERE key = 'active_session'").get() as { value: string } | undefined;
    return row?.value;
  }
}
