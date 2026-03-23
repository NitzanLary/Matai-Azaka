import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH ?? './matai-azaka.db';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname      TEXT NOT NULL UNIQUE,
      token_hash    TEXT NOT NULL UNIQUE,
      recovery_code TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prediction_slots (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      city          TEXT NOT NULL,
      date          TEXT NOT NULL,
      hour_start    INTEGER NOT NULL,
      alarm_option  INTEGER NOT NULL,
      actual_count  INTEGER,
      status        TEXT NOT NULL DEFAULT 'open',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(city, date, hour_start, alarm_option)
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id),
      slot_id         INTEGER NOT NULL REFERENCES prediction_slots(id),
      is_correct      INTEGER,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slot_id)
    );

    CREATE TABLE IF NOT EXISTS alarm_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_group_id INTEGER NOT NULL,
      raw_data      TEXT NOT NULL,
      city_mapped   TEXT,
      alert_time    DATETIME NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leaderboard_cache (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      period        TEXT NOT NULL,
      points        INTEGER NOT NULL DEFAULT 0,
      total_preds   INTEGER NOT NULL DEFAULT 0,
      correct_preds INTEGER NOT NULL DEFAULT 0,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, period)
    );

    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_slots_city_date ON prediction_slots(city, date, status);
    CREATE INDEX IF NOT EXISTS idx_slots_status ON prediction_slots(status, date, hour_start);
    CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id, is_correct);
    CREATE INDEX IF NOT EXISTS idx_alarm_log_time ON alarm_log(alert_time, city_mapped);
    CREATE INDEX IF NOT EXISTS idx_alarm_log_group ON alarm_log(alert_group_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard ON leaderboard_cache(period, points);
  `);
}

export function kvGet(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function kvSet(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run(key, value);
}
