# AlarmBet — PRD (Product Requirements Document)

> A lightweight, humor-driven prediction game where Israelis bet (no real money) on alarm patterns during the Israel–Iran conflict. Think Polymarket meets Pikud HaOref — because if you're already awake at 2 AM, you might as well be right about it.

**Version:** 1.0
**Author:** Nitzan
**Last Updated:** 2026-03-23
**Stack:** Next.js 14 (App Router) + SQLite (better-sqlite3) + Pikud HaOref API

---

## 1. Problem Statement

During prolonged conflict, Israeli civilians endure unpredictable alarm patterns — often at night — with no sense of control or community outlet beyond news doomscrolling. Stress, sleep disruption, and isolation compound over time.

**AlarmBet** channels dark humor and communal engagement into a lightweight prediction game. It gives people a shared, low-stakes activity that turns anxiety into agency — you can't stop the alarms, but you can try to outsmart them.

---

## 2. Core Concept

- Users predict alarm events for **major Israeli cities**, by **hour** and **count**
- Predictions are binary (yes/no) — "Will there be exactly 2 alarms in Tel Aviv between 01:00–02:00?"
- No real money — pure bragging rights
- A **live alarm feed** from Pikud HaOref resolves predictions automatically
- **Leaderboards** (daily, weekly, all-time) drive friendly competition

---

## 3. Target Audience

- Israeli civilians (Hebrew-first UI, English secondary)
- Age 18+ (humor may not land with younger audiences)
- Mobile-first usage (people check this from bed or the mamad)

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14, App Router | SSR + API routes in one deploy |
| Database | SQLite via `better-sqlite3` | Zero infra, single file, fast reads |
| Styling | Tailwind CSS | Rapid UI, mobile-first utilities |
| Alarm Data | Pikud HaOref API (see §8) | Real-time alarm resolution |
| Auth | Anonymous + nickname | Zero friction — cookie-based session |
| Hosting | Vercel or single VPS | Simplest deploy path |
| Language | TypeScript throughout | Type safety for prediction logic |

---

## 5. User Flow

### 5.1 First Visit

1. User lands on the home page
2. Prompted to pick a **nickname** (stored in cookie + DB)
3. Sees the **prediction board** for the current day
4. Can immediately start making predictions

### 5.2 Core Loop

```
Browse predictions → Pick YES/NO → Wait for resolution → Check leaderboard → Repeat
```

### 5.3 Page Map

```
/                   → Home: today's prediction board + live alarm ticker
/leaderboard        → Daily / Weekly / All-time rankings
/my-predictions     → User's prediction history + stats
/city/[slug]        → City-specific prediction view
```

---

## 6. Feature Specifications

### 6.1 Prediction Board (Home — `/`)

The main screen. Shows a grid of **prediction cards** grouped by city.

**Pre-generated predictions:**
- **Cities (Top 10):** Tel Aviv, Jerusalem, Haifa, Beer Sheva, Rishon LeZion, Petah Tikva, Ashdod, Netanya, Bnei Brak, Holon
- **Time slots:** Every hour of the day (00:00–01:00, 01:00–02:00, ... , 23:00–00:00) → 24 slots
- **Alarm count options per slot:** 0, 1, 2, 3+ → 4 options per slot
- **Total predictions per city per day:** 24 slots × 4 count options = 96
- **Total predictions per day:** 10 cities × 96 = 960

**Prediction card structure:**
```
┌──────────────────────────────────┐
│ 🏙️ Tel Aviv                      │
│ ⏰ 01:00 – 02:00                 │
│                                  │
│ How many alarms?                 │
│ [0] [1] [2] [3+]                │
│                                  │
│ 47 people predicted  │ ⏳ 2h left │
└──────────────────────────────────┘
```

**Card states:**
- `open` — accepting predictions (time slot is in the future)
- `locked` — time slot has started, no more predictions
- `resolved` — time slot passed, actual count known from Pikud HaOref
- `resolved` cards show ✅ / ❌ and actual alarm count

