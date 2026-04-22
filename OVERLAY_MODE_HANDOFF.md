# FacadeLens — Overlay Mode Preference: Claude Code Handoff

**Feature:** User-selectable overlay display mode (Markers vs Diagram)
**Scope:** New store, new component, profile tab UI, OverlayCanvas integration
**Design principle:** Preference set once in Profile, persists across sessions. No per-scan toggle.

---

## Context

The anatomy overlay currently renders in "Diagram" mode: edge-aligned label chips with SVG
leader lines connecting to element centroids. A new "Marker" mode is being added: small
colored dots placed directly on each architectural element, tapped to reveal the
ElementDetailCard. Users choose their preferred mode in the Profile tab. Only one mode
is loaded and rendered at a time.

---

## Files to Create

```
stores/preferencesStore.ts        — Zustand store with AsyncStorage persistence
components/MarkerOverlay.tsx      — New marker-mode overlay component
```

## Files to Modify

```
components/OverlayCanvas.tsx      — Read preference, render correct overlay
app/(tabs)/profile.tsx            — Add Overlay Style preference section
```

---

## TASK 1: Create `stores/preferencesStore.ts`

Model this on the existing `stores/herbariumStore.ts` pattern, but add AsyncStorage
persistence so the preference survives app restarts.

```ts
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type OverlayMode = 'markers' | 'diagram'

interface PreferencesState {
  overlayMode: OverlayMode
  setOverlayMode: (mode: OverlayMode) => void
  init: () => Promise<void>
}

const STORAGE_KEY = 'prefs_overlay_mode'

export const usePreferencesStore = create<PreferencesState>((set) => ({
  overlayMode: 'markers',   // default: marker mode (cleaner first impression)
  setOverlayMode: async (mode) => {
    set({ overlayMode: mode })
    await AsyncStorage.setItem(STORAGE_KEY, mode)
  },
  init: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored === 'markers' || stored === 'diagram') {
      set({ overlayMode: stored })
    }
  },
}))
```

Call `usePreferencesStore.getState().init()` in `app/_layout.tsx` alongside the existing
`useThemeStore` init call:

```tsx
// In RootLayout useEffect (add after themeStore init):
const { init: initPrefs } = usePreferencesStore()
useEffect(() => { void initPrefs() }, [initPrefs])
```

---

## TASK 2: Create `components/MarkerOverlay.tsx`

Marker mode renders a colored circle at each element's centroid. Tapping opens the same
`ElementDetailCard` used in diagram mode. No leader lines, no edge labels.

Important: marker positions come from the same `LabelPosition[]` array already computed
by `computeLabelPositions()` — use `leaderEndX` and `leaderEndY` as the dot coordinates.
These are already in rendered container pixel space (not raw image pixels).

```tsx
import { Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack } from 'tamagui'
import type { ArchitecturalElement } from '../types/scan'
import { HIERARCHY_COLORS } from '../lib/overlayLayout'
import type { LabelPosition } from '../lib/overlayLayout'

const MARKER_RADIUS = 10          // tappable hit area radius
const MARKER_DOT_RADIUS = 5       // visual dot radius
const RING_RADIUS = 9             // outer ring radius
const STAGGER_MS = 60
const FADE_MS = 250

interface Props {
  positions: LabelPosition[]
  onMarkerPress: (element: ArchitecturalElement) => void
}

export function MarkerOverlay({ positions, onMarkerPress }: Props) {
  return (
    <YStack style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {positions.map((pos, i) => {
        const color = HIERARCHY_COLORS[pos.element.hierarchy]
        return (
          <Animated.View
            key={`${pos.element.name}-${i}-marker`}
            entering={FadeIn.delay(i * STAGGER_MS).duration(FADE_MS)}
            style={[
              styles.markerWrapper,
              {
                left: pos.leaderEndX - MARKER_RADIUS,
                top: pos.leaderEndY - MARKER_RADIUS,
              },
            ]}
          >
            <Pressable
              onPress={() => onMarkerPress(pos.element)}
              hitSlop={8}
              style={styles.pressable}
            >
              {/* Outer ring */}
              <YStack
                width={RING_RADIUS * 2}
                height={RING_RADIUS * 2}
                br={RING_RADIUS}
                borderWidth={1.5}
                borderColor={color}
                opacity={0.6}
                ai="center"
                jc="center"
                position="absolute"
                top={MARKER_RADIUS - RING_RADIUS}
                left={MARKER_RADIUS - RING_RADIUS}
              />
              {/* Filled dot */}
              <YStack
                width={MARKER_DOT_RADIUS * 2}
                height={MARKER_DOT_RADIUS * 2}
                br={MARKER_DOT_RADIUS}
                bg={color}
                opacity={0.9}
                position="absolute"
                top={MARKER_RADIUS - MARKER_DOT_RADIUS}
                left={MARKER_RADIUS - MARKER_DOT_RADIUS}
              />
            </Pressable>
          </Animated.View>
        )
      })}
    </YStack>
  )
}

const styles = StyleSheet.create({
  markerWrapper: {
    position: 'absolute',
    width: MARKER_RADIUS * 2,
    height: MARKER_RADIUS * 2,
  },
  pressable: {
    width: MARKER_RADIUS * 2,
    height: MARKER_RADIUS * 2,
  },
})
```

