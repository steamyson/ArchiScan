# M1 — Capture

**App:** FacadeLens
**Milestone:** M1 (Camera & Capture)
**Goal:** Functional camera screen using react-native-vision-camera v4. User can frame a facade, tap to focus, pinch to zoom, capture a photo, and upload it to Supabase Storage. Returns an image URL ready for M2.

**Depends on:** M0 complete (Supabase Storage bucket exists, auth working, Tamagui configured)

---

## Deliverables

1. Camera screen with live viewfinder (Vision Camera v4)
2. Tap-to-focus with animated focus ring (Reanimated)
3. Pinch-to-zoom (Reanimated gesture)
4. Capture button with haptic feedback
5. Image resized to 1500px wide before upload (bandwidth + AI cost)
6. Upload to Supabase Storage at `{user_id}/{uuid}.jpg`
7. GPS coordinates captured at moment of capture
8. Reverse geocoding converts GPS → human-readable address
9. Unauthenticated users can capture and see results; save to Herbarium is gated (M5)
10. Smooth transition from capture to loading state (Lottie overlay — see M2 for the Lottie "Reading the facade..." animation)

---

## New Files

```
app/
└── (tabs)/
    └── scan.tsx           # REPLACE placeholder with full camera screen
components/
├── CameraView.tsx         # Vision Camera wrapper with gestures
├── FocusRing.tsx          # Animated tap-to-focus indicator
└── CaptureButton.tsx      # Shutter button component
lib/
├── storage.ts             # Supabase Storage upload helper
└── geocoding.ts           # Reverse geocoding via Google Maps API
```

---

## react-native-vision-camera v4 Key APIs

```ts
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
} from 'react-native-vision-camera'

// Get back camera
const device = useCameraDevice('back')

// Permission
const { hasPermission, requestPermission } = useCameraPermission()

// Capture
const camera = useRef<Camera>(null)
const photo = await camera.current?.takePhoto({
  flash: 'off',
  enableShutterSound: false,
})
// photo.path is a local file URI

// Focus (call on tap gesture)
await camera.current?.focus({ x: tapX, y: tapY })

// Zoom (bind to Reanimated shared value)
<Camera zoom={zoomSharedValue} ... />
```

---

## components/CameraView.tsx

```tsx
import { useRef, useCallback } from 'react'
import { StyleSheet, Dimensions } from 'react-native'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { YStack, Text, Button } from 'tamagui'
import { FocusRing } from './FocusRing'
import { CaptureButton } from './CaptureButton'

const AnimatedCamera = Animated.createAnimatedComponent(Camera)
const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface CameraViewProps {
  onCapture: (photoPath: string) => void
}

export function CameraView({ onCapture }: CameraViewProps) {
  const device = useCameraDevice('back')
  const { hasPermission, requestPermission } = useCameraPermission()
  const camera = useRef<Camera>(null)

  // Zoom
  const zoom = useSharedValue(device?.neutralZoom ?? 1)
  const startZoom = useSharedValue(1)

  // Focus ring
  const focusX = useSharedValue(0)
  const focusY = useSharedValue(0)
  const focusVisible = useSharedValue(0)

  const animatedProps = useAnimatedProps(() => ({
    zoom: zoom.value,
  }))

  const handleFocus = useCallback(async (x: number, y: number) => {
    try {
      await camera.current?.focus({ x, y })
    } catch {}
  }, [])

  const tapGesture = Gesture.Tap().onEnd((e) => {
    focusX.value = e.x
    focusY.value = e.y
    focusVisible.value = 1
    runOnJS(handleFocus)(e.x, e.y)
  })

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => { startZoom.value = zoom.value })
    .onUpdate((e) => {
      const minZoom = device?.minZoom ?? 1
      const maxZoom = Math.min(device?.maxZoom ?? 5, 5)
      zoom.value = Math.min(Math.max(startZoom.value * e.scale, minZoom), maxZoom)
    })

  const composedGesture = Gesture.Simultaneous(tapGesture, pinchGesture)

  const handleCapture = useCallback(async () => {
    const photo = await camera.current?.takePhoto({ flash: 'off', enableShutterSound: false })
    if (photo?.path) onCapture(photo.path)
  }, [onCapture])

  if (!hasPermission) {
    return (
      <YStack flex={1} bg="$background" ai="center" jc="center" gap="$4">
        <Text color="$color" ta="center">FacadeLens needs camera access to scan buildings.</Text>
        <Button onPress={requestPermission} bg="$accent" color="white">Enable Camera</Button>
      </YStack>
    )
  }

  if (!device) return <YStack flex={1} bg="$background" />

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <AnimatedCamera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          animatedProps={animatedProps}
          photo={true}
        />
        <FocusRing x={focusX} y={focusY} visible={focusVisible} />
        <CaptureButton onPress={handleCapture} />
      </Animated.View>
    </GestureDetector>
  )
}
```

