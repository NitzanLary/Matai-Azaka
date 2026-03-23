import { getDb } from './db';
import { CITY_SLUGS } from './cityMap';

export interface PredictionSlot {
  id: number;
  city: string;
  date: string;
  hour_start: number;
  alarm_option: number;
  actual_count: number | null;
  status: 'open' | 'locked' | 'resolved';
  created_at: string;
}

export interface SlotWithUserPick extends PredictionSlot {
  user_pick: number | null; // alarm_option the user picked for this (city, date, hour) group
  participant_count: number;
}

/**
 * Generate 960 prediction slots for a given date (10 cities × 24 hours × 4 alarm options).
 * Safe to call multiple times — uses INSERT OR IGNORE.
 */
export function generateDailySlots(date: string): void {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO prediction_slots (city, date, hour_start, alarm_option)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    for (const city of CITY_SLUGS) {
      for (let hour = 0; hour < 24; hour++) {
        for (let option = 0; option <= 3; option++) {
          insert.run(city, date, hour, option);
        }
      }
    }
  });

  insertMany();
}

/**
 * Get today's date string in Israel time (UTC+2 standard, UTC+3 DST).
 * Using a fixed UTC+2 offset for simplicity; DST handling can be added later.
 */
export function getIsraelDateString(offset = 2): string {
  const now = new Date();
  const israelTime = new Date(now.getTime() + offset * 60 * 60 * 1000);
  return israelTime.toISOString().slice(0, 10);
}

export function getIsraelHour(offset = 2): number {
  const now = new Date();
  const israelTime = new Date(now.getTime() + offset * 60 * 60 * 1000);
  return israelTime.getUTCHours();
}

/**
 * Lock all open slots whose hour has started (hour_start <= current hour).
 */
export function lockDueSlots(): void {
  const db = getDb();
  const today = getIsraelDateString();
  const currentHour = getIsraelHour();

  db.prepare(`
    UPDATE prediction_slots
    SET status = 'locked'
    WHERE status = 'open'
      AND date = ?
      AND hour_start <= ?
  `).run(today, currentHour);
}

/**
 * Resolve all locked slots whose hour has fully passed.
 * Returns the count of resolved slot groups.
 */
export function resolveDueSlots(): number {
  const db = getDb();
  const today = getIsraelDateString();
  const currentHour = getIsraelHour();

  // Find distinct (city, date, hour_start) groups that are locked and past
  const groups = db.prepare(`
    SELECT DISTINCT city, date, hour_start
    FROM prediction_slots
    WHERE status = 'locked'
      AND date = ?
      AND hour_start < ?
  `).all(today, currentHour) as Array<{ city: string; date: string; hour_start: number }>;

  const resolveGroup = db.transaction((city: string, date: string, hourStart: number) => {
    // Count alarms for this city in this hour
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM alarm_log
      WHERE city_mapped = ?
        AND alert_time >= datetime(? || ' ' || printf('%02d', ?) || ':00:00')
        AND alert_time <  datetime(? || ' ' || printf('%02d', ?) || ':00:00')
    `).get(city, date, hourStart, date, hourStart + 1) as { count: number };

    const rawCount = row.count;
    const actual = Math.min(rawCount, 3); // cap at 3 for "3+"

    // Update all 4 option slots for this group
    db.prepare(`
      UPDATE prediction_slots
      SET actual_count = ?, status = 'resolved'
      WHERE city = ? AND date = ? AND hour_start = ?
    `).run(rawCount, city, date, hourStart);

    // Score predictions: correct if user picked the matching alarm_option
    db.prepare(`
      UPDATE predictions
      SET is_correct = CASE
        WHEN slot_id IN (
          SELECT id FROM prediction_slots
          WHERE city = ? AND date = ? AND hour_start = ? AND alarm_option = ?
        ) THEN 1
        ELSE 0
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE slot_id IN (
        SELECT id FROM prediction_slots
        WHERE city = ? AND date = ? AND hour_start = ?
      ) AND is_correct IS NULL
    `).run(city, date, hourStart, actual, city, date, hourStart);
  });

  for (const g of groups) {
    resolveGroup(g.city, g.date, g.hour_start);
  }

  if (groups.length > 0) {
    refreshLeaderboardCache(today);
  }

  return groups.length;
}

function refreshLeaderboardCache(date: string): void {
  const db = getDb();

  // Compute week string (ISO week: Sun–Sat)
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - day);
  const weekKey = `weekly:${weekStart.toISOString().slice(0, 10)}`;
  const dailyKey = `daily:${date}`;

  // Refresh daily cache
  const dailyStats = db.prepare(`
    SELECT p.user_id,
           SUM(p.is_correct) as points,
           COUNT(*) as total_preds,
           SUM(p.is_correct) as correct_preds
    FROM predictions p
    JOIN prediction_slots s ON p.slot_id = s.id
    WHERE s.date = ? AND p.is_correct IS NOT NULL
    GROUP BY p.user_id
  `).all(date) as Array<{ user_id: number; points: number; total_preds: number; correct_preds: number }>;

  const upsertCache = db.prepare(`
    INSERT INTO leaderboard_cache (user_id, period, points, total_preds, correct_preds, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, period) DO UPDATE SET
      points = excluded.points,
      total_preds = excluded.total_preds,
      correct_preds = excluded.correct_preds,
      updated_at = CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    for (const row of dailyStats) {
      upsertCache.run(row.user_id, dailyKey, row.points ?? 0, row.total_preds, row.correct_preds ?? 0);
      upsertCache.run(row.user_id, weekKey, row.points ?? 0, row.total_preds, row.correct_preds ?? 0);
    }
  })();

  // All-time: recompute from scratch for affected users
  const userIds = [...new Set(dailyStats.map(r => r.user_id))];
  if (userIds.length === 0) return;

  const placeholders = userIds.map(() => '?').join(',');
  const allTimeStats = db.prepare(`
    SELECT p.user_id,
           SUM(p.is_correct) as points,
           COUNT(*) as total_preds,
           SUM(p.is_correct) as correct_preds
    FROM predictions p
    WHERE p.user_id IN (${placeholders}) AND p.is_correct IS NOT NULL
    GROUP BY p.user_id
  `).all(...userIds) as Array<{ user_id: number; points: number; total_preds: number; correct_preds: number }>;

  db.transaction(() => {
    for (const row of allTimeStats) {
      upsertCache.run(row.user_id, 'alltime', row.points ?? 0, row.total_preds, row.correct_preds ?? 0);
    }
  })();
}

export { refreshLeaderboardCache };
