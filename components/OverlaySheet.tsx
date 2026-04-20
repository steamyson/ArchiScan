import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { BuildingSummary } from "../types/scan";

const SHEET_H = 296;
const PEEK_H = 62;
const SNAP_OPEN = 0;
const SNAP_PEEK = SHEET_H - PEEK_H;
const SPRING = { damping: 26, stiffness: 260 } as const;

interface Props {
  visible: boolean;
  summary: BuildingSummary;
  address?: string | null;
  onReadCritique: () => void;
  /** Distance from bottom to sit above the tab bar */
  bottomOffset?: number;
}

export function OverlaySheet({ visible, summary, address, onReadCritique, bottomOffset = 76 }: Props) {
  const translateY = useSharedValue(SHEET_H);
  const [snapState, setSnapState] = useState<"open" | "peek">("open");

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(SNAP_OPEN, SPRING);
      setSnapState("open");
    }
  }, [visible, translateY]);

  const setSnap = (s: "open" | "peek") => setSnapState(s);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      const next = Math.max(SNAP_OPEN, Math.min(SNAP_PEEK, e.translationY));
      translateY.value = next;
    })
    .onEnd((e) => {
      "worklet";
      const target = e.translationY > SNAP_PEEK / 2 ? SNAP_PEEK : SNAP_OPEN;
      translateY.value = withSpring(target, SPRING);
      runOnJS(setSnap)(target === SNAP_OPEN ? "open" : "peek");
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: withTiming(translateY.value > SNAP_PEEK * 0.4 ? 0 : 1, { duration: 180 }),
    transform: [{ translateY: withTiming(translateY.value > SNAP_PEEK * 0.4 ? 8 : 0, { duration: 180 }) }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(translateY.value > SNAP_PEEK * 0.4 ? "180deg" : "0deg", { duration: 240 }) }],
  }));

  if (!visible && snapState === "open") return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.sheet, { bottom: bottomOffset, height: SHEET_H }, sheetStyle]}>
        {/* Gradient from image into solid */}
        <View style={styles.gradient} pointerEvents="none" />
        {/* Solid base */}
        <View style={styles.solidBase} />

        {/* Peek strip — handle + style name, always visible */}
        <Pressable
          onPress={() => {
            const target = snapState === "peek" ? SNAP_OPEN : SNAP_PEEK;
            translateY.value = withSpring(target, SPRING);
            setSnapState(target === SNAP_OPEN ? "open" : "peek");
          }}
          style={styles.peekStrip}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.styleRow}>
            <View>
              <Text style={styles.styleName}>{summary.probable_style}</Text>
              <Text style={styles.period}>{summary.estimated_period}</Text>
            </View>
            <Animated.View style={[styles.chevronCircle, chevronStyle]}>
              <Text style={styles.chevron}>↓</Text>
            </Animated.View>
          </View>
        </Pressable>

        {/* Expandable content */}
        <Animated.View style={[styles.expandable, contentStyle]} pointerEvents={snapState === "peek" ? "none" : "auto"}>
          {address ? (
            <Text style={styles.address} numberOfLines={1}>{address}</Text>
          ) : null}

          {/* Pills */}
          <View style={styles.pillRow}>
            {[
              { label: "Structure", value: summary.structural_system?.split(",")[0] ?? "—", color: "#c8a96e" },
              { label: "Cladding", value: summary.structural_system?.split(",")[1]?.trim() ?? "Masonry", color: "#b89264" },
              { label: "Confidence", value: "High", color: "#6bc96e" },
            ].map((p) => (
              <View key={p.label} style={[styles.pill, { borderColor: `${p.color}33`, backgroundColor: `${p.color}11` }]}>
                <Text style={styles.pillLabel}>{p.label}</Text>
                <Text style={[styles.pillValue, { color: p.color }]}>{p.value}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={onReadCritique}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View>
              <Text style={styles.ctaTitle}>Read the Critique</Text>
              <Text style={styles.ctaSub}>5 sections · Architectural analysis</Text>
            </View>
            <Text style={styles.ctaArrow}>→</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    // React Native can't do CSS gradients; use opacity-to-solid via two layers
    backgroundColor: "transparent",
  },
  solidBase: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0a0a",
  },
  peekStrip: {
    position: "relative",
    zIndex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  styleName: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 18,
    color: "#f0ede8",
    lineHeight: 20,
  },
  period: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 9,
    color: "#c8a96e",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    fontSize: 12,
    color: "#888880",
    lineHeight: 14,
  },
  expandable: {
    position: "relative",
    zIndex: 1,
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 4,
  },
  address: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 11,
    color: "#888880",
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  pillLabel: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 8,
    fontWeight: "600",
    color: "#888880",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pillValue: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  cta: {
    backgroundColor: "#c8a96e",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaTitle: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 17,
    color: "#0a0a0a",
    lineHeight: 19,
  },
  ctaSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 9,
    color: "rgba(10, 10, 10, 0.6)",
    marginTop: 1,
  },
  ctaArrow: {
    fontSize: 16,
    color: "#0a0a0a",
    fontWeight: "600",
  },
});
