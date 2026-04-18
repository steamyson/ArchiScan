# M3 — Anatomy Overlay

**App:** FacadeLens
**Milestone:** M3 (Overlay Rendering)
**Goal:** Render the Anatomy Overlay: SVG leader lines connecting edge labels to architectural elements on the still captured image. Staggered animated entrance via Reanimated. Tap any label to open an ElementDetailCard bottom sheet.

**Depends on:** M2 complete (scan record exists, `overlay_data.elements` available)

---

## Deliverables

1. Still captured photo fills the screen
2. SVG leader lines from edge labels into approximate element zones
3. Labels color-coded by hierarchy (primary / secondary / ornamental)
4. Staggered fade-in animation (Reanimated) as labels appear after analysis
5. Tap label → animated bottom sheet `ElementDetailCard` with definition, period context, confidence
6. Dismiss card by tapping outside or dragging down

---

## New Files

```
components/
├── OverlayCanvas.tsx         # Parent — positions image + SVG layer
├── LeaderLineOverlay.tsx     # SVG drawing of all leader lines + labels
├── ElementLabel.tsx          # Individual label component (tappable)
└── ElementDetailCard.tsx     # Animated bottom sheet detail view
lib/
└── overlayLayout.ts          # Layout algorithm: centroid → gutter position
types/
└── overlay.ts                # Overlay-specific types (label positions)
```

---

## Design: Leader-Line Annotation Style

Vision LLMs return bounding box coordinates accurate to ±5–15% of image dimensions — spatially approximate, not pixel-precise. Rather than rendering imprecise bounding boxes, V1 uses a **leader-line approach** inspired by architectural drawing conventions:

- Labels are arranged in two vertical gutters along the left and right edges of the image
- A thin hairline connects each label to the centroid of its bounding box zone
- This is visually elegant, tolerant of coordinate imprecision, and consistent with architectural field-guide conventions

---

## lib/overlayLayout.ts — Layout Algorithm

```ts
import { ArchitecturalElement } from '../types/scan'

export interface LabelPosition {
  element: ArchitecturalElement
  side: 'left' | 'right'
  leaderEndX: number       // x pixel on image where leader line terminates
  leaderEndY: number       // y pixel on image
  labelY: number           // final y position of label after collision spreading
}

/**
 * Assigns each element to left or right gutter based on bounding box centroid.
 * Spreads labels vertically to avoid collisions.
 */
export function computeLabelPositions(
  elements: ArchitecturalElement[],
  imageWidth: number,
  imageHeight: number
): LabelPosition[] {
  const LABEL_HEIGHT = 28
  const MIN_SPACING = 6

  const positions: LabelPosition[] = elements.map((el) => {
    const cx = ((el.bounding_box.x_min_pct + el.bounding_box.x_max_pct) / 2 / 100) * imageWidth
    const cy = ((el.bounding_box.y_min_pct + el.bounding_box.y_max_pct) / 2 / 100) * imageHeight
    return {
      element: el,
      side: cx < imageWidth / 2 ? 'left' : 'right',
      leaderEndX: cx,
      leaderEndY: cy,
      labelY: cy,
    }
  })

  // Spread collision for each side separately
  for (const side of ['left', 'right'] as const) {
    const sideLabels = positions.filter((p) => p.side === side)
    sideLabels.sort((a, b) => a.leaderEndY - b.leaderEndY)

    for (let i = 1; i < sideLabels.length; i++) {
      const prev = sideLabels[i - 1]
      const curr = sideLabels[i]
      const minY = prev.labelY + LABEL_HEIGHT + MIN_SPACING
      if (curr.labelY < minY) curr.labelY = minY
    }
  }

  return positions
}
```

---

## Hierarchy Color System

```ts
// lib/hierarchyColors.ts
export const HIERARCHY_COLORS = {
  primary_structure:    '#c8a96e',  // warm gold
  secondary_cladding:   '#7eb8c4',  // cool blue-grey
  ornamental_detail:    '#b87db8',  // muted violet
} as const

export const HIERARCHY_LABELS = {
  primary_structure:    'Structure',
  secondary_cladding:   'Cladding',
  ornamental_detail:    'Ornament',
} as const
```

