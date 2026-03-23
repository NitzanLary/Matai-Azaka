'use client';

interface Slot {
  id: number;
  hour_start: number;
  alarm_option: number;
  actual_count: number | null;
  status: 'open' | 'locked' | 'resolved';
  participant_count: number;
}

interface Alarm {
  id: number;
  city_mapped: string | null;
  alert_time: string;
}

interface City {
  slug: string;
  nameHe: string;
  nameEn: string;
}

interface CityDetailProps {
  city: City;
  date: string;
  slots: Slot[];
  alarms: Alarm[];
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-600/30 border-blue-600 text-blue-300',
  locked: 'bg-amber-600/20 border-amber-600 text-amber-300',
  resolved: 'bg-slate-700 border-slate-600 text-slate-400',
};

export default function CityDetail({ city, date, slots, alarms }: CityDetailProps) {
  // Group slots by hour
  const byHour = new Map<number, Slot[]>();
  for (const slot of slots) {
    if (!byHour.has(slot.hour_start)) byHour.set(slot.hour_start, []);
    byHour.get(slot.hour_start)!.push(slot);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{city.nameHe}</h1>
        <p className="text-slate-400 text-sm">{city.nameEn} · {date}</p>
      </div>

      {/* 24-hour timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-3">לוח שעתי</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: 24 }, (_, h) => {
            const hourSlots = byHour.get(h) ?? [];
            const status = hourSlots[0]?.status ?? 'open';
            const actual = hourSlots[0]?.actual_count;
            return (
              <div
                key={h}
                className={`rounded-lg border p-2 text-center text-xs ${STATUS_COLOR[status]}`}
              >
                <div className="font-mono font-bold">{String(h).padStart(2, '0')}:00</div>
                {status === 'resolved' && actual !== null && (
                  <div className="mt-1 text-lg font-bold">{actual}</div>
                )}
                {status !== 'resolved' && (
                  <div className="mt-1 text-xs opacity-60">
                    {status === 'locked' ? '🔒' : '⏳'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent alarms */}
      <div>
        <h2 className="text-lg font-semibold mb-3">אזעקות אחרונות (48 שעות)</h2>
        {alarms.length === 0 ? (
          <p className="text-slate-500 text-sm">אין אזעקות אחרונות</p>
        ) : (
          <div className="space-y-2">
            {alarms.map(alarm => (
              <div key={alarm.id} className="bg-[#1e293b] rounded-lg px-4 py-2 border border-slate-700 text-sm">
                <span className="text-slate-400">
                  {new Date(alarm.alert_time + 'Z').toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
