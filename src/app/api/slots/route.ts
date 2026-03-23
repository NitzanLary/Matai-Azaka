import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getIsraelDateString } from '@/lib/slots';
import { CITY_SLUGS } from '@/lib/cityMap';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city');
  const date = searchParams.get('date') ?? getIsraelDateString();
  const status = searchParams.get('status');

  if (city && !CITY_SLUGS.includes(city as never)) {
    return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
  }

  const user = await getSession(req);
  const db = getDb();

  let query = `
    SELECT
      s.id, s.city, s.date, s.hour_start, s.alarm_option,
      s.actual_count, s.status,
      COUNT(DISTINCT p.user_id) as participant_count
    FROM prediction_slots s
    LEFT JOIN predictions p ON p.slot_id = s.id
    WHERE s.date = ?
  `;
  const params: (string | number)[] = [date];

  if (city) {
    query += ` AND s.city = ?`;
    params.push(city);
  }

  if (status) {
    query += ` AND s.status = ?`;
    params.push(status);
  }

  query += ` GROUP BY s.id ORDER BY s.hour_start, s.alarm_option`;

  const slots = db.prepare(query).all(...params);

  // If user is logged in, attach their picks
  if (user) {
    const picks = db.prepare(`
      SELECT s.city, s.date, s.hour_start, s.alarm_option
      FROM predictions p
      JOIN prediction_slots s ON p.slot_id = s.id
      WHERE p.user_id = ? AND s.date = ?
    `).all(user.id, date) as Array<{ city: string; date: string; hour_start: number; alarm_option: number }>;

    const pickMap = new Map<string, number>();
    for (const pick of picks) {
      pickMap.set(`${pick.city}:${pick.hour_start}`, pick.alarm_option);
    }

    const annotated = (slots as Record<string, unknown>[]).map(slot => ({
      ...slot,
      user_pick: pickMap.get(`${slot.city}:${slot.hour_start}`) ?? null,
    }));

    return NextResponse.json(annotated);
  }

  return NextResponse.json(slots);
}
