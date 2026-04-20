import { useCallback, useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";
import { YStack, XStack, Text, Spinner } from "tamagui";
import { OverlayCanvas } from "../../components/OverlayCanvas";
import {
  CritiqueScreen,
  CritiqueSkeleton,
  CritiqueUnavailable,
} from "../../components/CritiqueScreen";
import { SaveButton } from "../../components/SaveButton";
import { FullScreenError } from "../../components/shared/FullScreenError";
import { fetchScanById, getSignedUrl } from "../../lib/herbarium";
import { parseCritique } from "../../lib/critiqueUtils";
import { getUserFriendlyMessage } from "../../lib/errorMessages";
import { logError } from "../../lib/logger";
import { useAuthStore } from "../../stores/authStore";
import type { ScanRecord } from "../../types/scan";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function ScanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/herbarium");
    }
  }, [router]);

  const load = useCallback(async () => {
    if (!id || !session?.user.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const record = await fetchScanById(id, session.user.id);
      if (!record) {
        setError("Scan not found.");
        return;
      }
      setScan(record);
      const url = await getSignedUrl(record.image_url);
      setImageUri(url);
    } catch (err) {
      logError("ScanDetailScreen", err);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !scan) {
    return (
      <YStack flex={1} bg="$background" ai="center" jc="center">
        <Spinner size="large" color="#c8a96e" />
      </YStack>
    );
  }

  if (error) {
    return <FullScreenError message={error} onRetry={load} />;
  }

  if (!scan || !imageUri) {
    return <YStack flex={1} bg="$background" />;
  }

  const critique = parseCritique(scan.critique_text);
  const elements = scan.overlay_data?.elements ?? [];

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <YStack height={SCREEN_HEIGHT} position="relative">
          <OverlayCanvas elements={elements} imageUri={imageUri} />
        </YStack>

        <YStack px="$5" pt="$5">
          <SaveButton scanId={scan.id} initialSaved={scan.saved ?? true} />
        </YStack>

        {critique ? (
          <CritiqueScreen
            critique={critique}
            summary={scan.building_summary}
            address={scan.building_address}
          />
        ) : loading ? (
          <CritiqueSkeleton />
        ) : (
          <CritiqueUnavailable />
        )}
      </ScrollView>

      <XStack
        position="absolute"
        top={insets.top + 8}
        left={0}
        right={0}
        paddingHorizontal="$4"
        ai="center"
        jc="space-between"
        gap="$3"
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(10, 10, 10, 0.75)",
            borderWidth: 1,
            borderColor: "#2a2a2a",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <X size={20} color="#f0ede8" weight="regular" />
        </Pressable>

        <YStack
          flex={1}
          backgroundColor="rgba(10, 10, 10, 0.75)"
          borderColor="#2a2a2a"
          borderWidth={1}
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius={8}
        >
          <Text
            fontSize={13}
            fontWeight="700"
            color="#c8a96e"
            textTransform="uppercase"
            letterSpacing={1.2}
            numberOfLines={1}
          >
            {scan.building_summary?.probable_style ?? "Scan"}
          </Text>
          {scan.building_address ? (
            <Text fontSize={11} color="$colorMuted" numberOfLines={1} marginTop={2}>
              {scan.building_address}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
}
