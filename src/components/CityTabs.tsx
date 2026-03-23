'use client';

import { CITIES } from '@/lib/cityMap';
import type { CitySlug } from '@/lib/cityMap';

interface CityTabsProps {
  activeCity: CitySlug;
  onCityChange: (city: CitySlug) => void;
}

export default function CityTabs({ activeCity, onCityChange }: CityTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CITIES.map(city => (
        <button
          key={city.slug}
          onClick={() => onCityChange(city.slug)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCity === city.slug
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e293b] text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          {city.nameHe}
        </button>
      ))}
    </div>
  );
}
