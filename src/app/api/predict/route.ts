import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { slotId } = body as { slotId?: number };

  if (!slotId || typeof slotId !== 'number') {
    return NextResponse.json({ error: 'slotId is required' }, { status: 400 });
  }

  const db = getDb();

  const slot = db.prepare(`
    SELECT id, city, date, hour_start, alarm_option, status
    FROM prediction_slots WHERE id = ?
  `).get(slotId) as {
    id: number; city: string; date: string; hour_start: number;
    alarm_option: number; status: string;
  } | undefined;

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
  }

  if (slot.status !== 'open') {
    return NextResponse.json({ error: 'Slot is no longer accepting predictions' }, { status: 409 });
  }

  // Atomically: delete existing pick for this (user, city, date, hour) group, then insert new pick
  const placePick = db.transaction(() => {
    // Find existing pick for this hour group
    const existing = db.prepare(`
      SELECT p.id, p.slot_id FROM predictions p
      JOIN prediction_slots s ON p.slot_id = s.id
      WHERE p.user_id = ? AND s.city = ? AND s.date = ? AND s.hour_start = ?
    `).get(user.id, slot.city, slot.date, slot.hour_start) as
      { id: number; slot_id: number } | undefined;

    if (existing) {
      if (existing.slot_id === slotId) {
        // Same pick — no-op, just return current
        return { changed: false };
      }
      db.prepare('DELETE FROM predictions WHERE id = ?').run(existing.id);
    }

    db.prepare(`
      INSERT INTO predictions (user_id, slot_id)
      VALUES (?, ?)
    `).run(user.id, slotId);

    return { changed: true };
  });

  const result = placePick();
  return NextResponse.json({ ok: true, ...result });
}
