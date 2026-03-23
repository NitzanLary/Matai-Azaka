'use client';

import { useState } from 'react';
import CountdownBadge from './CountdownBadge';

interface SlotGroup {
  city: string;
  date: string;
  hour_start: number;
  status: 'open' | 'locked' | 'resolved';
  actual_count: number | null;
  user_pick: number | null;
  // options[alarm_option] => { id, participant_count }
  options: Array<{ id: number; alarm_option: number; participant_count: number }>;
}

interface PredictionCardProps {
  group: SlotGroup;
  onPicked?: (slotId: number, option: number) => void;
}

const OPTION_LABELS = ['0', '1', '2', '3+'];

export default function PredictionCard({ group, onPicked }: PredictionCardProps) {
  const [loading, setLoading] = useState(false);
  const [localPick, setLocalPick] = useState<number | null>(group.user_pick);

  const hourLabel = `${String(group.hour_start).padStart(2, '0')}:00 – ${String(group.hour_start + 1).padStart(2, '0')}:00`;
  const totalParticipants = group.options.reduce((sum, o) => sum + o.participant_count, 0);

  async function handlePick(option: number, slotId: number) {
    if (group.status !== 'open' || loading) return;
    if (localPick === option) return;

    setLoading(true);
    setLocalPick(option);

    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'Not authenticated') {
        window.location.reload();
      }
      setLocalPick(group.user_pick);
      return;
    }

    onPicked?.(slotId, option);
  }

  function getOptionStyle(option: number): string {
    const base = 'flex-1 py-2 rounded-lg text-sm font-bold transition-all border ';

    if (group.status === 'resolved') {
      const isCorrectOption = option === Math.min(group.actual_count ?? 0, 3);
      const isUserPick = localPick === option;
      if (isCorrectOption && isUserPick) return base + 'bg-green-600 border-green-500 text-white';
      if (isCorrectOption) return base + 'bg-green-900/40 border-green-600 text-green-400';
      if (isUserPick) return base + 'bg-red-900/40 border-red-600 text-red-400 line-through';
      return base + 'bg-slate-800 border-slate-700 text-slate-500';
    }

    if (group.status === 'locked') {
      const isUserPick = localPick === option;
      return isUserPick
        ? base + 'bg-amber-700/40 border-amber-600 text-amber-300'
        : base + 'bg-slate-800 border-slate-700 text-slate-500';
    }

    // open
    const isUserPick = localPick === option;
    return isUserPick
      ? base + 'bg-blue-600 border-blue-500 text-white scale-105'
      : base + 'bg-[#1e293b] border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white cursor-pointer';
  }

  const statusBadge = () => {
    if (group.status === 'resolved') {
      const userPick = localPick;
      const correct = Math.min(group.actual_count ?? 0, 3);
      const won = userPick === correct;
      return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${won ? 'bg-green-900/60 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
          {won ? '✅ נכון!' : `❌ היו ${group.actual_count}+ אזעקות`}
        </span>
      );
    }
    if (group.status === 'locked') {
      return <span className="text-xs text-amber-400 font-medium">🔒 נעול</span>;
    }
    return <CountdownBadge date={group.date} hourStart={group.hour_start} />;
  };

  return (
    <div className={`bg-[#1e293b] rounded-xl p-4 border ${
      group.status === 'resolved' ? 'border-slate-700' :
      group.status === 'locked' ? 'border-amber-800/40' : 'border-slate-600'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-200">⏰ {hourLabel}</span>
        {statusBadge()}
      </div>

      <p className="text-xs text-slate-400 mb-2">כמה אזעקות?</p>

      <div className="flex gap-2">
        {group.options.map(opt => (
          <button
            key={opt.alarm_option}
            disabled={group.status !== 'open' || loading}
            onClick={() => handlePick(opt.alarm_option, opt.id)}
            className={getOptionStyle(opt.alarm_option)}
          >
            {OPTION_LABELS[opt.alarm_option]}
          </button>
        ))}
      </div>

      {totalParticipants > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          {totalParticipants} ניחשו
        </p>
      )}
    </div>
  );
}
