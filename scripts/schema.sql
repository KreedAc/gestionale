-- Schema del database. Esegui UNA volta nella console SQL di Turso
-- (Dashboard Turso -> database -> Edit Data / SQL).
-- Sicuro da rieseguire: usa IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS clienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  username TEXT,
  password_cifrata TEXT,
  scadenza TEXT,
  credito_mesi INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pagamenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona TEXT NOT NULL,
  importo REAL NOT NULL DEFAULT 0,
  scadenza TEXT,
  pagato INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
