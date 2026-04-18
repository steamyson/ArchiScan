# FacadeLens — Error Handling & Logging

**Purpose:** Consistent error handling patterns across all milestones. Read this before writing any async operation, network call, or user-facing error state.

---

## Core Principle

Every error has three jobs:
1. **Don't crash the app**
2. **Tell the user something useful** (what happened, what they can do)
3. **Tell you something useful** (what failed, where, why — for debugging)

Never swallow errors silently. Never show raw error messages to users. Never use `Alert.alert` — it looks native/ugly and breaks the app's visual language.

---

## Error Categories

| Category | Examples | User sees | Dev sees |
|---|---|---|---|
| **Network / connectivity** | Upload fails, API timeout | "Check your connection and try again" + Retry button | Full error + stack in Sentry |
| **AI pipeline** | Gemini API error, rate limit, bad response | "Analysis failed. Try again." + Retry | Edge Function logs + error type |
| **Not a facade** | Non-building photo | "No facade detected. Frame a building exterior." | `not_a_facade` signal in response |
| **Auth** | Session expired, invalid token | Redirect to sign-in silently | Auth error type in logs |
| **Storage** | Upload fails, signed URL error | "Could not load image. Try again." | Storage error + path |
| **Parse error** | Gemini returns malformed JSON | "Analysis failed. Try again." | Raw response logged |
| **Permission denied** | Camera, location not granted | Inline permission request UI | Permission status logged |

---

## Standard Async Pattern

Use this pattern for every async operation in the app:

```tsx
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleAction = async () => {
  setLoading(true)
  setError(null)
  try {
    await doSomething()
  } catch (err) {
    const message = getUserFriendlyMessage(err)
    setError(message)
    logError('handleAction', err)
  } finally {
    setLoading(false)
  }
}
```

---

## Error Message Mapping

Never show raw error strings to users. Map errors to friendly messages:

```ts
// lib/errorMessages.ts

export function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()

    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Check your connection and try again.'
    }
    if (msg.includes('timeout')) {
      return 'The request took too long. Try again.'
    }
    if (msg.includes('unauthorized') || msg.includes('401')) {
      return 'Your session has expired. Please sign in again.'
    }
    if (msg.includes('storage') || msg.includes('upload')) {
      return 'Could not upload the photo. Try again.'
    }
    if (msg.includes('gemini') || msg.includes('api')) {
      return 'Analysis failed. Try scanning again.'
    }
    if (msg.includes('parse') || msg.includes('json')) {
      return 'Analysis returned an unexpected result. Try again.'
    }
  }
  return 'Something went wrong. Try again.'
}
```

---

## Logging Utility

```ts
// lib/logger.ts
const IS_DEV = __DEV__

export function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  if (IS_DEV) {
    console.error(`[${context}]`, message, extra ?? '')
    if (stack) console.error(stack)
  }

  // Production: send to Sentry (add in M6)
  // Sentry.captureException(err, { tags: { context }, extra })
}

export function logInfo(context: string, message: string, data?: unknown) {
  if (IS_DEV) {
    console.log(`[${context}]`, message, data ?? '')
  }
}
```

Install Sentry in M6: `npx expo install @sentry/react-native`

---

## Error UI Components

### Inline Error Banner

For errors that occur within a screen flow (e.g., form submission failure):

```tsx
// components/ErrorBanner.tsx
import { XStack, Text } from 'tamagui'
import { Warning } from 'phosphor-react-native'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <XStack
      bg="rgba(201, 110, 110, 0.12)"
      borderWidth={1}
      borderColor="#c96e6e"
      br="$3"
      p="$3"
      ai="center"
      gap="$2"
    >
      <Warning size={16} color="#c96e6e" weight="fill" />
      <Text fos={13} color="#c96e6e" flex={1}>{message}</Text>
      {onRetry && (
        <Text fos={13} color="#c96e6e" fw="600" onPress={onRetry}>
          Retry
        </Text>
      )}
    </XStack>
  )
}
```

### Full-Screen Error State

For errors that replace the entire screen (e.g., analysis failed):

```tsx
// components/FullScreenError.tsx
import { YStack, Text, Button } from 'tamagui'
import { Warning } from 'phosphor-react-native'

interface Props {
  message: string
  onRetry: () => void
}

export function FullScreenError({ message, onRetry }: Props) {
  return (
    <YStack flex={1} bg="$background" ai="center" jc="center" px="$8" gap="$5">
      <Warning size={48} color="#888880" weight="thin" />
      <Text fos={16} color="$color" fw="600" ta="center">{message}</Text>
      <Button
        onPress={onRetry}
        bg="transparent"
        borderWidth={1}
        borderColor="$borderColor"
        br="$3"
        h={44}
        px="$6"
      >
        <Text color="$color" fos={14}>Try Again</Text>
      </Button>
    </YStack>
  )
}
```

---

## Scan Pipeline Error Handling

The scan pipeline has multiple failure points. Handle each explicitly:

