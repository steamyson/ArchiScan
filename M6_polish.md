# M6 — Polish & Beta

**App:** FacadeLens
**Milestone:** M6 (Polish & Beta)
**Goal:** All edge cases handled, onboarding flow complete, Lottie loading states, sample scan, offline queue, Google/Apple OAuth, and the app is ready for TestFlight / Play Store internal testing.

**Depends on:** M5 complete (full app functional)

---

## Deliverables

1. All 5 edge cases from spec Section 8 handled gracefully
2. First-launch onboarding flow (welcome screen + permission requests)
3. Pre-loaded sample scan accessible from home screen
4. Offline photo queue (capture when offline, analyze when connectivity returns)
5. Google and Apple OAuth (in addition to email/password)
6. Scan cost counter for monitoring AI API spend
7. TestFlight + Play Store internal testing builds

---

## Edge Cases (Spec Section 8)

### 8.1 Non-Building Input

Detected when `analysis.building_summary.probable_style === 'not_a_facade'` or `elements.length < 3` (handled in Edge Function, M2). App receives an error-type response and shows:

```tsx
// components/NotAFacadeError.tsx
import { YStack, Text, Button } from 'tamagui'
import { Camera } from 'phosphor-react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

export function NotAFacadeError({ onRetry }: { onRetry: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      <YStack flex={1} ai="center" jc="center" px="$8" gap="$5">
        <Camera size={48} color="#888880" weight="thin" />
        <Text fos={17} color="$color" fw="600" ta="center">
          No building facade detected
        </Text>
        <Text fos={14} color="$colorMuted" ta="center" lh={22}>
          Try framing an exterior building face and make sure the facade fills most of the image.
        </Text>
        <Button onPress={onRetry} bg="$backgroundStrong" borderWidth={1} borderColor="$borderColor">
          <Text color="$color">Try Again</Text>
        </Button>
      </YStack>
    </Animated.View>
  )
}
```

---

### 8.2 Poor Lighting / Obstructed Facades

No user action required at capture. In the Edge Function, add a `visibility_note` field to the response when low-confidence elements dominate:

```ts
// In Edge Function — after parsing analysis
const lowConfidenceCount = analysis.elements.filter(e => e.confidence === 'low').length
const visibilityNote = lowConfidenceCount > analysis.elements.length * 0.6
  ? 'Limited visibility affected this reading. Results may be less precise than usual.'
  : null
```

Display `visibilityNote` as a banner above the critique if present (Tamagui `XStack` with Phosphor `Warning` icon).

---

### 8.3 Loading State — Lottie Animation

The `AnalyzingOverlay` (M2) handles this with the Lottie scanner animation + vocabulary fact card. In M6, refine timing:

- Show the overlay immediately after photo capture (before upload completes)
- Maintain the overlay through upload + Edge Function call + response parsing
- Total display time: varies (3–12s depending on network)
- Do not show a progress percentage — the timing is too variable

Download scanner Lottie from: https://lottiefiles.com/free-animations/scanner-effect
Verify CC0/CC-BY license before shipping.

---

### 8.4 API Failure / Offline Queue

Install: `npx expo install @react-native-community/netinfo`
Install: `npx expo install expo-file-system` (already installed in M1)

```ts
// lib/offlineQueue.ts
import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { analyzeFacade } from './analysis'

const QUEUE_KEY = 'facade_offline_queue'

interface QueuedScan {
  imagePath: string
  userId: string
  location: { lat: number; lng: number } | null
  address: string
  queuedAt: string
}

export async function enqueue(item: Omit<QueuedScan, 'queuedAt'>) {
  const existing = await getQueue()
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([
    ...existing,
    { ...item, queuedAt: new Date().toISOString() }
  ]))
}

export async function getQueue(): Promise<QueuedScan[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function processQueue() {
  const state = await NetInfo.fetch()
  if (!state.isConnected) return

  const queue = await getQueue()
  if (queue.length === 0) return

  const remaining: QueuedScan[] = []
  for (const item of queue) {
    try {
      await analyzeFacade(item)
    } catch {
      remaining.push(item) // keep failed items in queue
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
}

// Call processQueue() in app/_layout.tsx on NetInfo connectivity change
```

In `_layout.tsx`, subscribe to connectivity changes:
```ts
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) processQueue()
  })
  return unsubscribe
}, [])
```

Show a "Pending analysis" badge on queued scans in the Herbarium.

---

### 8.5 Ambiguous / Mixed-Use Facades

Handled in the Edge Function prompt (M2): `probable_style` allows compound values ("Romanesque Revival base with Art Deco upper stories"). No additional frontend work required. The `BuildingSummaryHeader` (M4) renders this as a single text field — no parsing needed.

---

## Onboarding Flow

