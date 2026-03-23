import LeaderboardTable from '@/components/LeaderboardTable';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">
          🎯 לוח המובילים — מי הכיפה שלנו?
        </h1>
        <p className="text-slate-400 text-sm">מי ניחש הכי הרבה נכון?</p>
      </div>
      <LeaderboardTable />
    </div>
  );
}
