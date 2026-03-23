import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_preds,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_preds,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_preds
    FROM predictions
    WHERE user_id = ? AND is_correct IS NOT NULL
  `).get(user.id) as { total_preds: number; correct_preds: number; incorrect_preds: number };

  const allTimePoints = db.prepare(`
    SELECT points FROM leaderboard_cache
    WHERE user_id = ? AND period = 'alltime'
  `).get(user.id) as { points: number } | undefined;

  const favCity = db.prepare(`
    SELECT s.city, COUNT(*) as cnt
    FROM predictions p
    JOIN prediction_slots s ON p.slot_id = s.id
    WHERE p.user_id = ?
    GROUP BY s.city
    ORDER BY cnt DESC
    LIMIT 1
  `).get(user.id) as { city: string; cnt: number } | undefined;

  return NextResponse.json({
    user: { id: user.id, nickname: user.nickname, created_at: user.created_at },
    stats: {
      totalPreds: stats.total_preds,
      correctPreds: stats.correct_preds,
      incorrectPreds: stats.incorrect_preds,
      accuracy: stats.total_preds > 0
        ? Math.round((stats.correct_preds / stats.total_preds) * 100)
        : 0,
      allTimePoints: allTimePoints?.points ?? 0,
      favoriteCity: favCity?.city ?? null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { nickname } = body as { nickname?: string };

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 3) {
    return NextResponse.json({ error: 'Invalid nickname' }, { status: 400 });
  }

  const db = getDb();
  try {
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), user.id);
    return NextResponse.json({ ok: true, nickname: nickname.trim() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Nickname already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
