import Animated, { FadeIn } from "react-native-reanimated";
import { YStack, Text, Button } from "tamagui";
import { Camera } from "phosphor-react-native";

interface NotAFacadeErrorProps {
  onRetry: () => void;
  message?: string;
}

export function NotAFacadeError({ onRetry, message }: NotAFacadeErrorProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      <YStack flex={1} bg="$background" ai="center" jc="center" px="$8" gap="$5">
        <Camera size={48} color="#888880" weight="thin" />
        <Text fos={17} fontWeight="600" color="$color" ta="center">
          No building facade detected
        </Text>
        <Text fos={14} color="$colorMuted" ta="center" lh={22}>
          {message ??
            "Try framing an exterior building face and make sure the facade fills most of the image."}
        </Text>
        <Button
          onPress={onRetry}
          bg="$backgroundStrong"
          borderWidth={1}
          borderColor="$borderColor"
          br="$3"
          h={44}
          px="$6"
          pressStyle={{ opacity: 0.8 }}
        >
          <Text color="$color" fos={14} fontWeight="600">
            Try Again
          </Text>
        </Button>
      </YStack>
    </Animated.View>
  );
}