**Filtering:**
- By city (dropdown or tabs for quick switching)
- By time range (upcoming / past / all)
- Default view: current city (geo-IP or manual selection) + upcoming slots

**Live Alarm Ticker:**
- Horizontal scrolling banner at the top of the page
- Shows the last 10 alarms in real time (city, time, seconds ago)
- Subtle animation on new alarm arrival

### 6.2 Prediction Mechanics

- Each user can pick **one alarm count** per city per time slot (e.g., "Tel Aviv 01:00–02:00 → 2 alarms")
- Predictions can be changed until the slot **locks** (when the hour begins)
- Correct prediction = **1 point**
- Incorrect = **0 points** (no negative scoring — keep it fun)
- Predicting `3+` is correct if actual count ≥ 3

### 6.3 Leaderboard (`/leaderboard`)

Three tabs:

| Tab | Scope | Reset |
|-----|-------|-------|
| Today | Points earned today (Israel time, UTC+2/+3) | Midnight |
| This Week | Points earned Sun–Sat | Sunday midnight |
| All-Time | Cumulative points since account creation | Never |

**Display per row:**
```
#1  🎯 RocketDodger69    — 23 pts (14/18 correct today)
#2  🎯 MamadMaster       — 21 pts (13/17 correct today)
```

- Show top 50
- Highlight current user's rank
- Show user's accuracy percentage alongside points

### 6.4 User Profile / My Predictions (`/my-predictions`)

- Prediction history (grouped by day)
- Stats: total predictions, accuracy %, best streak, favorite city
- Editable nickname

### 6.5 City View (`/city/[slug]`)

- Full 24-hour grid for a single city
- Visual timeline showing resolved/open/locked slots
- Mini alarm history for that city (last 48 hours)

### 6.6 Live Alarm Feed Integration (Tzeva Adom / Tzofar API)

See §8 for technical API details.

**Functional requirements:**
- Poll `api.tzevaadom.co.il/alerts-history` every **30 seconds** for new alerts
- Map alert area strings to the 10 supported cities (prefix matching — see §7.2)
- Filter out drills (`isDrill: true`)
- Increment alarm counters per city per hour slot
- Auto-resolve prediction cards when the time slot closes
- Store raw alarm data for audit/display

### 6.7 Anonymous Auth

- On first visit, prompt for **nickname** (3–20 chars, alphanumeric + Hebrew + underscores)
- Generate a random **session token** (UUID v4)
- Store token in HTTP-only cookie (30-day expiry, refreshed on visit)
- Store nickname + token hash in DB
- If cookie is lost, user can claim their account by re-entering the exact nickname + a 6-digit recovery code shown once at registration (optional — "save this if you care about your streak")

---

## 7. Data Model (SQLite)

### 7.1 Tables

