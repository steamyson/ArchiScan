import { YStack, Text } from 'tamagui';
import { BookBookmark } from 'phosphor-react-native';

export default function HerbariumScreen() {
  return (
    <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <BookBookmark size={56} color="#888880" weight="duotone" />
      <Text fontSize={17} fontWeight="600" color="$color" textAlign="center">
        Your collection will appear here
      </Text>
    </YStack>
  );
}
