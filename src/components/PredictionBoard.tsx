'use client';

import { useState, useEffect, useCallback } from 'react';
import CityTabs from './CityTabs';
import PredictionCard from './PredictionCard';
import NicknameModal from './NicknameModal';
import type { CitySlug } from '@/lib/cityMap';
import { CITIES } from '@/lib/cityMap';

interface RawSlot {
  id: number;
  city: string;
  date: string;
  hour_start: number;
  alarm_option: number;
  actual_count: number | null;
  status: 'open' | 'locked' | 'resolved';
  participant_count: number;
  user_pick: number | null;
}

interface SlotGroup {
  city: string;
  date: string;
  hour_start: number;
  status: 'open' | 'locked' | 'resolved';
  actual_count: number | null;
  user_pick: number | null;
  options: Array<{ id: number; alarm_option: number; participant_count: number }>;
}

function groupSlots(slots: RawSlot[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  for (const slot of slots) {
    const key = `${slot.city}:${slot.date}:${slot.hour_start}`;
    if (!map.has(key)) {
      map.set(key, {
        city: slot.city,
        date: slot.date,
        hour_start: slot.hour_start,
        status: slot.status,
        actual_count: slot.actual_count,
        user_pick: slot.user_pick,
        options: [],
      });
    }
    map.get(key)!.options.push({
      id: slot.id,
      alarm_option: slot.alarm_option,
      participant_count: slot.participant_count,
    });
  }
  // Sort options by alarm_option
  for (const g of map.values()) {
    g.options.sort((a, b) => a.alarm_option - b.alarm_option);
  }
  return Array.from(map.values()).sort((a, b) => a.hour_start - b.hour_start);
}

interface PredictionBoardProps {
  hasSession: boolean;
}

export default function PredictionBoard({ hasSession }: PredictionBoardProps) {
  const [activeCity, setActiveCity] = useState<CitySlug>(CITIES[0].slug);
  const [slots, setSlots] = useState<RawSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(!hasSession);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  const fetchSlots = useCallback(async (city: CitySlug) => {
    setLoading(true);
    const res = await fetch(`/api/slots?city=${city}`);
    const data = await res.json();
    setSlots(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots(activeCity);
  }, [activeCity, fetchSlots]);

  function handleCityChange(city: CitySlug) {
    setActiveCity(city);
  }

  const groups = groupSlots(slots);
  const displayed = filter === 'upcoming'
    ? groups.filter(g => g.status === 'open' || g.status === 'locked')
    : groups;

  return (
    <>
      {showModal && (
        <NicknameModal onRegistered={() => {
          setShowModal(false);
          fetchSlots(activeCity);
        }} />
      )}

      <div className="space-y-4">
        <CityTabs activeCity={activeCity} onCityChange={handleCityChange} />

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === 'upcoming' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            שעות קרובות
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            כל השעות
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">טוען...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            אין ניחושים פתוחים כרגע
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayed.map(group => (
              <PredictionCard
                key={`${group.city}:${group.hour_start}`}
                group={group}
                onPicked={() => fetchSlots(activeCity)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
