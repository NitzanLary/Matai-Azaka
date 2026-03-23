import { notFound } from 'next/navigation';
import { getCityBySlug, CITY_SLUGS } from '@/lib/cityMap';
import { getDb } from '@/lib/db';
import { getIsraelDateString } from '@/lib/slots';
import { getAlarmsForCity } from '@/lib/alarms';
import CityDetail from './CityDetail';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return CITY_SLUGS.map(slug => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const date = getIsraelDateString();
  const db = getDb();

  const slots = db.prepare(`
    SELECT id, hour_start, alarm_option, actual_count, status,
           (SELECT COUNT(*) FROM predictions p WHERE p.slot_id = prediction_slots.id) as participant_count
    FROM prediction_slots
    WHERE city = ? AND date = ?
    ORDER BY hour_start, alarm_option
  `).all(slug, date);

  const alarms = getAlarmsForCity(slug, 48);

  return <CityDetail city={city} date={date} slots={slots as never} alarms={alarms} />;
}
