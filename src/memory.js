import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';

mkdirSync('data', { recursive: true });
export const db = new Database('data/agent.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  result TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  from_phone TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memories (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
`);

export function createTask(goal) {
  const now = Date.now();
  const info = db.prepare(
    "INSERT INTO tasks (goal, status, created_at, updated_at) VALUES (?, 'queued', ?, ?)"
  ).run(goal, now, now);
  return info.lastInsertRowid;
}

export function updateTask(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  db.prepare(`UPDATE tasks SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, Date.now(), id);
}

export function recordMessage({ taskId = null, role, content, from = null }) {
  db.prepare(
    "INSERT INTO messages (task_id, role, content, from_phone, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(taskId, role, content, from, Date.now());
}

export function remember(key, value) {
  db.prepare(
    "INSERT INTO memories (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).run(key, value, Date.now());
}

export function recall(key) {
  return db.prepare("SELECT value FROM memories WHERE key = ?").get(key)?.value;
}

export function recallAll() {
  return db.prepare("SELECT key, value FROM memories ORDER BY updated_at DESC").all();
}
