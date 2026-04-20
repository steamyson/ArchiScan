import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "tamagui";
import type { ArchitecturalElement } from "../types/scan";
import { HIERARCHY_COLORS, HIERARCHY_LABELS } from "../lib/overlayLayout";

interface Props {
  element: ArchitecturalElement;
  side: "left" | "right";
  onPress: () => void;
}

export function ElementLabel({ element, side, onPress }: Props) {
  const color = HIERARCHY_COLORS[element.hierarchy];
  const isLeft = side === "left";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={[
          styles.label,
          {
            borderColor: `${color}30`,
            borderLeftWidth: isLeft ? 1.5 : 1,
            borderRightWidth: isLeft ? 1 : 1.5,
            borderLeftColor: isLeft ? `${color}88` : `${color}30`,
            borderRightColor: isLeft ? `${color}30` : `${color}88`,
          },
        ]}
      >
        <Text
          fos={9}
          fontWeight="500"
          color={color}
          numberOfLines={1}
          style={{ letterSpacing: 0.3 }}
        >
          {element.name}
        </Text>
        <Text
          fos={8}
          color={`${color}60`}
          fontWeight="400"
          fontStyle="italic"
          style={{ marginTop: 1 }}
        >
          {HIERARCHY_LABELS[element.hierarchy]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: "rgba(8, 8, 8, 0.82)",
  },
});
