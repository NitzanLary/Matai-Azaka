import { NextRequest, NextResponse } from 'next/server';
import { getAlarmsForCity } from '@/lib/alarms';
import { CITY_SLUGS } from '@/lib/cityMap';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city');
  const hours = parseInt(searchParams.get('hours') ?? '48', 10);

  if (!city || !CITY_SLUGS.includes(city as never)) {
    return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
  }

  if (isNaN(hours) || hours < 1 || hours > 168) {
    return NextResponse.json({ error: 'hours must be between 1 and 168' }, { status: 400 });
  }

  const alarms = getAlarmsForCity(city, hours);
  return NextResponse.json(alarms);
}
