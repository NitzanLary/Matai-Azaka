'use client';

import { useState } from 'react';

interface NicknameModalProps {
  onRegistered: (nickname: string) => void;
}

export default function NicknameModal({ onRegistered }: NicknameModalProps) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
      return;
    }

    setRecoveryCode(data.recoveryCode);
    setDone(true);
    onRegistered(data.user.nickname);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm border border-slate-600 shadow-2xl">
        {!done ? (
          <>
            <h2 className="text-xl font-bold mb-1">ברוכ/ה הבא/ה!</h2>
            <p className="text-slate-400 text-sm mb-5">
              בחר/י כינוי כדי להתחיל לנחש
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="כינוי (3-20 תווים)"
                maxLength={20}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-100
                           placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
                dir="auto"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || nickname.trim().length < 3}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {loading ? 'רושם...' : 'בואו נתחיל!'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">מוכן/ה!</h2>
            <p className="text-slate-300 text-sm mb-4">
              קוד השחזור שלך (שמור/י אותו!):
            </p>
            <div className="bg-[#0f172a] rounded-lg p-4 text-center mb-4">
              <span className="text-3xl font-mono font-bold text-amber-400 tracking-widest">
                {recoveryCode}
              </span>
            </div>
            <p className="text-slate-500 text-xs mb-5">
              אם תאבד/י את העוגייה, תוכל/י לשחזר את החשבון בעזרת הכינוי וקוד זה.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              בואו נרוץ!
            </button>
          </>
        )}
      </div>
    </div>
  );
}
