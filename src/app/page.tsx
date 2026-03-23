import { cookies } from 'next/headers';
import AlarmTicker from '@/components/AlarmTicker';
import PredictionBoard from '@/components/PredictionBoard';
import { SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get(SESSION_COOKIE)?.value;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">מתי אזעקה?</h1>
        <p className="text-slate-400 text-sm">
          נחש כמה אזעקות יהיו בכל עיר בכל שעה — כי אם כבר קמת ב-2 בלילה, אולי תנחש נכון
        </p>
      </div>

      <AlarmTicker />

      <PredictionBoard hasSession={hasSession} />
    </div>
  );
}
