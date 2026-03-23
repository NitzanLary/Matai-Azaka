import { NextRequest, NextResponse } from 'next/server';
import { createUser, validateNickname, makeSessionCookie, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { nickname } = body as { nickname?: string };

  const error = validateNickname(nickname ?? '');
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const { user, token, recoveryCode } = createUser(nickname!);
    const res = NextResponse.json({
      user: { id: user.id, nickname: user.nickname },
      recoveryCode,
    });
    res.headers.set('Set-Cookie', makeSessionCookie(token));
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint failed: users.nickname')) {
      return NextResponse.json({ error: 'Nickname already taken' }, { status: 409 });
    }
    console.error('[register]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
