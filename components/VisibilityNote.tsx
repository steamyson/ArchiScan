import { XStack, Text } from "tamagui";
import { Warning } from "phosphor-react-native";

interface VisibilityNoteProps {
  message: string;
}

export function VisibilityNote({ message }: VisibilityNoteProps) {
  return (
    <XStack
      mx="$5"
      mt="$4"
      bg="rgba(200, 169, 110, 0.12)"
      borderWidth={1}
      borderColor="#c8a96e"
      br="$3"
      p="$3"
      ai="flex-start"
      gap="$2"
    >
      <Warning size={16} color="#c8a96e" weight="fill" style={{ marginTop: 2 }} />
      <Text fos={12} color="#c8a96e" lh={18} flex={1}>
        {message}
      </Text>
    </XStack>
  );
}
