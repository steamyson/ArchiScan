import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

const ACCENT_GOLD = '#c8a96e';
const RING_SIZE = 70;

type FocusRingProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
};

export function FocusRing({ x, y, opacity }: FocusRingProps) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value - RING_SIZE / 2 }, { translateY: y.value - RING_SIZE / 2 }],
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: ACCENT_GOLD,
  },
});
