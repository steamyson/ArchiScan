import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Animated as RNAnimated } from "react-native";

const VOCAB_FACTS = [
  { term: "Rustication", def: "Masonry cut with deep joints to create visual weight at a building's base." },
  { term: "Pilaster", def: "A flat column engaged with the wall surface — structural in appearance, decorative in function." },
  { term: "Entablature", def: "The horizontal band resting on columns: architrave, frieze, and cornice together." },
  { term: "Voussoir", def: "A wedge-shaped stone in an arch that distributes load through compression." },
  { term: "Dentil", def: "A series of tooth-like projections forming a classical cornice detail." },
  { term: "Spandrel", def: "The triangular wall area between two arches, or the panel between windows on adjacent floors." },
  { term: "Modillion", def: "An ornamental bracket under the corona of a Corinthian or composite cornice." },
];

const CYCLE_MS = 3600;

export function AnalyzingOverlay() {
  const [factIdx, setFactIdx] = useState(0);
  const [displayIdx, setDisplayIdx] = useState(0);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;
  const opacityAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade + slide out
      RNAnimated.parallel([
        RNAnimated.timing(opacityAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        RNAnimated.timing(slideAnim, { toValue: -14, duration: 320, useNativeDriver: true }),
      ]).start(() => {
        setFactIdx((i) => (i + 1) % VOCAB_FACTS.length);
        slideAnim.setValue(14);
        // Fade + slide in
        RNAnimated.parallel([
          RNAnimated.timing(opacityAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
          RNAnimated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
      });
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [slideAnim, opacityAnim]);

  // Keep displayIdx in sync for render after transition
  useEffect(() => { setDisplayIdx(factIdx); }, [factIdx]);

  const fact = VOCAB_FACTS[displayIdx];

  return (
    <View style={styles.overlay}>
      {/* Status badge */}
      <View style={styles.badge}>
        {[0, 1, 2].map((d) => (
          <View key={d} style={styles.dot} />
        ))}
        <Text style={styles.badgeText}>Analysing facade</Text>
      </View>

      {/* Vocab fact card */}
      <RNAnimated.View
        style={[
          styles.card,
          { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.vocabDot} />
          <Text style={styles.vocabLabel}>Vocabulary</Text>
        </View>
        <Text style={styles.term}>{fact.term}</Text>
        <Text style={styles.def}>{fact.def}</Text>
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(10, 10, 10, 0.9)",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#c8a96e",
    opacity: 0.8,
  },
  badgeText: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 14,
    color: "#f0ede8",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  vocabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#c8a96e",
  },
  vocabLabel: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 9,
    fontWeight: "700",
    color: "#c8a96e",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  term: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 18,
    color: "#f0ede8",
    marginBottom: 4,
  },
  def: {
    fontFamily: "CormorantGaramond_400Regular_Italic",
    fontSize: 13,
    color: "#888880",
    lineHeight: 19,
  },
});
