# FacadeLens — Environment Setup

**Do this before writing a single line of code.**

---

## Step 1 — Create your local env file

Create a file named `.env.local` in the project root (same folder as `package.json`). It is gitignored by default; do not commit it.

Use this template and replace placeholders with your real values:

```bash
# Supabase (Dashboard → Settings → API)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Optional: document for Edge Function / local tooling (not bundled into the client for Gemini)
GEMINI_API_KEY=YOUR_GEMINI_KEY

EXPO_PUBLIC_GOOGLE_MAPS_KEY=YOUR_GOOGLE_MAPS_KEY
EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=YOUR_UNSPLASH_ACCESS_KEY

APP_ENV=development
```

If `.env.local` is not ignored yet, add it to `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## Step 2 — Supabase

**Create a new Supabase project:**
1. Go to https://supabase.com → New project
2. Name: `facadelens`
3. Region: US East (or closest to you)
4. Generate a strong database password — save it somewhere safe

**Get your keys:**
- Dashboard → Settings → API
- Copy `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Configure Auth:**
- Dashboard → Authentication → Providers → Email → Enable
- Disable "Confirm email" during development (Settings → Auth → toggle off)
- Re-enable before beta launch

**Create database schema:**
- Dashboard → SQL Editor → run the SQL from `M0_foundation.md` (profiles + scans tables, RLS, triggers)

**Create Storage bucket:**
- Dashboard → Storage → New bucket
- Name: `facade-photos`
- Public: NO (private bucket)
- Add RLS policies: authenticated users can read/write `{user_id}/*`

```sql
-- Storage RLS policies (run in SQL editor)
create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own photos"
  on storage.objects for select
  using (auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own photos"
  on storage.objects for delete
  using (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Step 3 — Google Gemini API

1. Go to https://aistudio.google.com/app/apikey
2. Create API key → copy it
3. This key goes in Supabase secrets, NOT in `.env.local`:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

> **Why Supabase secrets?** The Gemini key is used server-side in the Edge Function only. It should never be exposed to the client app. Supabase secrets are injected as environment variables into Edge Functions at runtime and are never returned to clients.

**Enable the API:**
- In Google AI Studio, ensure the key has access to `gemini-2.5-flash` model
- No additional API enablement required (different from Google Cloud APIs)

**Cost alert:** Set a budget alert in Google AI Studio → Usage → Billing. Set alert at $50/month to notify you before costs scale.

---

## Step 4 — Google Maps API (Reverse Geocoding)

1. Go to https://console.cloud.google.com
2. Create a new project called `facadelens` (or use existing)
3. APIs & Services → Enable APIs → search "Geocoding API" → Enable
4. APIs & Services → Credentials → Create credentials → API Key
5. Copy the key → `EXPO_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local`

**Restrict the key for production (do this before beta):**
- Application restrictions: iOS apps + Android apps
- API restrictions: Geocoding API only

**Free tier:** 40,000 geocoding requests/month — effectively free at V1 scale.

---

## Step 5 — Unsplash API (M6 — sample scan)

1. Go to https://unsplash.com/developers
2. Register as a developer → New Application
3. Application name: `FacadeLens (development)`
4. Copy Access Key → `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY`

**Free tier:** 50 requests/hour — more than sufficient for V1 (you're fetching one sample image at startup).

**Attribution requirement:** When displaying Unsplash images, include a link to the photographer's profile with UTM params: `?utm_source=facadelens&utm_medium=referral`. This is required by the Unsplash API terms.

---

## Step 6 — Supabase CLI Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project (run from project root)
supabase link --project-ref your_project_ref
# Find project ref: Dashboard → Settings → General → Reference ID

# Verify Edge Functions work
supabase functions serve analyze-facade --env-file .env.local
```

---

## Step 7 — Expo / EAS Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login with your Expo account
eas login

# Configure the project (run from project root)
eas build:configure

# This creates eas.json (see M6_polish.md for the correct config)
```

---

## API Keys Summary

| Key | Where it's used | Where it's stored | Secret? |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Client app | `.env.local` | No (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client app | `.env.local` | No (public, RLS-protected) |
| `GEMINI_API_KEY` | Edge Function only | Supabase secrets | **Yes** |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Client app | `.env.local` | Restrict by app bundle ID |
| `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY` | Client app | `.env.local` | No (rate-limited by key) |
| `EXPO_PUBLIC_SENTRY_DSN` | Client app | `.env.local` | No (public DSN) |
| Supabase service role key | Edge Function only | Supabase secrets (auto-injected) | **Yes — never put in client** |

---

## Security Reminders

- `EXPO_PUBLIC_*` keys ARE bundled into the app binary and visible to determined users — never put secret keys here
- The Gemini API key and Supabase service role key must only ever live in Supabase secrets
- Rotate any key that is accidentally committed to git immediately
- Set API key restrictions (by app bundle ID, by API) before shipping to beta

---

## Verify Setup

Run this checklist after completing all steps:

- [ ] `.env.local` exists and is in `.gitignore`
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Supabase `profiles` and `scans` tables created with RLS enabled
- [ ] `facade-photos` private bucket created with RLS policies
- [ ] Gemini key set via `supabase secrets set`
- [ ] Google Maps key in `.env.local`
- [ ] `supabase link` ran successfully (project linked)
- [ ] `npx expo run:ios` launches the bare workflow app without errors
