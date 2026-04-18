import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Separator, Text, XStack, YStack } from "tamagui";
import type { ArchitecturalElement, Confidence } from "../types/scan";
import { HIERARCHY_COLORS, HIERARCHY_LABELS } from "../lib/overlayLayout";

const CARD_HEIGHT = 320;
const SNAP_DOWN = CARD_HEIGHT + 40;
const DISMISS_THRESHOLD = 80;
const SPRING_CONFIG = { damping: 20, stiffness: 200 } as const;
const BACKDROP_TIMING = { duration: 250 } as const;
const EXIT_TIMING = { duration: 250 } as const;
const BACKDROP_OPACITY = 0.5;

interface Props {
  element: ArchitecturalElement | null;
  onDismiss: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "#6bc96e",
  medium: "#c8a96e",
  low: "#c96e6e",
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ElementDetailCard({ element, onDismiss }: Props) {
  const [displayed, setDisplayed] = useState<ArchitecturalElement | null>(element);
  const translateY = useSharedValue(SNAP_DOWN);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (element) {
      setDisplayed(element);
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, BACKDROP_TIMING);
    } else {
      backdropOpacity.value = withTiming(0, BACKDROP_TIMING);
      translateY.value = withTiming(SNAP_DOWN, EXIT_TIMING, (finished) => {
        if (finished) {
          runOnJS(setDisplayed)(null);
        }
      });
    }
  }, [element, translateY, backdropOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationY > DISMISS_THRESHOLD) {
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!displayed) {
    return null;
  }

  const color = HIERARCHY_COLORS[displayed.hierarchy];
  const hierarchyLabel = HIERARCHY_LABELS[displayed.hierarchy];
  const confidenceHex = CONFIDENCE_COLOR[displayed.confidence];

  return (
    <>
      <AnimatedPressable
        onPress={onDismiss}
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <YStack ai="center" pt="$2" pb="$3">
            <YStack width={36} height={4} borderRadius={2} backgroundColor="$borderColor" />
          </YStack>

          <YStack px="$5" gap="$3" flex={1}>
            <XStack ai="center" jc="space-between" gap="$3">
              <Text fos={20} fontWeight="700" color="$color" flex={1} numberOfLines={2}>
                {displayed.name}
              </Text>
              <Text fos={11} fontWeight="600" color={color} tt="uppercase" ls={1.2}>
                {hierarchyLabel}
              </Text>
            </XStack>

            <Separator borderColor="$borderColor" />

            <Text fos={14} lh={22} color="$colorMuted">
              {displayed.definition}
            </Text>

            <XStack ai="center" gap="$2" mt="$2">
              <Text fos={12} color="$colorMuted">
                Confidence:
              </Text>
              <Text fos={12} fontWeight="600" color={confidenceHex}>
                {titleCase(displayed.confidence)}
              </Text>
            </XStack>
          </YStack>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000000",
  },
  card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: "#111111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#2a2a2a",
  },
});
