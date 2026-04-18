import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { XStack } from 'tamagui';
import { Pressable, StyleSheet } from 'react-native';

const ACCENT_GOLD = '#c8a96e';

type CaptureButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function CaptureButton({ onPress, disabled }: CaptureButtonProps) {
  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  return (
    <XStack position="absolute" bottom={36} left={0} right={0} alignItems="center" justifyContent="center" pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Capture photo"
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.outer,
          pressed && !disabled ? styles.outerPressed : null,
          disabled ? styles.outerDisabled : null,
        ]}
      >
        <XStack style={styles.inner} />
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: ACCENT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  outerPressed: {
    opacity: 0.88,
  },
  outerDisabled: {
    opacity: 0.45,
  },
  inner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT_GOLD,
  },
});
