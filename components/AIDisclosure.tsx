import { XStack, Text } from "tamagui";
import { Info } from "phosphor-react-native";

export function AIDisclosure() {
  return (
    <XStack
      gap="$2"
      p="$3"
      bg="$backgroundFocus"
      br="$3"
      borderWidth={1}
      borderColor="$borderColor"
      mt="$2"
      mb="$6"
      ai="flex-start"
    >
      <Info size={14} color="#888880" weight="regular" style={{ marginTop: 2 }} />
      <Text fos={12} color="$colorMuted" flex={1} lh={18}>
        This is a machine-generated interpretation intended to provoke discussion, not replace
        informed human judgment.
      </Text>
    </XStack>
  );
}
