import Animated, { FadeInDown } from "react-native-reanimated";
import { StyleSheet, View, Text } from "react-native";

interface CritiqueSectionProps {
  title: string;
  body: string;
  num: string;
  delay: number;
}

export function CritiqueSection({ title, body, num, delay }: CritiqueSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()} style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.ghostNum}>{num}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
  },
  ghostNum: {
    fontFamily: "CormorantGaramond_300Light",
    fontSize: 68,
    lineHeight: 68,
    color: "#c8a96e1e",
    letterSpacing: -3,
    userSelect: "none",
  },
  sectionTitle: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 10,
    fontWeight: "700",
    color: "#c8a96e",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    paddingBottom: 6,
  },
  body: {
    fontFamily: "CormorantGaramond_400Regular_Italic",
    fontSize: 17,
    lineHeight: 30,
    color: "#c8c4be",
  },
});
