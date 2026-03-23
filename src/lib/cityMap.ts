// Tzeva Adom API uses Hebrew city/sub-area names.
// This maps them to our city slugs using prefix matching.
// Real examples from API: "ירושלים - דרום", "אשדוד - ח,ט,י,יג,יד,טז", "חולון"

export const CITIES = [
  { slug: 'tel_aviv',      nameHe: 'תל אביב',      nameEn: 'Tel Aviv' },
  { slug: 'jerusalem',     nameHe: 'ירושלים',       nameEn: 'Jerusalem' },
  { slug: 'haifa',         nameHe: 'חיפה',          nameEn: 'Haifa' },
  { slug: 'beer_sheva',    nameHe: 'באר שבע',       nameEn: 'Beer Sheva' },
  { slug: 'rishon_lezion', nameHe: 'ראשון לציון',   nameEn: 'Rishon LeZion' },
  { slug: 'petah_tikva',   nameHe: 'פתח תקווה',     nameEn: 'Petah Tikva' },
  { slug: 'ashdod',        nameHe: 'אשדוד',         nameEn: 'Ashdod' },
  { slug: 'netanya',       nameHe: 'נתניה',         nameEn: 'Netanya' },
  { slug: 'bnei_brak',     nameHe: 'בני ברק',       nameEn: 'Bnei Brak' },
  { slug: 'holon',         nameHe: 'חולון',         nameEn: 'Holon' },
] as const;

export type CitySlug = typeof CITIES[number]['slug'];

export const CITY_SLUGS = CITIES.map(c => c.slug);

// Exact matches (simple city names with no sub-area suffix)
const CITY_EXACT_MAP: Record<string, CitySlug> = {
  'חולון':    'holon',
  'בני ברק':  'bnei_brak',
  'נתניה':    'netanya',
  'באר שבע':  'beer_sheva',
};

// Prefix matches (cities with sub-areas like "ירושלים - דרום")
const CITY_PREFIX_MAP: Record<string, CitySlug> = {
  'תל אביב':     'tel_aviv',
  'ירושלים':     'jerusalem',
  'חיפה':        'haifa',
  'ראשון לציון': 'rishon_lezion',
  'פתח תקווה':   'petah_tikva',
  'אשדוד':       'ashdod',
};

export function mapCityToSlug(apiCityName: string): CitySlug | null {
  // Try exact match first
  if (CITY_EXACT_MAP[apiCityName]) return CITY_EXACT_MAP[apiCityName];
  // Try prefix match
  for (const [prefix, slug] of Object.entries(CITY_PREFIX_MAP)) {
    if (apiCityName.startsWith(prefix)) return slug;
  }
  return null;
}

export function getCityBySlug(slug: string) {
  return CITIES.find(c => c.slug === slug) ?? null;
}
