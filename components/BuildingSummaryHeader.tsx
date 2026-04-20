import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { StyleSheet, View, Text } from "react-native";
import type { BuildingSummary } from "../types/scan";

interface BuildingSummaryHeaderProps {
  summary: BuildingSummary;
  address?: string | null;
  elementCount?: number;
}

export function BuildingSummaryHeader({ summary, address, elementCount }: BuildingSummaryHeaderProps) {
  return (
    <View style={styles.hero}>
      {/* Period decoration */}
      <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.periodRow}>
        <View style={styles.periodLine} />
        <Text style={styles.periodText}>{summary.estimated_period}</Text>
      </Animated.View>

      {/* Style name */}
      <Animated.Text
        entering={FadeInUp.delay(150).duration(600)}
        style={styles.styleName}
      >
        {summary.probable_style}
      </Animated.Text>

      {address ? (
        <Animated.Text entering={FadeIn.delay(250).duration(600)} style={styles.address}>
          {address}
        </Animated.Text>
      ) : null}

      {/* Stats row */}
      <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Structure</Text>
          <Text style={styles.statValue}>{summary.structural_system?.split(",")[0] ?? "—"}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Cladding</Text>
          <Text style={styles.statValue}>{summary.structural_system?.split(",")[1]?.trim() ?? "Masonry"}</Text>
        </View>
        {elementCount != null && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Elements</Text>
            <Text style={styles.statValue}>{elementCount}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    backgroundColor: "#100e0a",
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  periodLine: {
    width: 18,
    height: 1,
    backgroundColor: "#c8a96e",
  },
  periodText: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 10,
    fontWeight: "600",
    color: "#c8a96e",
    textTransform: "uppercase",
    letterSpacing: 2.5,
  },
  styleName: {
    fontFamily: "CormorantGaramond_300Light",
    fontSize: 40,
    lineHeight: 42,
    color: "#f0ede8",
    marginBottom: 8,
  },
  address: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 11,
    color: "#888880",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  statItem: {
    gap: 3,
  },
  statLabel: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 9,
    color: "#888880",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  statValue: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: "#f0ede8",
  },
});
