# M0 — Manual closeout checklist

**Safe to delete this file** once every box below is checked and you are satisfied M0 is closed.

Use alongside the done criteria at the bottom of [`M0_foundation.md`](M0_foundation.md).

**Without a Mac:** You can close M0 using **Android only** (section 1b). Treat [`M0_foundation.md`](M0_foundation.md) “`npx expo run:ios`” as “**native Dev Client runs**” — on Windows use **`npm run android`** (or `npx expo run:android` if `JAVA_HOME` is set). Defer first real **iOS** install to a later **EAS iOS build** or a Mac when you have access.

---

## 1. Native Dev Client (not Expo Go)

You need **one** of the paths below (iOS on Mac, or Android on Windows/Linux/macOS).

### 1a. iOS (Mac + CocoaPods)

- [ ] On a Mac: from the project root, run `npx expo run:ios` (Dev Client build, not Expo Go).
- [ ] App installs and launches without a red-screen or native build failure.
- [ ] If pods fail: `cd ios && pod install`, then retry.

### 1b. Android (no Mac — Windows/Linux/macOS)

Prereqs: **Android Studio** (SDK, platform tools), **`ANDROID_HOME`** (or `ANDROID_SDK_ROOT`) set, and an **emulator** or physical device with **USB debugging**.

- [ ] From the project root, after native config changes: `npx expo prebuild` (when `android/` is missing or plugins / `app.json` changed; skip if your tree is already prebuilt and unchanged).
- [ ] Run **`npm run android`** — Dev Client installs on emulator or device (not Expo Go). This repo’s `android` script picks **Android Studio’s JDK** when `JAVA_HOME` is unset (common in Cursor until you fully restart the IDE after setting env vars). Alternatively: `npx expo run:android` after `JAVA_HOME` is set.
- [ ] App launches without a red-screen or native build failure.
- [ ] If Gradle fails: fix the reported issue (JDK version, missing SDK components, `ANDROID_HOME`), clean/rebuild as needed — same role as `pod install` on iOS.

### 1c. iOS later without a daily Mac (optional)

- [ ] When you need an iOS binary: use **EAS Build** (cloud macOS) with your Apple Developer setup, or verify on a Mac once — not required to keep developing on Android.

---

## 2. New Architecture (runtime)

- [ ] With the dev build running, watch **Metro** and **device/emulator** logs (**Android:** Logcat or Android Studio **Logcat**; **iOS:** Xcode / device console).
- [ ] Confirm `newArchEnabled` is true (already set in `app.json`; Android also has `newArchEnabled=true` in `gradle.properties` after prebuild).
- [ ] Note any **legacy bridge** warnings; ideally none for a clean M0 sign-off.

---

## 3. On-device smoke test

- [ ] First screen uses **Tamagui dark** theme (background feels correct, not a default light flash).
- [ ] **Tab bar** shows **Phosphor** icons: while **logged out**, only **Scan** appears; after sign-in, **Herbarium** and **Profile** appear too.
- [ ] While **logged out**, **Scan** shows **Sign in** / **Create account**; sign-up and sign-in forms accept keyboard input without crashing.

---

## 4. Supabase (dashboard)

### SQL

- [ ] In Supabase → **SQL Editor**, run (in order, or paste equivalent):

  1. [`supabase/migrations/20260417000000_m0_foundation.sql`](supabase/migrations/20260417000000_m0_foundation.sql) — PostGIS, `profiles`, `scans`, RLS, `handle_new_user` trigger.
  2. [`supabase/migrations/20260417000001_storage_facade_photos.sql`](supabase/migrations/20260417000001_storage_facade_photos.sql) — private **`facade-photos`** bucket + storage policies.

- [ ] If a migration errors on re-run, fix object names / drop policies only as needed (fresh projects usually run clean).

### Auth settings

- [ ] **Authentication** → **Providers** → **Email** enabled.
- [ ] **Email confirmation** disabled for local dev (per M0 brief); re-enable before beta.

### Schema + storage

- [ ] **Table Editor** (or SQL): `public.profiles` and `public.scans` exist.
- [ ] **Storage**: bucket **`facade-photos`** exists (created by the second migration).

---

## 5. Auth E2E (app + dashboard)

Prereq: `.env.local` has valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see [`ENV_SETUP.md`](ENV_SETUP.md)).

- [ ] **Sign up** with email/password (+ display name if your UI asks for it).
- [ ] In Supabase → **Authentication** → **Users**: new user appears.
- [ ] In **Table Editor** → `profiles`: row for that user (from trigger).
- [ ] **Sign out** in the app.
- [ ] **Sign in** again with the same credentials.
- [ ] **Force-quit** the app (or reboot device), reopen → **still signed in** (SecureStore + `persistSession`).

---

## Done

When every section that applies to your setup is checked, M0 manual verification matches the brief’s done criteria (native Dev Client + New Arch + UI + Supabase + auth). **Android-only:** checking **1b** (and skipping **1a** until you have iOS access) is enough to proceed. **Delete this file** if you no longer want it in the repo.