---

## TASK 3: Update `components/OverlayCanvas.tsx`

Read `overlayMode` from `usePreferencesStore` and conditionally render either
`MarkerOverlay` or `LeaderLineOverlay`. Both receive the same `positions` array and the
same `onLabelPress` / `onMarkerPress` handler (they do the same thing — open
ElementDetailCard).

```tsx
// Add to existing imports:
import { usePreferencesStore } from '../stores/preferencesStore'
import { MarkerOverlay } from './MarkerOverlay'

// Inside OverlayCanvas component, before return:
const overlayMode = usePreferencesStore((s) => s.overlayMode)

// In the render, replace the hardcoded LeaderLineOverlay with:
{overlayMode === 'diagram' ? (
  <LeaderLineOverlay
    positions={positions}
    containerWidth={containerWidth}
    onLabelPress={handleElementPress}
  />
) : (
  <MarkerOverlay
    positions={positions}
    onMarkerPress={handleElementPress}
  />
)}
```

No other changes to OverlayCanvas are needed.

---

## TASK 4: Update `app/(tabs)/profile.tsx`

Add an "Overlay Style" section to the profile tab. Place it above or below the existing
display preferences (theme, etc.). Use the same visual pattern as other settings rows.

The two options are presented as selectable rows, not a toggle switch, consistent with
how similar preference screens work in iOS Settings.

```tsx
// Add to imports:
import { usePreferencesStore, type OverlayMode } from '../../stores/preferencesStore'
import { MapPin, BookOpen } from 'phosphor-react-native'

// Inside the profile screen component:
const overlayMode = usePreferencesStore((s) => s.overlayMode)
const setOverlayMode = usePreferencesStore((s) => s.setOverlayMode)

// Section UI — add within the settings scroll view:
<YStack gap="$2">
  <Text fos={13} fw="700" color="#c8a96e" tt="uppercase" ls={1.2}>
    Overlay Style
  </Text>
  <Text fos={13} color="$colorMuted" mb="$2">
    How architectural elements are shown when you scan a building.
  </Text>

  {/* Markers option */}
  <Pressable onPress={() => setOverlayMode('markers')}>
    <XStack
      bg="$backgroundStrong"
      br="$4"
      borderWidth={1}
      borderColor={overlayMode === 'markers' ? '#c8a96e' : '$borderColor'}
      p="$4"
      gap="$3"
      ai="center"
    >
      <MapPin
        size={20}
        color={overlayMode === 'markers' ? '#c8a96e' : '#888880'}
        weight={overlayMode === 'markers' ? 'fill' : 'regular'}
      />
      <YStack flex={1} gap="$1">
        <Text fos={15} color="$color" fw="600">Markers</Text>
        <Text fos={13} color="$colorMuted">
          Colored dots on each feature. Tap to learn more.
        </Text>
      </YStack>
      {overlayMode === 'markers' && (
        <Circle size={8} color="#c8a96e" weight="fill" />
      )}
    </XStack>
  </Pressable>

  {/* Diagram option */}
  <Pressable onPress={() => setOverlayMode('diagram')}>
    <XStack
      bg="$backgroundStrong"
      br="$4"
      borderWidth={1}
      borderColor={overlayMode === 'diagram' ? '#c8a96e' : '$borderColor'}
      p="$4"
      gap="$3"
      ai="center"
    >
      <BookOpen
        size={20}
        color={overlayMode === 'diagram' ? '#c8a96e' : '#888880'}
        weight={overlayMode === 'diagram' ? 'fill' : 'regular'}
      />
      <YStack flex={1} gap="$1">
        <Text fos={15} color="$color" fw="600">Diagram</Text>
        <Text fos={13} color="$colorMuted">
          Labeled annotations with lines to each feature.
        </Text>
      </YStack>
      {overlayMode === 'diagram' && (
        <Circle size={8} color="#c8a96e" weight="fill" />
      )}
    </XStack>
  </Pressable>
</YStack>
```

Note: `Circle` here refers to the Phosphor icon `Circle`, not an SVG element.
Import: `import { MapPin, BookOpen, Circle } from 'phosphor-react-native'`

---

## Design Notes

- Default is `'markers'` — cleaner first impression for new users
- Both modes open the same `ElementDetailCard` on tap — no divergence in the detail layer
- The hierarchy color legend (Structure / Cladding / Ornament) should remain visible in
  both modes — it lives in `OverlayCanvas` and is mode-agnostic
- Marker dots use `opacity={0.9}` for the fill and `opacity={0.6}` for the outer ring —
  this gives depth without obscuring the building surface behind them
- Do not add any label text to markers — the point is a clean image

---

## Validation

After implementation:

1. Open Profile tab → confirm "Overlay Style" section renders with two selectable rows
2. Select "Markers" → scan or open a saved scan → confirm only dots appear, no leader lines
3. Select "Diagram" → open a scan → confirm leader lines and label chips appear, no dots
4. Kill the app and reopen → confirm the selected mode persisted via AsyncStorage
5. Tap a marker in Markers mode → confirm ElementDetailCard opens correctly
6. Tap a label chip in Diagram mode → confirm ElementDetailCard opens correctly
