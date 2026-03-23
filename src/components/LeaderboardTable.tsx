'use client';

import { useState, useEffect } from 'react';

interface LeaderboardRow {
  id: number;
  nickname: string;
  points: number;
  total_preds: number;
  correct_preds: number;
  rank: number;
}

interface LeaderboardData {
  rows: LeaderboardRow[];
  currentUserRank: LeaderboardRow | null;
}

const TABS = [
  { key: 'today', label: 'היום' },
  { key: 'week',  label: 'השבוע' },
  { key: 'alltime', label: 'כל הזמנים' },
] as const;

export default function LeaderboardTable() {
  const [period, setPeriod] = useState<'today' | 'week' | 'alltime'>('today');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  function accuracy(row: LeaderboardRow) {
    if (!row.total_preds) return '—';
    return `${Math.round((row.correct_preds / row.total_preds) * 100)}%`;
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              period === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">טוען...</div>
      ) : !data?.rows.length ? (
        <div className="text-center text-slate-400 py-12">אין נתונים עדיין</div>
      ) : (
        <div className="space-y-2">
          {data.rows.map(row => (
            <div
              key={row.id}
              className={`flex items-center gap-4 bg-[#1e293b] rounded-xl px-4 py-3 border ${
                data.currentUserRank?.id === row.id ? 'border-blue-500' : 'border-slate-700'
              }`}
            >
              <span className="text-slate-400 font-mono text-sm w-6 text-center">
                #{row.rank}
              </span>
              <span className="flex-1 font-semibold text-slate-100">{row.nickname}</span>
              <span className="text-slate-400 text-xs">{accuracy(row)}</span>
              <span className="text-blue-400 font-bold">{row.points} נק'</span>
            </div>
          ))}

          {data.currentUserRank && !data.rows.find(r => r.id === data.currentUserRank!.id) && (
            <div className="flex items-center gap-4 bg-blue-900/20 rounded-xl px-4 py-3 border border-blue-600 mt-4">
              <span className="text-slate-400 font-mono text-sm w-6 text-center">
                #{data.currentUserRank.rank}
              </span>
              <span className="flex-1 font-semibold text-slate-100">
                {data.currentUserRank.nickname} (את/ה)
              </span>
              <span className="text-slate-400 text-xs">{accuracy(data.currentUserRank)}</span>
              <span className="text-blue-400 font-bold">{data.currentUserRank.points} נק'</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
