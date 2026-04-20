import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line } from "react-native-svg";
import { YStack } from "tamagui";
import type { ArchitecturalElement } from "../types/scan";
import { HIERARCHY_COLORS, OVERLAY_LINE_OPACITY, OVERLAY_STROKE_WIDTH, type LabelPosition } from "../lib/overlayLayout";
import { ElementLabel } from "./ElementLabel";

const AnimatedG = Animated.createAnimatedComponent(G);

const GUTTER_WIDTH = 110;
const LABEL_HALF_HEIGHT = 14;
const LABEL_EDGE_INSET = 4;
const STAGGER_MS = 80;
const FADE_MS = 300;
const LABEL_EXTRA_DELAY = 100;

interface Props {
  positions: LabelPosition[];
  /** Container width in pixels — also the coordinate space of `positions`. */
  containerWidth: number;
  onLabelPress: (element: ArchitecturalElement) => void;
}

interface SegmentProps {
  position: LabelPosition;
  labelX: number;
  delay: number;
}

function LeaderLineSegment({ position, labelX, delay }: SegmentProps) {
  const opacity = useSharedValue(0);
  const color = HIERARCHY_COLORS[position.element.hierarchy];

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: FADE_MS }));
  }, [delay, opacity]);

  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Line
        x1={labelX}
        y1={position.labelY}
        x2={position.leaderEndX}
        y2={position.leaderEndY}
        stroke={color}
        strokeWidth={OVERLAY_STROKE_WIDTH}
        opacity={OVERLAY_LINE_OPACITY}
      />
      <Circle
        cx={position.leaderEndX}
        cy={position.leaderEndY}
        r={3}
        fill={color}
        opacity={0.9}
      />
    </AnimatedG>
  );
}

export function LeaderLineOverlay({ positions, containerWidth, onLabelPress }: Props) {
  return (
    <YStack style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <YStack style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          {positions.map((pos, i) => {
            const labelX = pos.side === "left" ? GUTTER_WIDTH : containerWidth - GUTTER_WIDTH;
            return (
              <LeaderLineSegment
                key={`${pos.element.name}-${i}-line`}
                position={pos}
                labelX={labelX}
                delay={i * STAGGER_MS}
              />
            );
          })}
        </Svg>
      </YStack>

      {positions.map((pos, i) => (
        <Animated.View
          key={`${pos.element.name}-${i}-label`}
          entering={FadeIn.delay(i * STAGGER_MS + LABEL_EXTRA_DELAY).duration(FADE_MS)}
          style={[
            styles.labelWrapper,
            {
              top: pos.labelY - LABEL_HALF_HEIGHT,
              left: pos.side === "left" ? LABEL_EDGE_INSET : undefined,
              right: pos.side === "right" ? LABEL_EDGE_INSET : undefined,
            },
          ]}
        >
          <ElementLabel element={pos.element} side={pos.side} onPress={() => onLabelPress(pos.element)} />
        </Animated.View>
      ))}
    </YStack>
  );
}

const styles = StyleSheet.create({
  labelWrapper: {
    position: "absolute",
    width: GUTTER_WIDTH - 8,
  },
});
