import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'מתי אזעקה — Matai-Azaka',
  description: 'Predict alarm patterns in Israeli cities',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased">
        <nav className="bg-[#1e293b] border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-blue-400">
            🎯 מתי אזעקה
          </a>
          <div className="flex gap-4 text-sm">
            <a href="/leaderboard" className="text-slate-300 hover:text-white transition-colors">
              לוח המובילים
            </a>
            <a href="/my-predictions" className="text-slate-300 hover:text-white transition-colors">
              הניחושים שלי
            </a>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
