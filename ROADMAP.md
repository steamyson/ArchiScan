# FacadeLens — V1 Implementation Roadmap

**Version:** 1.0 (Updated with final library selections)
**App:** FacadeLens
**Status:** Pre-Development — Spec v0.3 complete, AI pipeline validated

---

## Milestone Overview

| Milestone | Name | Description | Depends On |
|---|---|---|---|
| M-1 | Spike | AI prompt testing across 20+ facades ✅ | — |
| M0 | Foundation | Bare Expo scaffold, Supabase, auth, nav shell | M-1 |
| M1 | Capture | Vision Camera integration, photo capture, Storage upload | M0 |
| M2 | AI Pipeline | Edge Function → Gemini → JSON response | M1 |
| M3 | Overlay | Leader-line SVG annotations, tap-to-expand cards | M2 |
| M4 | Critique | Written critique display UI | M3 |
| M5 | Herbarium | Save scans, specimen cards, filter/search | M4 |
| M6 | Polish & Beta | Edge cases, onboarding, Lottie animations, TestFlight | M5 |

---

## Locked Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | React Native + Expo (bare workflow) | Bare required for Vision Camera v4 + New Architecture |
| **Routing** | Expo Router (file-based) | |
| **UI Components** | Tamagui | Dark-mode-first, compiler-optimized, token system |
| **Animation** | react-native-reanimated v3 | Native-thread 60fps, gesture integration |
| **Loading Animations** | lottie-react-native | Scanner-effect Lottie packs from LottieFiles |
| **Icons** | Phosphor Icons (primary), Tabler Icons (secondary) | Duotone weight for dark UI, architectural vocabulary |
| **Camera** | react-native-vision-camera v4 | Frame Processors, tap-to-focus, pinch-zoom, New Architecture |
| **Overlay Rendering** | react-native-svg | Leader lines and labels over still images |
| **State Management** | Zustand | |
| **Database** | Supabase (PostgreSQL + PostGIS) | |
| **Auth** | Supabase Auth | Email/password; OAuth in M6 |
| **Object Storage** | Supabase Storage | Private `facade-photos` bucket |
| **Backend Logic** | Supabase Edge Functions (Deno) | |
| **AI API** | Google Gemini 2.5 Flash | Vision identification + critique |
| **Reverse Geocoding** | Google Maps Geocoding API | |
| **Imagery (sample/reference)** | Unsplash API + Mapillary | Unsplash for sample scan; Mapillary for geotagged street-level |

---

## Architecture Requirements

**New Architecture is required.**
react-native-vision-camera v4 depends on Fabric + JSI (React Native New Architecture). This is enabled by default in Expo SDK 52+. Confirm `"newArchEnabled": true` in `app.json`.

**Bare workflow is required.**
Vision Camera uses native modules that require `npx expo prebuild`. You cannot use Expo Go — use Expo Dev Client for development.

---

## Dependency Chain

```
M-1 (Spike — done)
 └── M0 (Foundation: bare Expo + Supabase + auth)
      └── M1 (Capture: Vision Camera + Storage upload)
           └── M2 (AI Pipeline: Edge Function + Gemini)
                └── M3 (Overlay: SVG leader lines + Reanimated)
                     └── M4 (Critique: text display UI)
                          └── M5 (Herbarium: save + browse)
                               └── M6 (Polish + beta)
```

---

## Database Schema (created in M0, used across milestones)

```sql
-- profiles (M0)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- scans (M0 schema, M2 first write)
create extension if not exists postgis;
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  overlay_data jsonb,
  building_summary jsonb,
  critique_text text,
  building_address text,
  coordinates geography(point, 4326),
  captured_at timestamptz default now(),
  user_notes text,
  tags text[] default '{}',
  created_at timestamptz default now()
);
```

---

## File Index

- [M0 — Foundation](./M0_foundation.md)
- [M1 — Capture](./M1_capture.md)
- [M2 — AI Pipeline](./M2_ai_pipeline.md)
- [M3 — Overlay](./M3_overlay.md)
- [M4 — Critique Display](./M4_critique.md)
- [M5 — Herbarium](./M5_herbarium.md)
- [M6 — Polish & Beta](./M6_polish.md)

---

## Open Questions (from spec v0.3)

| # | Question | Status |
|---|---|---|
| 1 | LLM accuracy across diverse facade styles | Partially answered — expand test set in M2 |
| 2 | Bounding coordinate precision | Answered — zone-approximate, leader-line approach adopted |
| 3 | Acceptable scan-to-overlay latency | Open — test in beta |
| 4 | Minimum dataset for fine-tuned detection model | Post-V1 |
| 5 | IP implications of speculative re-imaginations | V2+ concern |
| 6 | Critique tone calibration | Open — A/B in V1 beta |

---

*FacadeLens Roadmap v1.0 — Update when technical decisions change, not after the fact.*
