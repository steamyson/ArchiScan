import { useMemo } from "react";
import { StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { YStack, Text } from "tamagui";

const VOCAB_FACTS = [
  "Cornice — the projecting ledge at the top of a wall or building.",
  "Pilaster — a rectangular column projecting slightly from a wall.",
  "Spandrel — the triangular space between an arch and the rectangular frame around it.",
  "Dentil — small square blocks forming a series in a cornice.",
  "Rustication — masonry cut in massive blocks with deep joints to suggest strength.",
];

export function AnalyzingOverlay() {
  const fact = useMemo(() => VOCAB_FACTS[Math.floor(Math.random() * VOCAB_FACTS.length)], []);

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
      <YStack flex={1} backgroundColor="rgba(10,10,10,0.92)" alignItems="center" justifyContent="center" gap="$6" paddingHorizontal="$6">
        <LottieView
          source={require("../assets/animations/scanning.json")}
          autoPlay
          loop
          style={styles.lottie}
        />
        <Text color="$color" fontSize={13} textAlign="center" opacity={0.6} lineHeight={20}>
          Reading the facade...
        </Text>
        <YStack
          backgroundColor="$backgroundStrong"
          borderRadius="$4"
          padding="$4"
          borderWidth={1}
          borderColor="$borderColor"
          maxWidth={300}
        >
          <Text color="$colorMuted" fontSize={12} textAlign="center" lineHeight={18}>
            {fact}
          </Text>
        </YStack>
      </YStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: 180,
    height: 180,
  },
});