---

## components/LeaderLineOverlay.tsx

```tsx
import Svg, { Line, Circle } from 'react-native-svg'
import { View, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated'
import { LabelPosition } from '../lib/overlayLayout'
import { ElementLabel } from './ElementLabel'
import { HIERARCHY_COLORS } from '../lib/hierarchyColors'
import { ArchitecturalElement } from '../types/scan'

const GUTTER_WIDTH = 110
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface Props {
  positions: LabelPosition[]
  imageWidth: number
  imageHeight: number
  onLabelPress: (element: ArchitecturalElement) => void
}

export function LeaderLineOverlay({ positions, imageWidth, imageHeight, onLabelPress }: Props) {
  const scaleX = SCREEN_WIDTH / imageWidth
  const scaleY = SCREEN_HEIGHT / imageHeight

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* SVG leader lines layer */}
      <Svg style={StyleSheet.absoluteFill}>
        {positions.map((pos, i) => {
          const scaledEndX = pos.leaderEndX * scaleX
          const scaledEndY = pos.leaderEndY * scaleY
          const labelX = pos.side === 'left' ? GUTTER_WIDTH : SCREEN_WIDTH - GUTTER_WIDTH
          const color = HIERARCHY_COLORS[pos.element.hierarchy]

          return (
            <Animated.View key={pos.element.name + i} entering={FadeIn.delay(i * 80).duration(300)}>
              <Line
                x1={labelX}
                y1={pos.labelY}
                x2={scaledEndX}
                y2={scaledEndY}
                stroke={color}
                strokeWidth={0.8}
                opacity={0.7}
              />
              <Circle cx={scaledEndX} cy={scaledEndY} r={3} fill={color} opacity={0.9} />
            </Animated.View>
          )
        })}
      </Svg>

      {/* Label layer */}
      {positions.map((pos, i) => (
        <Animated.View
          key={pos.element.name + i + 'label'}
          entering={FadeIn.delay(i * 80 + 100).duration(300)}
          style={[
            styles.labelWrapper,
            {
              top: pos.labelY - 14,
              left: pos.side === 'left' ? 4 : undefined,
              right: pos.side === 'right' ? 4 : undefined,
            },
          ]}
        >
          <ElementLabel
            element={pos.element}
            onPress={() => onLabelPress(pos.element)}
          />
        </Animated.View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  labelWrapper: { position: 'absolute', width: GUTTER_WIDTH - 8 },
})
```

---

## components/ElementLabel.tsx

```tsx
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from 'tamagui'
import { ArchitecturalElement } from '../types/scan'
import { HIERARCHY_COLORS } from '../lib/hierarchyColors'

interface Props {
  element: ArchitecturalElement
  onPress: () => void
}

export function ElementLabel({ element, onPress }: Props) {
  const color = HIERARCHY_COLORS[element.hierarchy]
  return (
    <TouchableOpacity onPress={onPress} style={[styles.label, { borderColor: color }]}>
      <Text fos={10} color={color} numberOfLines={1} fw="600">
        {element.name}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  label: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(10,10,10,0.75)',
  },
})
```

---

## components/ElementDetailCard.tsx

