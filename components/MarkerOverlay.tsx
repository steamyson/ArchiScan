import { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack } from 'tamagui'
import type { ArchitecturalElement } from '../types/scan'
import { HIERARCHY_COLORS } from '../lib/overlayLayout'
import type { LabelPosition } from '../lib/overlayLayout'

const MARKER_RADIUS = 10
const MARKER_DOT_RADIUS = 5
const RING_RADIUS = 9
const STAGGER_MS = 60
const FADE_MS = 250
const MIN_MARKER_GAP = 26
const CLUSTER_ITERATIONS = 10
const TETHER_STRENGTH = 0.22
const EDGE_PADDING = MARKER_RADIUS + 2

interface Props {
  positions: LabelPosition[]
  containerWidth: number
  containerHeight: number
  onMarkerPress: (element: ArchitecturalElement) => void
}

interface MarkerPoint {
  x: number
  y: number
  ox: number
  oy: number
}

function spreadMarkerPoints(
  positions: LabelPosition[],
  containerWidth: number,
  containerHeight: number,
): MarkerPoint[] {
  const points: MarkerPoint[] = positions.map((pos) => ({
    x: pos.leaderEndX,
    y: pos.leaderEndY,
    ox: pos.leaderEndX,
    oy: pos.leaderEndY,
  }))

  const minDistSq = MIN_MARKER_GAP * MIN_MARKER_GAP
  for (let iter = 0; iter < CLUSTER_ITERATIONS; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let distSq = dx * dx + dy * dy

        if (distSq >= minDistSq) {
          continue
        }

        if (distSq < 0.0001) {
          const angle = (i + j + 1) * 1.618
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          distSq = dx * dx + dy * dy
        }

        const dist = Math.sqrt(distSq)
        const overlap = (MIN_MARKER_GAP - dist) * 0.5
        const nx = dx / dist
        const ny = dy / dist

        a.x -= nx * overlap
        a.y -= ny * overlap
        b.x += nx * overlap
        b.y += ny * overlap
      }
    }

    for (const point of points) {
      // Pull each marker back toward its true feature centroid.
      point.x += (point.ox - point.x) * TETHER_STRENGTH
      point.y += (point.oy - point.y) * TETHER_STRENGTH
      point.x = Math.max(EDGE_PADDING, Math.min(containerWidth - EDGE_PADDING, point.x))
      point.y = Math.max(EDGE_PADDING, Math.min(containerHeight - EDGE_PADDING, point.y))
    }
  }

  return points
}

export function MarkerOverlay({ positions, containerWidth, containerHeight, onMarkerPress }: Props) {
  const markerPoints = useMemo(
    () => spreadMarkerPoints(positions, containerWidth, containerHeight),
    [positions, containerWidth, containerHeight],
  )

  return (
    <YStack style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {positions.map((pos, i) => {
        const point = markerPoints[i]
        const color = HIERARCHY_COLORS[pos.element.hierarchy]
        return (
          <Animated.View
            key={`${pos.element.name}-${i}-marker`}
            entering={FadeIn.delay(i * STAGGER_MS).duration(FADE_MS)}
            style={[
              styles.markerWrapper,
              {
                left: point.x - MARKER_RADIUS,
                top: point.y - MARKER_RADIUS,
              },
            ]}
          >
            <Pressable
              onPress={() => onMarkerPress(pos.element)}
              hitSlop={8}
              style={styles.pressable}
            >
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
