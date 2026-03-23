import { NextRequest } from 'next/server';
import { getLatestAlarms } from '@/lib/alarms';
import { getCityBySlug } from '@/lib/cityMap';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function sendAlarms() {
        const alarms = getLatestAlarms(10);
        const enriched = alarms.map(a => ({
          ...a,
          city_he: a.city_mapped ? (getCityBySlug(a.city_mapped)?.nameHe ?? a.city_mapped) : null,
          city_en: a.city_mapped ? (getCityBySlug(a.city_mapped)?.nameEn ?? a.city_mapped) : null,
        }));
        const data = `data: ${JSON.stringify(enriched)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Send immediately
      sendAlarms();

      // Then every 5 seconds
      const interval = setInterval(sendAlarms, 5000);

      // Cleanup when client disconnects
      const cleanup = () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      };

      // Use a timeout as a max connection duration (60 minutes)
      const maxTimeout = setTimeout(cleanup, 60 * 60 * 1000);

      // Store cleanup reference
      (controller as unknown as { _cleanup: () => void })._cleanup = () => {
        clearInterval(interval);
        clearTimeout(maxTimeout);
      };
    },
    cancel() {
      // Called when client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