```sql
-- Users
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname      TEXT NOT NULL UNIQUE,
  token_hash    TEXT NOT NULL UNIQUE,
  recovery_code TEXT,               -- 6-digit, shown once
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-generated daily prediction slots
CREATE TABLE prediction_slots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  city          TEXT NOT NULL,       -- e.g., 'tel_aviv'
  date          TEXT NOT NULL,       -- e.g., '2026-03-23'
  hour_start    INTEGER NOT NULL,    -- 0–23
  alarm_option  INTEGER NOT NULL,    -- 0, 1, 2, 3 (3 means 3+)
  actual_count  INTEGER,             -- NULL until resolved
  status        TEXT NOT NULL DEFAULT 'open',  -- open|locked|resolved
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(city, date, hour_start, alarm_option)
);

-- User predictions
CREATE TABLE predictions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  slot_id         INTEGER NOT NULL REFERENCES prediction_slots(id),
  is_correct      INTEGER,           -- NULL until resolved, 0 or 1
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, slot_id)
);
-- Note: each user picks ONE alarm_option per (city, date, hour_start).
-- The UNIQUE constraint on slot_id ensures one pick per option;
-- application logic enforces one pick per (city, date, hour_start) group.

-- Raw alarm log from Tzeva Adom API
CREATE TABLE alarm_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_data      TEXT NOT NULL,        -- JSON blob from API
  city_mapped   TEXT,                 -- mapped city slug
  alert_time    DATETIME NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard cache (materialized for performance)
CREATE TABLE leaderboard_cache (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  period        TEXT NOT NULL,        -- 'daily:2026-03-23' | 'weekly:2026-W12' | 'alltime'
  points        INTEGER NOT NULL DEFAULT 0,
  total_preds   INTEGER NOT NULL DEFAULT 0,
  correct_preds INTEGER NOT NULL DEFAULT 0,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, period)
);

-- Indexes
CREATE INDEX idx_slots_city_date ON prediction_slots(city, date, status);
CREATE INDEX idx_slots_status ON prediction_slots(status, date, hour_start);
CREATE INDEX idx_predictions_user ON predictions(user_id, is_correct);
CREATE INDEX idx_alarm_log_time ON alarm_log(alert_time, city_mapped);
CREATE INDEX idx_leaderboard ON leaderboard_cache(period, points DESC);
```

### 7.2 City Mapping

```typescript
// Tzeva Adom API uses Hebrew city/sub-area names.
// This maps them to our city slugs using prefix matching.
// Real examples from API: "ירושלים - דרום", "אשדוד - ח,ט,י,יג,יד,טז", "חולון"

// Exact matches (simple city names)
const CITY_EXACT_MAP: Record<string, string> = {
  'חולון':                   'holon',
  'בני ברק':                 'bnei_brak',
  'נתניה':                   'netanya',
  'באר שבע':                 'beer_sheva',
};

// Prefix matches (cities with sub-areas like "ירושלים - דרום")
const CITY_PREFIX_MAP: Record<string, string> = {
  'תל אביב':                'tel_aviv',      // matches "תל אביב - יפו", "תל אביב - מרכז", etc.
  'ירושלים':                 'jerusalem',     // matches "ירושלים - דרום", "ירושלים - מזרח", etc.
  'חיפה':                   'haifa',         // matches "חיפה - כרמל", "חיפה - מרכז", etc.
  'ראשון לציון':              'rishon_lezion', // matches with sub-areas
  'פתח תקווה':               'petah_tikva',
  'אשדוד':                   'ashdod',        // matches "אשדוד - א,ב,ד,ה", "אשדוד - ג,ו,ז", etc.
};

function mapCityToSlug(apiCityName: string): string | null {
  // Try exact match first
  if (CITY_EXACT_MAP[apiCityName]) return CITY_EXACT_MAP[apiCityName];
  // Try prefix match
  for (const [prefix, slug] of Object.entries(CITY_PREFIX_MAP)) {
    if (apiCityName.startsWith(prefix)) return slug;
  }
  return null; // Not one of our tracked cities — ignore
}
```

> **Important:** The Tzeva Adom API returns a mix of simple city names (`"חולון"`) and
> sub-area names (`"אשדוד - ח,ט,י,יג,יד,טז"`). The prefix-matching approach handles both.
> This mapping should be validated against a full dump of historical city strings from the API.
> Cities not in our top-10 list are silently ignored.

---

## 8. Alarm Data Source — Tzeva Adom (Tzofar) API

> **Note:** The original Pikud HaOref `alerts.json` endpoint is no longer active.
> We use the **Tzeva Adom (Tzofar)** API instead, which aggregates alerts from Pikud HaOref
> and exposes them via a clean REST API.

### 8.1 Primary Endpoint — Alert History

```
GET https://api.tzevaadom.co.il/alerts-history
```

No auth headers required. Returns JSON array of recent alert groups.

