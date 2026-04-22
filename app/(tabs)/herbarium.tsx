import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button } from "tamagui";
import { BookBookmark, Funnel, GridFour, List, Buildings } from "phosphor-react-native";
import { useHerbariumScans } from "../../hooks/useHerbariumScans";
import { useHerbariumStore } from "../../stores/herbariumStore";
import { useAuthStore } from "../../stores/authStore";
import { useScanStore } from "../../stores/scanStore";
import { getSamplePhotoCached } from "../../lib/samplePhotoCache";
import { HerbariumGrid } from "../../components/HerbariumGrid";
import { FilterSheet } from "../../components/FilterSheet";
import { FullScreenError } from "../../components/shared/FullScreenError";
import { logError } from "../../lib/logger";
import type { AnalysisResult, ScanRecord } from "../../types/scan";

const SAMPLE_ANALYSIS: AnalysisResult = require("../../assets/sample-scan.json");

export default function HerbariumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const viewMode = useHerbariumStore((s) => s.viewMode);
  const setViewMode = useHerbariumStore((s) => s.setViewMode);
  const filters = useHerbariumStore((s) => s.filters);
  const { scans, signedUrls, loading, error, refetch } = useHerbariumScans();
  const setResult = useScanStore((s) => s.setResult);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

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

  const handleViewSample = async () => {
    setSampleLoading(true);
    setSampleError(null);
    try {
      const photo = await getSamplePhotoCached();
      setResult({
        scanId: null,
        analysis: SAMPLE_ANALYSIS,
        localPhotoUri: photo.localUri,
        storagePath: null,
        buildingAddress: "Brooklyn, New York",
        visibilityNote: null,
        sampleAttribution: {
          photographerName: photo.photographerName,
          photographerUrl: photo.photographerUrl,
        },
      });
      router.push("/overlay");
    } catch (err) {
      logError("handleViewSample", err);
      setSampleError("Could not load sample. Check your connection.");
    } finally {
      setSampleLoading(false);
    }
  };

  if (!loading && scans.length === 0 && !hasActiveFilters) {
    return (
      <YStack flex={1} bg="$background" ai="center" jc="center" gap="$5" p="$6" pt={insets.top}>
        <Buildings size={56} color="#888880" weight="duotone" />
        <YStack ai="center" gap="$2">
          <Text fos={20} fontWeight="600" color="$color" ta="center"
            style={{ fontFamily: "BebasNeue_400Regular", letterSpacing: 2 }}>
            YOUR HERBARIUM IS EMPTY
          </Text>
          <Text fos={14} color="#888880" ta="center" lh={20}>
            Scan a building facade to start your collection.
          </Text>
        </YStack>
        <Button
          onPress={handleViewSample}
          disabled={sampleLoading}
          bg="$backgroundStrong"
          borderWidth={1}
          borderColor="$borderColor"
          br="$3"
          h={44}
          pressStyle={{ opacity: 0.85 }}
          icon={<BookBookmark size={18} color="#c8a96e" weight="regular" />}
        >
          <Text color="$color" fos={14} fontWeight="600">
            {sampleLoading ? "Loading…" : "View Sample Scan"}
          </Text>
        </Button>
        {sampleError ? (
          <Text fos={12} color="#c96e6e" ta="center">{sampleError}</Text>
        ) : null}
      </YStack>
    );
  }

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
