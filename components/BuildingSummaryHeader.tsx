import Animated, { FadeIn } from "react-native-reanimated";
import { YStack, XStack, Text } from "tamagui";
import { Clock, Columns } from "phosphor-react-native";
import type { BuildingSummary } from "../types/scan";

interface BuildingSummaryHeaderProps {
  summary: BuildingSummary;
  address?: string | null;
}

export function BuildingSummaryHeader({ summary, address }: BuildingSummaryHeaderProps) {
  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <YStack
        bg="$backgroundStrong"
        br="$4"
        p="$4"
        gap="$3"
        borderWidth={1}
        borderColor="$borderColor"
        mb="$4"
      >
        {address ? (
          <Text fos={12} color="$colorMuted" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
        <Text fos={22} fontWeight="700" lh={28} color="$color">
          {summary.probable_style}
        </Text>
        <XStack gap="$4" flexWrap="wrap">
          <XStack ai="center" gap="$1">
            <Clock size={13} color="#888880" weight="regular" />
            <Text fos={12} color="$colorMuted">
              {summary.estimated_period}
            </Text>
          </XStack>
          <XStack ai="center" gap="$1">
            <Columns size={13} color="#888880" weight="regular" />
            <Text fos={12} color="$colorMuted">
              {summary.structural_system}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Animated.View>
  );
}
