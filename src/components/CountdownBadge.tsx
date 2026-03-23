'use client';

import { useEffect, useState } from 'react';

interface CountdownBadgeProps {
  hourStart: number;
  date: string;
}

function getSecondsUntilLock(date: string, hourStart: number): number {
  const lockTime = new Date(`${date}T${String(hourStart).padStart(2, '0')}:00:00+02:00`);
  return Math.max(0, Math.floor((lockTime.getTime() - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'נעול';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CountdownBadge({ hourStart, date }: CountdownBadgeProps) {
  const [seconds, setSeconds] = useState(() => getSecondsUntilLock(date, hourStart));

  useEffect(() => {
    if (seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds(getSecondsUntilLock(date, hourStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [date, hourStart, seconds]);

  const color = seconds > 3600 ? 'text-slate-400' : seconds > 600 ? 'text-amber-400' : 'text-red-400';

  return (
    <span className={`text-xs font-mono ${color}`}>
      ⏳ {formatCountdown(seconds)}
    </span>
  );
}