**Response format:**
```json
[
  {
    "id": 6453,
    "description": null,
    "alerts": [
      {
        "time": 1774159419,       // Unix timestamp (seconds)
        "cities": ["ראש הנקרה"],  // Array of city/area names in Hebrew
        "threat": 0,              // Threat type (0 = rockets/missiles)
        "isDrill": false
      }
    ]
  },
  {
    "id": 6451,
    "description": null,
    "alerts": [
      {
        "time": 1774158685,
        "cities": [
          "ירושלים - דרום",
          "ירושלים - מזרח",
          "ירושלים - מערב",
          "ירושלים - מרכז",
          "ירושלים - צפון",
          "אשדוד - ח,ט,י,יג,יד,טז",
          "חולון",
          "פתח תקווה"
          // ... many more areas per alert group
        ],
        "threat": 0,
        "isDrill": false
      }
    ]
  }
]
```

**Key observations from real data:**
- A single alert group (`id`) can contain multiple `alerts` entries with different timestamps
- Each alert's `cities` array contains **sub-area names** (e.g., `"אשדוד - ח,ט,י,יג,יד,טז"`, `"ירושלים - דרום"`)
- The `time` field is a Unix timestamp in **seconds** (not milliseconds)
- `isDrill: true` should be **filtered out** — don't count drills as real alarms
- `threat: 0` = rockets/missiles (primary use case); other threat types may exist

### 8.2 Fallback / Scraping Options

If the Tzofar API becomes unavailable:
- **Oref alerts history page:** `https://www.oref.org.il/heb/alerts-history` — requires scraping (JS-rendered, may return 403)
- **Tzofar historical page:** `https://www.tzevaadom.co.il/historical/` — JS-rendered SPA, would require headless browser
- **Community libraries:** `tzevaadom` PyPI package, `ZeEitan/TzevaAdom` GitHub (JS) — both wrap the same Tzofar API

### 8.3 Polling Strategy

```
┌─────────────────────────────────────────────┐
│  CRON JOB (runs every 30 seconds)           │
│                                             │
│  1. Fetch /alerts-history                   │
│  2. For each alert group with new id:       │
│     a. Log raw JSON to alarm_log            │
│     b. For each alert entry:                │
│        - Filter out isDrill: true           │
│        - Map each city string → city slug   │
│        - Convert Unix time → Israel time    │
│        - Insert into alarm_log per city     │
│  3. Check for slots to lock/resolve:        │
│     a. Lock slots where hour_start == now   │
│     b. Resolve slots where hour_start < now │
│        - Count alarms from alarm_log        │
│        - Score all predictions for slot     │
│        - Update leaderboard_cache           │
└─────────────────────────────────────────────┘
```

### 8.4 Deduplication

- Store `last_seen_id` (highest alert group `id`) in DB or memory
- On each poll, only process groups with `id > last_seen_id`
- Within a group, each alert entry may list dozens of cities — each maps independently
- Handle edge case: the API may return the same `id` with updated data (re-check `time` values)

### 8.4 Slot Resolution Logic

```typescript
async function resolveSlot(slot: PredictionSlot): Promise<void> {
  // Count alarms for this city in this hour
  const alarmCount = db.prepare(`
    SELECT COUNT(*) as count FROM alarm_log
    WHERE city_mapped = ?
      AND alert_time >= datetime(?, '+' || ? || ' hours')
      AND alert_time < datetime(?, '+' || ? || ' hours')
  `).get(slot.city, slot.date, slot.hour_start, slot.date, slot.hour_start + 1);

  const actual = Math.min(alarmCount.count, 3); // cap at 3 for "3+"

  // Update all options for this slot group
  db.prepare(`
    UPDATE prediction_slots
    SET actual_count = ?, status = 'resolved'
    WHERE city = ? AND date = ? AND hour_start = ?
  `).run(alarmCount.count, slot.city, slot.date, slot.hour_start);

  // Score predictions: correct if user picked the matching alarm_option
  db.prepare(`
    UPDATE predictions SET is_correct = CASE
      WHEN slot_id IN (
        SELECT id FROM prediction_slots
        WHERE city = ? AND date = ? AND hour_start = ? AND alarm_option = ?
      ) THEN 1
      ELSE 0
    END
    WHERE slot_id IN (
      SELECT id FROM prediction_slots
      WHERE city = ? AND date = ? AND hour_start = ?
    )
  `).run(slot.city, slot.date, slot.hour_start, actual,
         slot.city, slot.date, slot.hour_start);

  // Refresh leaderboard cache
  await refreshLeaderboard(slot.date);
}
```

