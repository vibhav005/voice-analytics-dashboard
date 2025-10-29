# VoiceOps IQ — Call Analytics Dashboard (Frontend Only)

VoiceOps IQ is a React + TypeScript dashboard for monitoring AI voice agents in production.

It includes:

- Live-looking charts for call volume, call failures, resolution time, CSAT, and failure root causes.
- SLA tracking and breach highlighting.
- Editable metrics with per-day overrides.
- User-specific persistence using Supabase.
- A marketing-style landing page and a `/dashboard` analytics console.
- A dark, glassy, neon-mint UI inspired by modern AI infra dashboards.

---

## 🔥 Features

### 1. Landing Page (`/`)

- Hero section with marketing copy.
- Animated mint glow aesthetic.
- CTA-style components that match Superbryn-like vibe.

### 2. Dashboard Page (`/dashboard`)

- **Stat cards** (total calls, handle time, CSAT, voice agent health score).
- **CallVolumeLineChart**

  - Shows total calls vs failed calls per day.
  - Lets a user edit calls & failures for each day of the last 7 days.
  - Shows per-day spike/health state based on failure rate.
  - Saves data to Supabase per email.
  - Uses a Confirm modal instead of `window.confirm`.
  - Uses toast notifications instead of `alert`.

- **ResolutionTimeEditableChart**

  - Shows average resolution time (sec) per day.
  - Lets the user edit those values.
  - Lets the user define an SLA target, draws that SLA as a reference line on the chart.
  - Marks days red if they breach SLA.
  - Saves edits + SLA target to Supabase under the user’s email.
  - Has the same confirm + toast flow.

### 3. Email-Gated Editing

- Before a user can edit chart values, we ask for their email.
- That email is:
  - stored in `localStorage` for convenience
  - used as the key in Supabase
  - used to load their previous values if they come back

If Supabase already has values for that email, we show a custom confirm modal:

> "Load your saved values?"

### 4. Toast System

- Non-blocking "Saved" / "Error saving" messages in bottom-right.
- Auto-dismiss.
- Consistent mint/red palette.

### 5. Dark Mint Aesthetic

- Tailwind-driven glass cards (`bg-black/40`, blur, subtle borders).
- Radial glow accents.
- Mint accent chips (SLA, Live, Internal).
- Consistent rounded-pill CTAs.

---

## 🧱 Tech Stack

- **React + TypeScript**
- **Vite** for bundling / dev server
- **React Router DOM** for routing (`/` and `/dashboard`)
- **Tailwind CSS** for styling
- **Recharts** for all data viz
- **Supabase JS client** for persistence (`custom_metrics` table)
- **LocalStorage** for remembering a user's email

---

## 🗄 Supabase Schema

In Supabase SQL editor, create / update your table:

```sql
create table if not exists public.custom_metrics (
  email text primary key,
  resolution_times jsonb not null default '[]'::jsonb,
  target_resolution_sla numeric,
  call_metrics_calls jsonb,
  call_metrics_fail jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.custom_metrics_history (
  id uuid primary key default gen_random_uuid(),
  email text,
  resolution_times jsonb,
  call_metrics_calls jsonb,
  call_metrics_fail jsonb,
  target_resolution_sla numeric,
  saved_at timestamptz default now()
);
```
