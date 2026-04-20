import { YStack, Text, Button } from "tamagui";
import { Warning } from "phosphor-react-native";

interface FullScreenErrorProps {
  message: string;
  onRetry: () => void;
}

export function FullScreenError({ message, onRetry }: FullScreenErrorProps) {
  return (
    <YStack flex={1} bg="$background" ai="center" jc="center" px="$8" gap="$5">
      <Warning size={48} color="#888880" weight="thin" />
      <Text fos={16} fontWeight="600" color="$color" ta="center">
        {message}
      </Text>
      <Button
        onPress={onRetry}
        bg="transparent"
        borderWidth={1}
        borderColor="$borderColor"
        br="$3"
        h={44}
        px="$6"
      >
        <Text color="$color" fos={14}>
          Try Again
        </Text>
      </Button>
    </YStack>
  );
}