```ts
// Scan state machine
type ScanState =
  | { status: 'camera' }
  | { status: 'uploading' }
  | { status: 'analyzing' }
  | { status: 'results'; scanId: string }
  | { status: 'error'; message: string; retryFn: () => void }
  | { status: 'not_a_facade' }
```

### Stage 1 — Upload failure

```tsx
try {
  const imagePath = await uploadFacadePhoto(localPhotoUri)
  setScanState({ status: 'analyzing' })
  // continue to analysis...
} catch (err) {
  logError('uploadFacadePhoto', err)
  setScanState({
    status: 'error',
    message: 'Could not upload the photo. Check your connection.',
    retryFn: () => handleCapture(localPhotoUri),
  })
}
```

**Important:** Retain `localPhotoUri` in state. If upload fails, the user can retry without re-taking the photo. If they go offline, enqueue the scan (see M6 offline queue).

### Stage 2 — Analysis failure

```tsx
try {
  const { scanId, analysis } = await analyzeFacade({ imagePath, userId, location, address })

  if (analysis.building_summary.probable_style === 'not_a_facade') {
    setScanState({ status: 'not_a_facade' })
    return
  }

  setScanState({ status: 'results', scanId })
} catch (err) {
  logError('analyzeFacade', err)
  setScanState({
    status: 'error',
    message: 'Analysis failed. Try scanning again.',
    retryFn: () => analyzePhoto(imagePath),
  })
}
```

### Stage 3 — Overlay render failure

Overlay rendering is pure client-side computation — it shouldn't throw. But if `overlay_data` is malformed:

```tsx
const elements = scan.overlay_data?.elements ?? []
// If elements is empty, render an "Analysis incomplete" banner but still show the critique
```

---

## Auth Error Handling

Session expiry is silent — the user is redirected to sign-in without an error screen:

```ts
// lib/supabase.ts — in onAuthStateChange listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    setSession(session)
    if (!session) {
      // Redirect to sign-in
      router.replace('/(auth)/sign-in')
    }
  }
})
```

For Supabase query errors that return `401 Unauthorized`:

```ts
if (error?.status === 401) {
  // Force sign-out — session is invalid
  await supabase.auth.signOut()
  return
}
```

---

## Permission Errors

Camera and location permissions have dedicated UI (not error banners):

```tsx
// Camera permission — shown inside CameraView
if (!hasPermission) {
  return (
    <YStack flex={1} bg="$background" ai="center" jc="center" px="$8" gap="$4">
      <Camera size={48} color="#888880" weight="thin" />
      <Text fos={16} color="$color" fw="600" ta="center">
        Camera access required
      </Text>
      <Text fos={14} color="$colorMuted" ta="center" lh={22}>
        FacadeLens uses your camera to scan building facades.
      </Text>
      <Button onPress={requestPermission} bg="#c8a96e" br="$3" h={48} px="$8">
        <Text color="#0a0a0a" fw="600">Enable Camera</Text>
      </Button>
    </YStack>
  )
}
```

---

## Edge Function Error Responses

Edge Functions should return structured error responses — not raw exceptions:

```ts
// Standard error response shape
return new Response(
  JSON.stringify({
    error: true,
    code: 'GEMINI_API_ERROR',    // machine-readable
    message: 'Gemini API returned a non-200 response',  // for logging
    retryable: true,             // can the client retry?
  }),
  { status: 502, headers: { 'Content-Type': 'application/json' } }
)
```

Error codes:
| Code | HTTP Status | Retryable | Meaning |
|---|---|---|---|
| `MISSING_PARAMS` | 400 | No | Required fields missing |
| `IMAGE_DOWNLOAD_FAILED` | 500 | Yes | Storage download error |
| `GEMINI_API_ERROR` | 502 | Yes | Gemini returned non-200 |
| `JSON_PARSE_ERROR` | 500 | Yes | Gemini response not valid JSON |
| `DB_INSERT_FAILED` | 500 | Yes | Supabase insert error |
| `NOT_A_FACADE` | 200 | No | No facade detected (not an error — handled as a success case) |

---

## Production Logging (M6 — Sentry)

Add Sentry in M6 after core functionality is stable:

```bash
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative
```

What to capture:
- All `catch` blocks in the scan pipeline
- Edge Function errors (Sentry for Deno or Supabase logs)
- Navigation errors (Expo Router error boundary)
- Unhandled promise rejections (configure in Sentry init)

What NOT to capture:
- `not_a_facade` — this is expected user behavior
- Auth redirects — these are normal control flow
- Network errors when offline — expected, handled by queue

---

## Error Handling Checklist (per milestone)

Before marking a milestone done, verify:
- [ ] Every `await` call is inside a try/catch
- [ ] No empty catch blocks
- [ ] All errors map to user-friendly messages via `getUserFriendlyMessage`
- [ ] Loading state resets in `finally` block
- [ ] Retry action available for all network errors
- [ ] Errors logged with `logError` and meaningful context string
- [ ] No `Alert.alert` calls anywhere in the component tree
