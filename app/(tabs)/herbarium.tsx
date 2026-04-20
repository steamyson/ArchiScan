import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { BookBookmark, Funnel, GridFour, List } from "phosphor-react-native";
import { useHerbariumScans } from "../../hooks/useHerbariumScans";
import { useHerbariumStore } from "../../stores/herbariumStore";
import { useAuthStore } from "../../stores/authStore";
import { HerbariumGrid } from "../../components/HerbariumGrid";
import { FilterSheet } from "../../components/FilterSheet";
import { FullScreenError } from "../../components/shared/FullScreenError";
import type { ScanRecord } from "../../types/scan";

export default function HerbariumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const viewMode = useHerbariumStore((s) => s.viewMode);
  const setViewMode = useHerbariumStore((s) => s.setViewMode);
  const filters = useHerbariumStore((s) => s.filters);
  const { scans, signedUrls, loading, error, refetch } = useHerbariumScans();
  const [filterOpen, setFilterOpen] = useState(false);

  if (!session) {
    return (
      <YStack flex={1} bg="$background" ai="center" jc="center" gap="$4" p="$6">
        <BookBookmark size={56} color="#888880" weight="duotone" />
        <Text fos={17} fontWeight="600" color="$color" ta="center">
          Sign in to see your Herbarium
        </Text>
      </YStack>
    );
  }

  if (error && scans.length === 0) {
    return <FullScreenError message={error} onRetry={refetch} />;
  }

  const handleCardPress = (scan: ScanRecord) => {
    router.push({ pathname: "/scan/[id]", params: { id: scan.id } });
  };

  const hasActiveFilters =
    Boolean(filters.style || filters.tag || filters.searchQuery || filters.dateFrom || filters.dateTo);

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <XStack ai="center" jc="space-between" px="$5" pt="$3" pb="$3">
        <Text fos={26} color="$color" style={{ fontFamily: "BebasNeue_400Regular", letterSpacing: 3 }}>
          HERBARIUM
        </Text>
        <XStack gap="$2">
          <Button
            size="$3"
            chromeless
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            icon={
              viewMode === "grid" ? (
                <List size={20} color="#c8a96e" weight="regular" />
              ) : (
                <GridFour size={20} color="#c8a96e" weight="regular" />
              )
            }
            aria-label="Toggle view mode"
          />
          <Button
            size="$3"
            chromeless
            onPress={() => setFilterOpen(true)}
            icon={
              <Funnel
                size={20}
                color={hasActiveFilters ? "#c8a96e" : "#888880"}
                weight={hasActiveFilters ? "fill" : "regular"}
              />
            }
            aria-label="Filter"
          />
        </XStack>
      </XStack>

      <HerbariumGrid
        scans={scans}
        signedUrls={signedUrls}
        onCardPress={handleCardPress}
        loading={loading}
        onRefresh={refetch}
      />

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </YStack>
  );
}