---

## components/FocusRing.tsx

```tsx
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSequence,
  SharedValue,
} from 'react-native-reanimated'
import { StyleSheet } from 'react-native'

interface FocusRingProps {
  x: SharedValue<number>
  y: SharedValue<number>
  visible: SharedValue<number>
}

const RING_SIZE = 70

export function FocusRing({ x, y, visible }: FocusRingProps) {
  const style = useAnimatedStyle(() => ({
    opacity: withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 800 })
    ),
    transform: [
      { translateX: x.value - RING_SIZE / 2 },
      { translateY: y.value - RING_SIZE / 2 },
      { scale: withSequence(withTiming(0.85, { duration: 150 }), withTiming(1, { duration: 200 })) },
    ],
  }))

  return <Animated.View style={[styles.ring, style]} />
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#c8a96e',
  },
})
```

---

## lib/storage.ts

```ts
import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'
import * as Crypto from 'expo-crypto'

/**
 * Resize photo to max 1500px wide, then upload to Supabase Storage.
 * Returns the public path string (not a signed URL — signing happens at display time).
 */
export async function uploadFacadePhoto(localUri: string): Promise<string> {
  const session = useAuthStore.getState().session
  if (!session) throw new Error('Not authenticated')

  // Resize to 1500px max width (keeps aspect ratio)
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1500 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  )

  // Read as base64
  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  const uuid = Crypto.randomUUID()
  const path = `${session.user.id}/${uuid}.jpg`

  const { error } = await supabase.storage
    .from('facade-photos')
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) throw error
  return path
}

// Base64 → Uint8Array
function decode(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
```

> **Why resize?** A typical iPhone photo is 4000px+ wide and 4-8MB. Resizing to 1500px reduces upload time, reduces Gemini API input token cost, and the AI doesn't need full-res to identify architectural elements.

---

## lib/geocoding.ts

```ts
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.results?.[0]) {
      return data.results[0].formatted_address
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
```

---

## GPS Capture

Install: `npx expo install expo-location`

```ts
import * as Location from 'expo-location'

export async function captureLocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  })
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  }
}
```

> **Request location permission contextually** at the moment of first capture, not on app launch. The permission prompt should appear after the user taps capture for the first time — include a brief rationale: "Location helps identify your building's address and neighborhood."

---

## Full Capture Flow (app/(tabs)/scan.tsx)

```tsx
type ScanState = 'camera' | 'uploading' | 'analyzing' | 'results'
```

State transitions:
1. `camera` → user sees viewfinder, taps capture
2. `uploading` → photo uploads to Supabase Storage, GPS captured, address geocoded
3. `analyzing` → Edge Function called (M2) — show Lottie loading animation
4. `results` → overlay + critique rendered (M3, M4)

In M1, stop at `uploading` and log the resulting storage path to confirm the pipeline works before wiring up M2.

---

## Done Criteria

- [ ] Camera viewfinder renders on the Scan tab (no black screen)
- [ ] Tap-to-focus ring animates at tap point
- [ ] Pinch-to-zoom changes zoom level smoothly
- [ ] Capture button takes a photo
- [ ] Photo is resized to ~1500px wide before upload
- [ ] Photo appears in Supabase Storage under `facade-photos/{user_id}/`
- [ ] GPS coordinates logged to console on capture
- [ ] Address string returned from reverse geocode (or fallback lat/lng string)
- [ ] Unauthenticated user can reach camera screen (save will be gated in M5)
