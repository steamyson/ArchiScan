import { ScrollView, StyleSheet, View, Text } from "react-native";
import type { BuildingSummary, Critique } from "../types/scan";
import { stripMarkdown } from "../lib/critiqueUtils";
import { BuildingSummaryHeader } from "./BuildingSummaryHeader";
import { CritiqueSection } from "./CritiqueSection";
import { AIDisclosure } from "./AIDisclosure";

interface CritiqueScreenProps {
  critique: Critique;
  summary: BuildingSummary;
  address?: string | null;
}

interface SectionConfig {
  key: keyof Critique;
  title: string;
  num: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "rhythm_and_repetition", title: "Rhythm & Repetition", num: "01" },
  { key: "proportion_and_scale", title: "Proportion & Scale", num: "02" },
  { key: "materiality_and_tectonics", title: "Materiality & Tectonics", num: "03" },
  { key: "contextual_dialogue", title: "Contextual Dialogue", num: "04" },
  { key: "light_and_shadow", title: "Light & Shadow", num: "05" },
];

export function CritiqueScreen({ critique, summary, address }: CritiqueScreenProps) {
  return (
    <View style={styles.container}>
      <BuildingSummaryHeader
        summary={summary}
        address={address}
        elementCount={undefined}
      />
      {SECTIONS.map(({ key, title, num }, i) => (
        <CritiqueSection
          key={key}
          title={title}
          body={stripMarkdown(critique[key] ?? "")}
          num={num}
          delay={i * 60}
        />
      ))}
      <View style={styles.disclosureWrap}>
        <AIDisclosure />
      </View>
    </View>
  );
}

export function CritiqueUnavailable() {
  return (
    <View style={styles.unavailable}>
      <Text style={styles.unavailableText}>Critique unavailable for this scan.</Text>
    </View>
  );
}

export function CritiqueSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <View style={[styles.skeletonLine, { width: 120, height: 14 }]} />
          <View style={[styles.skeletonLine, { width: "100%", height: 60 }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0a0a0a",
  },
  disclosureWrap: {
    margin: 20,
  },
  unavailable: {
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  unavailableText: {
    fontSize: 14,
    color: "#888880",
    textAlign: "center",
  },
  skeleton: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  skeletonItem: {
    gap: 8,
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "#1a1a1a",
  },
});
