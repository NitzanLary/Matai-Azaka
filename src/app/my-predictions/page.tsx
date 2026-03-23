'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalPreds: number;
  correctPreds: number;
  incorrectPreds: number;
  accuracy: number;
  allTimePoints: number;
  favoriteCity: string | null;
}

interface UserProfile {
  id: number;
  nickname: string;
  created_at: string;
}

export default function MyPredictionsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editNickname, setEditNickname] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setProfile(d.user);
          setStats(d.stats);
          setEditNickname(d.user.nickname);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveNickname() {
    setSaveError(null);
    setSaveLoading(true);
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: editNickname }),
    });
    const data = await res.json();
    setSaveLoading(false);
    if (res.ok) {
      setProfile(p => p ? { ...p, nickname: data.nickname } : p);
      setEditing(false);
    } else {
      setSaveError(data.error);
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400 py-12">טוען...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">אין חשבון מחובר.</p>
        <a href="/" className="text-blue-400 hover:underline mt-2 inline-block">
          חזור לדף הבית
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">הניחושים שלי</h1>

      {/* Profile card */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          {editing ? (
            <div className="flex gap-2 flex-1">
              <input
                value={editNickname}
                onChange={e => setEditNickname(e.target.value)}
                maxLength={20}
                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-1 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                dir="auto"
              />
              <button
                onClick={saveNickname}
                disabled={saveLoading}
                className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-lg text-white disabled:opacity-50"
              >
                שמור
              </button>
              <button
                onClick={() => { setEditing(false); setEditNickname(profile.nickname); }}
                className="text-sm text-slate-400 hover:text-white px-2"
              >
                ביטול
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold">{profile.nickname}</h2>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                ✏️ ערוך
              </button>
            </>
          )}
        </div>
        {saveError && <p className="text-red-400 text-sm mb-2">{saveError}</p>}
        <p className="text-slate-500 text-xs">
          נרשמת: {new Date(profile.created_at).toLocaleDateString('he-IL')}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="סה״כ ניחושים" value={String(stats.totalPreds)} />
          <StatCard label="ניחושים נכונים" value={String(stats.correctPreds)} color="text-green-400" />
          <StatCard label="דיוק" value={`${stats.accuracy}%`} color="text-blue-400" />
          <StatCard label="נקודות סה״כ" value={String(stats.allTimePoints)} color="text-amber-400" />
          <StatCard label="עיר מועדפת" value={stats.favoriteCity ?? '—'} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-slate-100' }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
