# FacadeLens — App Architecture Patterns

**Purpose:** Consistent patterns for data fetching, state management, loading states, navigation guards, and component structure. Cursor should apply these patterns everywhere — not invent new ones per milestone.

---

## File Structure

```
facadelens/
├── app/                        # Screens only — thin orchestrators
│   ├── _layout.tsx             # Root layout + providers
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab navigator
│   │   ├── scan.tsx
│   │   ├── herbarium.tsx
│   │   └── profile.tsx
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── welcome.tsx
├── components/                 # Reusable UI components
│   ├── camera/                 # Camera-specific components
│   ├── overlay/                # Overlay-specific components
│   ├── critique/               # Critique display components
│   ├── herbarium/              # Herbarium components
│   └── shared/                 # Cross-feature: ErrorBanner, SkeletonBlock, etc.
├── hooks/                      # Custom React hooks
│   ├── useHerbariumScans.ts
│   ├── useSignedUrl.ts
│   └── useScanPipeline.ts
├── lib/                        # Business logic, utilities, API clients
│   ├── supabase.ts
│   ├── storage.ts
│   ├── analysis.ts
│   ├── geocoding.ts
│   ├── herbarium.ts
│   ├── offlineQueue.ts
│   ├── sampleScan.ts
│   ├── errorMessages.ts
│   └── logger.ts
├── stores/                     # Zustand stores
│   ├── authStore.ts
│   ├── herbariumStore.ts
│   └── scanStore.ts
├── types/                      # TypeScript interfaces and types
│   ├── scan.ts
│   └── overlay.ts
├── assets/
│   └── animations/             # Lottie JSON files
├── supabase/
│   └── functions/
│       └── analyze-facade/
│           └── index.ts
├── tamagui.config.ts
├── babel.config.js
├── app.json
├── eas.json
└── .cursorrules
```

---

## Screen Pattern

Screens in `app/` are thin orchestrators. They:
- Hold minimal local state (current view mode, selected item)
- Call custom hooks for data
- Delegate all rendering to components
- Never contain business logic

```tsx
// app/(tabs)/herbarium.tsx — correct pattern
import { useHerbariumScans } from '../../hooks/useHerbariumScans'
import { HerbariumGrid } from '../../components/herbarium/HerbariumGrid'
import { FilterSheet } from '../../components/herbarium/FilterSheet'
import { FullScreenError } from '../../components/shared/FullScreenError'
import { YStack } from 'tamagui'

export default function HerbariumScreen() {
  const { scans, signedUrls, loading, error, refetch } = useHerbariumScans()
  const [filterOpen, setFilterOpen] = useState(false)

  if (error) return <FullScreenError message={error} onRetry={refetch} />

  return (
    <YStack flex={1} bg="$background">
      <HerbariumGrid
        scans={scans}
        signedUrls={signedUrls}
        loading={loading}
        onFilterPress={() => setFilterOpen(true)}
      />
      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </YStack>
  )
}
```

---

## Data Fetching Pattern

Use custom hooks for all data fetching. Never fetch directly inside a screen component.

```ts
// hooks/useHerbariumScans.ts
import { useState, useEffect, useCallback } from 'react'
import { fetchHerbariumScans, getSignedUrl } from '../lib/herbarium'
import { useAuthStore } from '../stores/authStore'
import { useHerbariumStore } from '../stores/herbariumStore'
import { getUserFriendlyMessage } from '../lib/errorMessages'
import { logError } from '../lib/logger'
import { ScanRecord } from '../types/scan'

export function useHerbariumScans() {
  const session = useAuthStore((s) => s.session)
  const filters = useHerbariumStore((s) => s.filters)

  const [scans, setScans] = useState<ScanRecord[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHerbariumScans(session.user.id, filters)
      setScans(data)
      // Fetch signed URLs in parallel
      const urlEntries = await Promise.all(
        data.map(async (scan) => {
          const url = await getSignedUrl(scan.image_url)
          return [scan.image_url, url] as const
        })
      )
      setSignedUrls(Object.fromEntries(urlEntries))
    } catch (err) {
      logError('useHerbariumScans', err)
      setError(getUserFriendlyMessage(err))
    } finally {
      setLoading(false)
    }
  }, [session?.user.id, filters])

  useEffect(() => { fetch() }, [fetch])

  return { scans, signedUrls, loading, error, refetch: fetch }
}
```