---

## 9. API Routes (Next.js App Router)

```
GET  /api/slots?city=&date=&status=     → list prediction slots (with counts)
POST /api/predict                        → { slotId } — make/change prediction
GET  /api/leaderboard?period=            → leaderboard data
GET  /api/me                             → current user profile + stats
POST /api/auth/register                  → { nickname } → set cookie + recovery code
GET  /api/alarms/live                    → SSE stream of latest alarms (for ticker)
GET  /api/alarms/history?city=&hours=    → recent alarm log for city
```

---

## 10. UI/UX Guidelines

### 10.1 Design Principles

- **Dark mode default** — people use this at night
- **Mobile-first** — 90%+ usage will be on phones in bed/mamad
- **Playful but not mocking** — humor about the situation, never about victims
- **Fast** — every interaction under 200ms perceived latency
- **Hebrew-first** with LTR-safe English fallback

### 10.2 Tone of Voice

- Section headers and labels: light humor encouraged (e.g., "🎯 Leaderboard — Who's the Real Iron Dome?")
- Notification copy: playful (e.g., "New alarm in Haifa — did you call it?")
- Never joke about casualties, injuries, or specific incidents

### 10.3 Color Palette

```
Background:     #0f172a (slate-900)
Card surface:   #1e293b (slate-800)
Primary:        #3b82f6 (blue-500) — buttons, active states
Success:        #22c55e (green-500) — correct predictions
Error:          #ef4444 (red-500)   — incorrect predictions
Warning:        #f59e0b (amber-500) — locked/pending slots
Text primary:   #f1f5f9 (slate-100)
Text secondary: #94a3b8 (slate-400)
```

### 10.4 Key Components

- **CityTabs** — horizontal scrollable tabs for quick city switching
- **PredictionCard** — the core interaction element (see §6.1)
- **AlarmTicker** — live scrolling banner
- **LeaderboardTable** — ranked list with user highlight
- **CountdownBadge** — shows time remaining before slot locks

---

## 11. Cron / Background Jobs

| Job | Frequency | Description |
|-----|-----------|-------------|
| `poll-alarms` | Every 30s | Fetch Tzeva Adom API, log new alarms |
| `lock-slots` | Every minute | Lock slots where the hour has started |
| `resolve-slots` | Every minute | Resolve completed slots, score predictions |
| `generate-slots` | Daily at 00:05 IST | Generate next day's 960 prediction slots |
| `refresh-leaderboard` | Every 5 minutes | Rebuild leaderboard cache |
| `cleanup` | Daily | Purge alarm_log entries older than 30 days |

**Implementation:** Use Next.js API route + Vercel Cron (if on Vercel) or `node-cron` for self-hosted. The 30s polling job is critical — use a dedicated long-running process or Vercel's `cron` config with a minimum 1-minute interval (poll twice per invocation).

---

## 12. Deployment

### 12.1 Vercel (Recommended)

- `next build` + `next start`
- SQLite file at `/tmp/alarmbet.db` (ephemeral) — **NOT suitable for production**
- For persistence: use **Turso** (libSQL, SQLite-compatible, hosted) or mount a persistent volume

### 12.2 Self-Hosted VPS (Alternative)

- Single `docker-compose.yml`
- SQLite file on persistent volume
- Nginx reverse proxy
- `pm2` or systemd for process management
- Lower cost, full control

