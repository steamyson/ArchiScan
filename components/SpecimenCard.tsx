import { Image, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { YStack, XStack, Text } from "tamagui";
import { MapPin } from "phosphor-react-native";
import type { ScanRecord } from "../types/scan";

interface SpecimenCardProps {
  scan: ScanRecord;
  signedUrl: string;
  mode: "grid" | "list";
  onPress: () => void;
  index: number;
}

function formatCapturedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SpecimenCard({ scan, signedUrl, mode, onPress, index }: SpecimenCardProps) {
  const summary = scan.building_summary;
  const date = formatCapturedDate(scan.captured_at);
  const style = summary?.probable_style ?? "Unknown";
  const entering = FadeIn.delay(index * 40).duration(300);

  if (mode === "grid") {
    return (
      <Animated.View entering={entering} style={styles.gridItem}>
        <Pressable onPress={onPress} style={({ pressed }) => [styles.gridCard, pressed && styles.pressed]}>
          {signedUrl ? (
            <Image source={{ uri: signedUrl }} style={styles.gridImage} resizeMode="cover" />
          ) : (
            <YStack style={styles.gridImage} bg="$backgroundFocus" />
          )}
          <YStack p="$2" gap="$1">
            <Text fos={11} fontWeight="600" color="$color" numberOfLines={1}>
              {style}
            </Text>
            <Text fos={10} color="$colorMuted" numberOfLines={1}>
              {date}
            </Text>
          </YStack>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entering}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        <XStack
          bg="$backgroundStrong"
          br="$4"
          borderWidth={1}
          borderColor="$borderColor"
          overflow="hidden"
          mb="$3"
        >
          {signedUrl ? (
            <Image source={{ uri: signedUrl }} style={styles.listImage} resizeMode="cover" />
          ) : (
            <YStack style={styles.listImage} bg="$backgroundFocus" />
          )}
          <YStack flex={1} p="$3" gap="$1" jc="center">
            <Text fos={14} fontWeight="600" color="$color" numberOfLines={1}>
              {style}
            </Text>
            {summary?.estimated_period ? (
              <Text fos={12} color="$colorMuted" numberOfLines={1}>
                {summary.estimated_period}
              </Text>
            ) : null}
            {scan.building_address ? (
              <XStack ai="center" gap="$1" mt="$1">
                <MapPin size={11} color="#888880" weight="regular" />
                <Text fos={11} color="$colorMuted" numberOfLines={1} flex={1}>
                  {scan.building_address}
                </Text>
              </XStack>
            ) : null}
            <Text fos={11} color="$colorMuted">
              {date}
            </Text>
          </YStack>
        </XStack>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gridItem: { width: "50%", padding: 4 },
  gridCard: {
    backgroundColor: "#111111",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  gridImage: { width: "100%", aspectRatio: 4 / 3 },
  listImage: { width: 90, height: 90 },
  pressed: { opacity: 0.7 },
});