**Rules:**
- Custom hook name starts with `use`
- Returns `{ data, loading, error, refetch }` shape
- All errors mapped through `getUserFriendlyMessage`
- All errors logged with `logError`
- `refetch` is always exposed for retry actions

---

## Zustand Store Pattern

```ts
// stores/scanStore.ts
import { create } from 'zustand'
import { AnalysisResult } from '../types/scan'

type ScanStatus = 'idle' | 'capturing' | 'uploading' | 'analyzing' | 'results' | 'error' | 'not_a_facade'

interface ScanState {
  status: ScanStatus
  localPhotoUri: string | null       // retained for retry
  imagePath: string | null           // Supabase Storage path
  scanId: string | null
  analysis: AnalysisResult | null
  errorMessage: string | null

  // Actions
  setCapturing: (uri: string) => void
  setUploading: () => void
  setAnalyzing: (path: string) => void
  setResults: (scanId: string, analysis: AnalysisResult) => void
  setError: (message: string) => void
  setNotAFacade: () => void
  reset: () => void
}

const initialState = {
  status: 'idle' as ScanStatus,
  localPhotoUri: null,
  imagePath: null,
  scanId: null,
  analysis: null,
  errorMessage: null,
}

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,

  setCapturing: (uri) => set({ status: 'capturing', localPhotoUri: uri }),
  setUploading: () => set({ status: 'uploading' }),
  setAnalyzing: (path) => set({ status: 'analyzing', imagePath: path }),
  setResults: (scanId, analysis) => set({ status: 'results', scanId, analysis }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  setNotAFacade: () => set({ status: 'not_a_facade' }),
  reset: () => set(initialState),
}))
```

**Rules:**
- Store initial state is a const object — reuse it in `reset()`
- Actions are named as verbs: `setX`, `clearX`, `resetX`
- Selectors use single accessor: `useStore(s => s.field)` — never destructure
- No async logic in stores — async lives in hooks or lib functions

---

## Navigation Guards

Protected routes check auth state before rendering:

```tsx
// components/shared/ProtectedRoute.tsx
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const session = useAuthStore((s) => s.session)

  useEffect(() => {
    if (session === null) {
      router.replace('/(auth)/sign-in')
    }
  }, [session])

  // Don't render children until we know auth state
  if (session === null) return null

  return <>{children}</>
}
```

Use in screens that require auth:
```tsx
export default function HerbariumScreen() {
  return (
    <ProtectedRoute>
      {/* screen content */}
    </ProtectedRoute>
  )
}
```

---

## Loading State Pattern

Every screen with async data has three states: loading, error, content.

```tsx
// Standard three-state pattern
export default function SomeScreen() {
  const { data, loading, error, refetch } = useSomeData()

  // Error state
  if (error) {
    return <FullScreenError message={error} onRetry={refetch} />
  }

  // Loading state (skeleton or spinner)
  if (loading && data.length === 0) {
    return <SomeSkeleton />
  }

  // Content state (may still have loading=true for refresh)
  return (
    <SomeList
      data={data}
      refreshing={loading}
      onRefresh={refetch}
    />
  )
}
```

**Never block the whole screen with a spinner after initial data loads** — use pull-to-refresh or background refresh instead.

---

## Optimistic Updates

For the "Save to Herbarium" action, update UI immediately before the network request completes:

```tsx
const handleSave = async () => {
  // Optimistic: update UI immediately
  setSaved(true)

  try {
    await supabase.from('scans').update({ saved: true }).eq('id', scanId)
  } catch (err) {
    // Rollback on failure
    setSaved(false)
    setError(getUserFriendlyMessage(err))
    logError('handleSave', err)
  }
}
```

