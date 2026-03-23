'use client';

import { useEffect, useState } from 'react';

interface Alarm {
  id: number;
  city_mapped: string | null;
  city_he: string | null;
  city_en: string | null;
  alert_time: string;
}

function timeAgo(isoTime: string): string {
  const diff = Math.floor((Date.now() - new Date(isoTime + 'Z').getTime()) / 1000);
  if (diff < 60) return `לפני ${diff}ש'`;
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)}ד'`;
  return `לפני ${Math.floor(diff / 3600)}ש"`;
}

export default function AlarmTicker() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/alarms/live');
    es.onmessage = (e) => {
      try {
        setAlarms(JSON.parse(e.data));
      } catch {}
    };
    return () => es.close();
  }, []);

  if (alarms.length === 0) {
    return (
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2 text-slate-500 text-sm text-center">
        אין אזעקות אחרונות
      </div>
    );
  }

  const items = [...alarms, ...alarms]; // duplicate for seamless scroll

  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-2 shrink-0 rounded-r-none rounded-l-lg">
          🚨 חי
        </span>
        <div className="overflow-hidden flex-1 px-2">
          <div className="ticker-track inline-flex gap-8">
            {items.map((alarm, i) => (
              <span key={`${alarm.id}-${i}`} className="text-sm text-slate-200 shrink-0">
                <span className="text-amber-400 font-medium">{alarm.city_he ?? alarm.city_mapped}</span>
                {' · '}
                <span className="text-slate-400">{timeAgo(alarm.alert_time)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