```tsx
import { useEffect } from 'react'
import { Dimensions, TouchableWithoutFeedback, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { YStack, XStack, Text, Separator } from 'tamagui'
import { ArchitecturalElement } from '../types/scan'
import { HIERARCHY_COLORS, HIERARCHY_LABELS } from '../lib/hierarchyColors'
import { ArrowDown } from 'phosphor-react-native'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const CARD_HEIGHT = 320
const SNAP_DOWN = CARD_HEIGHT + 40

interface Props {
  element: ArchitecturalElement | null
  onDismiss: () => void
}

export function ElementDetailCard({ element, onDismiss }: Props) {
  const translateY = useSharedValue(SNAP_DOWN)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (element) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 })
      backdropOpacity.value = withTiming(0.5, { duration: 250 })
    } else {
      translateY.value = withSpring(SNAP_DOWN)
      backdropOpacity.value = withTiming(0)
    }
  }, [element])

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY
    })
    .onEnd((e) => {
      if (e.translationY > 80) {
        translateY.value = withTiming(SNAP_DOWN)
        backdropOpacity.value = withTiming(0)
        runOnJS(onDismiss)()
      } else {
        translateY.value = withSpring(0)
      }
    })

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  if (!element) return null

  const color = HIERARCHY_COLORS[element.hierarchy]
  const confidenceColor = element.confidence === 'high' ? '#6bc96e' : element.confidence === 'medium' ? '#c8a96e' : '#c96e6e'

  return (
    <>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]} />
      </TouchableWithoutFeedback>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Drag handle */}
          <YStack ai="center" pt="$2" pb="$3">
            <YStack w={36} h={4} br={2} bg="$borderColor" />
          </YStack>

          <YStack px="$5" gap="$3" flex={1}>
            <XStack ai="center" jc="space-between">
              <Text fos={20} fw="700" color="$color">{element.name}</Text>
              <Text fos={11} color={color} fw="600">{HIERARCHY_LABELS[element.hierarchy]}</Text>
            </XStack>

            <Separator borderColor="$borderColor" />

            <Text fos={14} color="$colorMuted" lh={22}>{element.definition}</Text>

            <XStack ai="center" gap="$2" mt="$2">
              <Text fos={12} color="$colorMuted">Confidence:</Text>
              <Text fos={12} color={confidenceColor} fw="600">
                {element.confidence.charAt(0).toUpperCase() + element.confidence.slice(1)}
              </Text>
            </XStack>
          </YStack>
        </Animated.View>
      </GestureDetector>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
})
```

---

## components/OverlayCanvas.tsx (M3 screen entry point)

```tsx
import { useState } from 'react'
import { View, Image, StyleSheet, Dimensions } from 'react-native'
import { computeLabelPositions } from '../lib/overlayLayout'
import { LeaderLineOverlay } from './LeaderLineOverlay'
import { ElementDetailCard } from './ElementDetailCard'
import { ArchitecturalElement } from '../types/scan'
import { ScanRecord } from '../types/scan'

interface Props {
  scan: ScanRecord
  imageUri: string   // local URI or signed Storage URL
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export function OverlayCanvas({ scan, imageUri }: Props) {
  const [selectedElement, setSelectedElement] = useState<ArchitecturalElement | null>(null)

  const elements = scan.overlay_data?.elements ?? []
  const positions = computeLabelPositions(elements, SCREEN_WIDTH, SCREEN_HEIGHT)

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <LeaderLineOverlay
        positions={positions}
        imageWidth={SCREEN_WIDTH}
        imageHeight={SCREEN_HEIGHT}
        onLabelPress={setSelectedElement}
      />
      <ElementDetailCard
        element={selectedElement}
        onDismiss={() => setSelectedElement(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
})
```

---

## Gotchas

**Symmetrical facades:** The left/right centroid split heuristic works well on most facades but may cluster all labels on one side for perfectly centered compositions. If this is observed frequently during testing, add a secondary split by vertical thirds.

**Long element names:** Some names ("Decorative Terracotta Spandrel Panel") overflow a 110px gutter. Enforce `numberOfLines={1}` on labels and truncate with ellipsis. Full name appears in the detail card.

**SVG + Reanimated:** Wrap individual SVG elements in `Animated.View` and use `FadeIn` from Reanimated for entrance. Avoid animating SVG attributes directly — use opacity on the wrapper.

---

## Done Criteria

- [ ] Still captured photo fills the screen after analysis completes
- [ ] Leader lines render from correct label positions to approximate element zones
- [ ] Labels appear with staggered fade-in animation (80ms per label)
- [ ] Labels are color-coded by hierarchy (gold / blue-grey / violet)
- [ ] Tapping a label opens the ElementDetailCard bottom sheet
- [ ] Bottom sheet shows element name, definition, hierarchy, confidence
- [ ] Bottom sheet dismisses on tap outside or downward drag
- [ ] No label collisions (vertical spreading algorithm working)
- [ ] Works on both iOS and Android
