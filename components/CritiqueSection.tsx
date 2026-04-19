import Animated, { FadeIn } from "react-native-reanimated";
import { YStack, XStack, Text, Separator } from "tamagui";
import type { Icon } from "phosphor-react-native";

interface CritiqueSectionProps {
  title: string;
  body: string;
  IconComponent: Icon;
  delay: number;
}

export function CritiqueSection({ title, body, IconComponent, delay }: CritiqueSectionProps) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(400)}>
      <YStack gap="$3" py="$4">
        <XStack ai="center" gap="$2">
          <IconComponent size={16} color="#c8a96e" weight="duotone" />
          <Text fos={13} fontWeight="700" color="#c8a96e" tt="uppercase" ls={1.2}>
            {title}
          </Text>
        </XStack>
        <Text fos={15} fontWeight="400" lh={24} color="$color">
          {body}
        </Text>
        <Separator borderColor="$borderColor" />
      </YStack>
    </Animated.View>
  );
}