Use optimistic updates for:
- Save / unsave actions
- Tag additions
- User notes

Do NOT use optimistic updates for:
- Photo uploads (size/time unpredictable)
- AI analysis (result unknown until complete)
- Auth operations

---

## Component Size Rules

| Rule | Limit |
|---|---|
| Max lines per component file | 200 lines |
| Max props per component | 6 props |
| Max nesting depth (JSX) | 5 levels |

When a component exceeds these, extract sub-components. Signs you need to split:
- Multiple `useState` hooks for unrelated state
- A `useEffect` block that doesn't relate to the component's primary job
- Sections of JSX that could meaningfully stand alone

---

## Hooks vs Lib Functions

| Use a hook when... | Use a lib function when... |
|---|---|
| You need React state or effects | Pure data transformation |
| You need to observe store changes | API calls (called from hooks) |
| You need to respond to lifecycle | Utility functions |
| You need to expose loading/error | Database queries |

```ts
// lib/herbarium.ts — pure async function, no React
export async function fetchHerbariumScans(userId: string, filters: HerbariumFilters) { ... }

// hooks/useHerbariumScans.ts — React wrapper with state
export function useHerbariumScans() {
  const [scans, setScans] = useState([])
  // ...calls fetchHerbariumScans from lib
}
```

---

## Supabase Query Patterns

### Select with explicit fields (preferred)
```ts
const { data, error } = await supabase
  .from('scans')
  .select('id, image_url, building_summary, captured_at, building_address')
  .eq('user_id', userId)
  .eq('saved', true)
  .order('captured_at', { ascending: false })
```

### Insert and get back the new row
```ts
const { data, error } = await supabase
  .from('scans')
  .insert({ ...scanData })
  .select('id')
  .single()
```

### Update with check
```ts
const { error } = await supabase
  .from('scans')
  .update({ saved: true })
  .eq('id', scanId)
  .eq('user_id', userId)  // always scope to user for safety

if (error) throw error
```

### Never ignore the error tuple
```ts
// Wrong
const { data } = await supabase.from('scans').select('*')

// Correct
const { data, error } = await supabase.from('scans').select('*')
if (error) throw error
```

---

## Expo Router Navigation Patterns

```ts
import { useRouter, useLocalSearchParams } from 'expo-router'

// Navigate to a screen
router.push('/scan/results')

// Replace (no back stack — use for auth redirects)
router.replace('/(auth)/sign-in')

// Pass params
router.push({ pathname: '/scan/[id]', params: { id: scanId } })

// Receive params
const { id } = useLocalSearchParams<{ id: string }>()
```

**Deep link scheme:** `facadelens://`
Configured in `app.json` under `scheme: "facadelens"`.

---

## TypeScript Strict Patterns

```ts
// Type narrowing for unknown errors
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Unknown error'
}

// Exhaustive switch (use for state machines)
function renderScanState(state: ScanStatus): React.ReactNode {
  switch (state) {
    case 'idle': return <CameraView />
    case 'uploading': return <AnalyzingOverlay />
    case 'analyzing': return <AnalyzingOverlay />
    case 'results': return <OverlayCanvas />
    case 'error': return <FullScreenError />
    case 'not_a_facade': return <NotAFacadeError />
    default:
      // This line catches unhandled cases at compile time
      const _exhaustive: never = state
      return null
  }
}
```

---

## Performance Notes

- **FlatList keyExtractor:** Always use a stable unique ID — never array index
- **Image loading:** Use `FastImage` (or Expo Image) for Herbarium thumbnails — it handles caching
- **Signed URLs:** Cache in component state — don't re-request on every render
- **Reanimated shared values:** Initialize outside render functions with `useSharedValue`
- **Zustand selectors:** Always select the minimum required slice — avoids unnecessary re-renders
