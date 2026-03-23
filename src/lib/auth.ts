import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'matai_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface User {
  id: number;
  nickname: string;
  created_at: string;
  last_seen_at: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRecoveryCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function validateNickname(nickname: string): string | null {
  if (!nickname || typeof nickname !== 'string') return 'Nickname is required';
  const trimmed = nickname.trim();
  if (trimmed.length < 3) return 'Nickname must be at least 3 characters';
  if (trimmed.length > 20) return 'Nickname must be at most 20 characters';
  // Allow alphanumeric, Hebrew letters, and underscores
  if (!/^[\w\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4E]+$/.test(trimmed)) {
    return 'Nickname can only contain letters, numbers, Hebrew characters, and underscores';
  }
  return null;
}

export function createUser(nickname: string): { user: User; token: string; recoveryCode: string } {
  const db = getDb();
  const token = uuidv4();
  const tokenHash = hashToken(token);
  const recoveryCode = generateRecoveryCode();

  const result = db.prepare(`
    INSERT INTO users (nickname, token_hash, recovery_code)
    VALUES (?, ?, ?)
  `).run(nickname.trim(), tokenHash, recoveryCode);

  const user = db.prepare('SELECT id, nickname, created_at, last_seen_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as User;

  return { user, token, recoveryCode };
}

export function getUserByToken(token: string): User | null {
  const db = getDb();
  const tokenHash = hashToken(token);
  const user = db.prepare(`
    SELECT id, nickname, created_at, last_seen_at FROM users
    WHERE token_hash = ?
  `).get(tokenHash) as User | undefined;

  if (user) {
    db.prepare('UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  }

  return user ?? null;
}

export async function getSession(req?: NextRequest): Promise<User | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  }

  if (!token) return null;
  return getUserByToken(token);
}

export function makeSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
