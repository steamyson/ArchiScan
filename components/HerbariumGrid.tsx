import { FlatList, RefreshControl } from "react-native";
import { YStack, Text } from "tamagui";
import { BookBookmark } from "phosphor-react-native";
import { useHerbariumStore } from "../stores/herbariumStore";
import { SpecimenCard } from "./SpecimenCard";
import type { ScanRecord } from "../types/scan";

interface HerbariumGridProps {
  scans: ScanRecord[];
  signedUrls: Record<string, string>;
  onCardPress: (scan: ScanRecord) => void;
  loading: boolean;
  onRefresh: () => void;
}

export function HerbariumGrid({ scans, signedUrls, onCardPress, loading, onRefresh }: HerbariumGridProps) {
  const viewMode = useHerbariumStore((s) => s.viewMode);

  if (scans.length === 0) {
    return (
      <YStack flex={1} ai="center" jc="center" gap="$3" px="$6">
        <BookBookmark size={56} color="#888880" weight="duotone" />
        <Text color="$colorMuted" fos={15} ta="center" lh={22}>
          No scans saved yet.{"\n"}Scan a building and tap Save to start your collection.
        </Text>
      </YStack>
    );
  }

  return (
    <FlatList
      key={viewMode}
      data={scans}
      keyExtractor={(item) => item.id}
      numColumns={viewMode === "grid" ? 2 : 1}
      renderItem={({ item, index }) => (
        <SpecimenCard
          scan={item}
          signedUrl={signedUrls[item.image_url] ?? ""}
          mode={viewMode}
          onPress={() => onCardPress(item)}
          index={index}
        />
      )}
      contentContainerStyle={{ padding: 8, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#c8a96e" />}
    />
  );
}
