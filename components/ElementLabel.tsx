import { Pressable, StyleSheet } from "react-native";
import { Text } from "tamagui";
import type { ArchitecturalElement } from "../types/scan";
import { HIERARCHY_COLORS } from "../lib/overlayLayout";

interface Props {
  element: ArchitecturalElement;
  onPress: () => void;
}

export function ElementLabel({ element, onPress }: Props) {
  const color = HIERARCHY_COLORS[element.hierarchy];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.label, { borderColor: color, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text fos={10} fontWeight="600" color={color} numberOfLines={1}>
        {element.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: "rgba(10, 10, 10, 0.75)",
  },
});
