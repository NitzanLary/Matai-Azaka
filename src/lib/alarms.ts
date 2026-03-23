import { getDb, kvGet, kvSet } from './db';
import { mapCityToSlug } from './cityMap';

const TZEVA_ADOM_URL = 'https://api.tzevaadom.co.il/alerts-history';
const KV_LAST_SEEN = 'last_seen_alert_id';

interface TzevaAdomAlert {
  time: number;
  cities: string[];
  threat: number;
  isDrill: boolean;
}

interface TzevaAdomGroup {
  id: number;
  description: string | null;
  alerts: TzevaAdomAlert[];
}

/**
 * Poll the Tzeva Adom API and store new alarms.
 * Returns the count of new alarm log entries created.
 */
export async function pollAlarms(): Promise<number> {
  const db = getDb();
  let response: Response;

  try {
    response = await fetch(TZEVA_ADOM_URL, {
      headers: { 'User-Agent': 'matai-azaka/1.0 (community alarm tracking app)' },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[pollAlarms] Fetch error:', err);
    return 0;
  }

  if (!response.ok) {
    console.error('[pollAlarms] Non-OK response:', response.status);
    return 0;
  }

  let groups: TzevaAdomGroup[];
  try {
    groups = await response.json();
  } catch (err) {
    console.error('[pollAlarms] JSON parse error:', err);
    return 0;
  }

  if (!Array.isArray(groups) || groups.length === 0) return 0;

  const lastSeenId = parseInt(kvGet(KV_LAST_SEEN) ?? '0', 10);
  const newGroups = groups.filter(g => g.id > lastSeenId);

  if (newGroups.length === 0) return 0;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO alarm_log (alert_group_id, raw_data, city_mapped, alert_time)
    VALUES (?, ?, ?, datetime(?, 'unixepoch'))
  `);

  let insertedCount = 0;

  const processGroups = db.transaction(() => {
    for (const group of newGroups) {
      for (const alert of group.alerts) {
        if (alert.isDrill) continue;
        if (alert.threat !== 0) continue; // only rockets/missiles

        for (const cityName of alert.cities) {
          const citySlug = mapCityToSlug(cityName);
          const raw = JSON.stringify({ groupId: group.id, ...alert, cityName });
          insert.run(group.id, raw, citySlug, alert.time);
          if (citySlug) insertedCount++;
        }
      }
    }
  });

  processGroups();

  const maxId = Math.max(...newGroups.map(g => g.id));
  if (maxId > lastSeenId) {
    kvSet(KV_LAST_SEEN, String(maxId));
  }

  return insertedCount;
}

export interface AlarmLogEntry {
  id: number;
  city_mapped: string | null;
  alert_time: string;
}

/**
 * Get the latest N alarms for the live ticker.
 */
export function getLatestAlarms(limit = 10): AlarmLogEntry[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, city_mapped, alert_time
    FROM alarm_log
    WHERE city_mapped IS NOT NULL
    ORDER BY alert_time DESC
    LIMIT ?
  `).all(limit) as AlarmLogEntry[];
}

/**
 * Get alarm history for a specific city over the last N hours.
 */
export function getAlarmsForCity(citySlug: string, hours = 48): AlarmLogEntry[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, city_mapped, alert_time
    FROM alarm_log
    WHERE city_mapped = ?
      AND alert_time >= datetime('now', '-' || ? || ' hours')
    ORDER BY alert_time DESC
  `).all(citySlug, hours) as AlarmLogEntry[];
}

/**
 * Delete alarm log entries older than N days.
 */
export function cleanupOldAlarms(days = 30): number {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM alarm_log
    WHERE created_at < datetime('now', '-' || ? || ' days')
  `).run(days);
  return result.changes;
}