### 12.3 Recommended: VPS with SQLite

Given the simplicity and real-time polling needs, a small VPS (e.g., Hetzner €4/mo) with SQLite on disk is the most practical choice. Vercel's serverless model adds unnecessary complexity for the background polling jobs.

---

## 13. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load (mobile 4G) | < 2 seconds |
| Prediction submit latency | < 200ms |
| Alarm polling latency | ≤ 30 seconds behind Tzeva Adom API |
| Concurrent users | 1,000+ (SQLite WAL mode) |
| Data retention | 30 days alarm log, indefinite predictions |
| Availability | Best-effort (not life-critical) |
| Accessibility | Basic — contrast ratios, screen reader labels |

---

## 14. Future Ideas (Post-MVP)

These are **not in scope** for v1 but worth considering:

- **Social reactions** — emoji reactions on predictions ("🔥 Bold call!")
- **Share to WhatsApp/Telegram** — "I predicted 3 alarms in Tel Aviv tonight — join me on AlarmBet"
- **Streak badges** — "🎖️ 5 correct in a row", "🦉 Night Owl — 10 correct after midnight"
- **Custom predictions** — user-created markets (e.g., "Iron Dome interception over Gush Dan before noon")
- **Push notifications** — "Your prediction is about to resolve!"
- **Multi-language** — Russian, Arabic, Amharic for broader Israeli audience
- **Historical analytics** — alarm pattern visualizations, heatmaps by city/hour

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tzeva Adom API changes/breaks | Predictions can't resolve | Monitor response format; fallback to scraping oref.org.il or tzevaadom.co.il historical pages |
| Tzeva Adom blocks polling | Core feature dead | Use respectful polling rate (30s); consider contributing/donating to Tzofar project |
| Perceived insensitivity | PR/social backlash | Tone guidelines (§10.2); "About" page explaining intent; community moderation of nicknames |
| SQLite write contention | Slow under heavy load | WAL mode; batch writes; upgrade to Turso if needed |
| Cookie loss = account loss | User frustration | Recovery code system; consider optional email backup later |
| War ends (best case!) | App becomes irrelevant | Celebrate. Archive. Move on. |

---

## 16. Open Questions

1. **Tzeva Adom API reliability** — The `api.tzevaadom.co.il/alerts-history` endpoint is unofficial and community-run. No SLA. Need a fallback strategy (scraping, caching).
2. **Area-to-city mapping completeness** — The prefix-matching approach in §7.2 covers common patterns, but needs validation against a full historical dump. Some area strings may not match any prefix (e.g., neighborhoods listed by name only).
3. **Alert counting semantics** — If a single alert group (one `id`) contains multiple alert entries for the same city at slightly different timestamps, should that count as 1 alarm or multiple? Need to define a dedup window (e.g., alerts within 60 seconds for the same city = 1 alarm).
4. **Hebrew RTL handling** — Next.js + Tailwind RTL support needs testing early.
5. **Should "3+" be the cap, or extend to 4, 5+?** — Depends on typical alarm density during escalations.

---

## 17. MVP Checklist

- [ ] Project scaffolding: Next.js 14 + TypeScript + Tailwind + better-sqlite3
- [ ] DB schema creation + seed script (generate today's slots)
- [ ] Anonymous auth (nickname + cookie + recovery code)
- [ ] Prediction board UI (city tabs, prediction cards, countdown)
- [ ] `/api/predict` endpoint
- [ ] Pikud HaOref polling job + alarm logging
- [ ] Slot locking + resolution + scoring logic
- [ ] Leaderboard (daily/weekly/all-time)
- [ ] Live alarm ticker (SSE)
- [ ] My Predictions page
- [ ] City detail page
- [ ] Daily slot generation cron
- [ ] Mobile-first dark theme
- [ ] Hebrew UI text + RTL layout
- [ ] Deploy to VPS with Docker
