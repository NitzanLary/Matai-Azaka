import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getIsraelDateString } from '@/lib/slots';

function getCurrentWeekKey(): string {
  const today = getIsraelDateString();
  const d = new Date(today + 'T12:00:00Z');
  const day = d.getUTCDay();
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - day);
  return `weekly:${weekStart.toISOString().slice(0, 10)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const periodParam = searchParams.get('period') ?? 'today';

  let period: string;
  if (periodParam === 'today') {
    period = `daily:${getIsraelDateString()}`;
  } else if (periodParam === 'week') {
    period = getCurrentWeekKey();
  } else if (periodParam === 'alltime') {
    period = 'alltime';
  } else {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const user = await getSession(req);
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      u.id, u.nickname,
      lc.points, lc.total_preds, lc.correct_preds,
      RANK() OVER (ORDER BY lc.points DESC, lc.correct_preds DESC) as rank
    FROM leaderboard_cache lc
    JOIN users u ON u.id = lc.user_id
    WHERE lc.period = ?
    ORDER BY rank
    LIMIT 50
  `).all(period);

  let currentUserRank: unknown = null;
  if (user) {
    currentUserRank = db.prepare(`
      SELECT
        u.id, u.nickname,
        lc.points, lc.total_preds, lc.correct_preds,
        RANK() OVER (ORDER BY lc.points DESC) as rank
      FROM leaderboard_cache lc
      JOIN users u ON u.id = lc.user_id
      WHERE lc.period = ? AND lc.user_id = ?
    `).get(period, user.id) ?? null;
  }

  return NextResponse.json({ rows, currentUserRank, period });
}