### First Launch Detection

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function isFirstLaunch(): Promise<boolean> {
  const val = await AsyncStorage.getItem('has_launched')
  if (!val) {
    await AsyncStorage.setItem('has_launched', 'true')
    return true
  }
  return false
}
```

### Welcome Screen (`app/welcome.tsx`)

Show on first launch only. Route: check in `app/_layout.tsx`, navigate to `/welcome` if first launch.

```
Layout:
- Full-screen dark background
- Centered: beautiful annotated sample facade image (from assets — see Sample Scan below)
- Headline (large): "Point your camera at any building."
- Subline (small, muted): "Learn to read its architecture."
- CTA button: "Start Scanning" → navigates to main tabs, requests camera permission
- Skip / no tutorial carousel
```

### Permission Requests

- **Camera:** request immediately when user taps "Start Scanning" on welcome screen
- **Location:** request contextually at first capture tap, with rationale: *"Location helps identify your building's address and neighborhood context."*
- Both use Expo permissions APIs already installed

---

## Sample Scan

A pre-loaded sample scan lets users explore the overlay + critique experience before taking their first photo.

### Source: Unsplash API

Fetch a high-quality NYC landmark facade photo at app startup and cache it locally:

```ts
// lib/sampleScan.ts
import * as FileSystem from 'expo-file-system'

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY
const SAMPLE_IMAGE_PATH = FileSystem.cacheDirectory + 'sample_facade.jpg'

export async function getSampleFacadeUrl(): Promise<string> {
  // Check cache first
  const info = await FileSystem.getInfoAsync(SAMPLE_IMAGE_PATH)
  if (info.exists) return SAMPLE_IMAGE_PATH

  // Fetch from Unsplash — architecture collection, landscape orientation
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=building+facade+architecture+new+york&orientation=portrait&client_id=${UNSPLASH_ACCESS_KEY}`
  )
  const data = await res.json()
  const imageUrl = data.urls?.regular

  if (!imageUrl) throw new Error('Could not fetch sample image')

  await FileSystem.downloadAsync(imageUrl, SAMPLE_IMAGE_PATH)
  return SAMPLE_IMAGE_PATH
}
```

> **Attribution:** Per Unsplash license, link back with UTM: `?utm_source=facadelens&utm_medium=referral`. Display photographer credit below the sample scan.

Pair the sample image with a static JSON file (`assets/sample-scan.json`) containing pre-written overlay data + critique for a well-known NYC building (e.g., a Beaux-Arts facade on 5th Avenue) — this is what renders as the overlay and critique on the sample, regardless of the Unsplash image fetched.

---

## Google & Apple OAuth

```ts
// In Supabase dashboard: enable Google and Apple OAuth providers

// lib/auth.ts
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'facadelens://auth/callback',
    },
  })
  if (error) throw error
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: 'facadelens://auth/callback',
    },
  })
  if (error) throw error
}
```

Add OAuth buttons to `sign-in.tsx` and `sign-up.tsx`:
- Apple: `<AppleLogo size={18} weight="fill" />` (Phosphor)
- Google: use `@expo-google-fonts` or a simple "G" text badge

---

## Scan Cost Counter

Track cumulative AI API spend per user to monitor against the $500/month trigger threshold (spec Section 10):

```sql
alter table public.profiles add column scan_count integer default 0;

-- Increment on each scan insert (trigger or application logic)
create or replace function increment_scan_count()
returns trigger as $$
begin
  update public.profiles set scan_count = scan_count + 1 where id = new.user_id;
  return new;
end;
$$ language plpgsql;

create trigger on_scan_created
  after insert on public.scans
  for each row execute function increment_scan_count();
```

Display `scan_count` in the Profile tab. Add a Supabase dashboard metric to track total scans across all users.

---

## eas.json (Expo Application Services)

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

Build commands:
```bash
# Dev Client build (install on device for development)
eas build --profile development --platform ios

# Internal TestFlight / Play Store internal track
eas build --profile preview --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Pre-Beta QA Checklist

**Camera & Capture**
- [ ] Camera viewfinder launches without black screen on both iOS and Android
- [ ] Tap-to-focus ring animates correctly
- [ ] Pinch-to-zoom works smoothly
- [ ] Photo captured and uploaded to Supabase Storage

**AI Pipeline**
- [ ] Analysis completes within 10 seconds on LTE
- [ ] Lottie scanner animation plays during analysis
- [ ] Vocabulary fact card displays during loading
- [ ] Non-facade input shows friendly error (not a crash)

**Overlay**
- [ ] Leader lines render correctly on 5+ different facade types
- [ ] Staggered fade-in animation plays
- [ ] Tapping a label opens ElementDetailCard
- [ ] ElementDetailCard dismisses on drag down

**Critique**
- [ ] All 5 critique sections render with correct content
- [ ] Sections fade in with stagger
- [ ] AI disclosure note visible
- [ ] No raw markdown (**, *) in displayed text

**Herbarium**
- [ ] Save to Herbarium marks scan as saved
- [ ] Unauthenticated save redirects to sign-up
- [ ] Grid and list views both render correctly
- [ ] View mode toggle does not crash
- [ ] Signed URLs load images
- [ ] Filter and search return correct results

**Onboarding**
- [ ] Welcome screen shows on first launch only (not on subsequent launches)
- [ ] Camera permission requested correctly
- [ ] Location permission requested at first capture
- [ ] Sample scan accessible from home screen

**Offline**
- [ ] Capture while offline queues the scan
- [ ] Queue processes when connectivity returns

**Auth**
- [ ] Email/password sign up and login
- [ ] Google OAuth works (iOS + Android)
- [ ] Apple OAuth works (iOS only)
- [ ] Auth persists after app restart

**Builds**
- [ ] `eas build --profile preview` succeeds for iOS and Android
- [ ] Build installs on physical device via TestFlight / APK
- [ ] No crash on cold start
