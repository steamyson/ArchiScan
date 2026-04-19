import { useEffect } from "react";
import { Dimensions, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";
import { YStack, XStack, Text } from "tamagui";
import { OverlayCanvas } from "../components/OverlayCanvas";
import { CritiqueScreen, CritiqueUnavailable } from "../components/CritiqueScreen";
import { useScanStore } from "../stores/scanStore";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function OverlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const analysis = useScanStore((s) => s.analysis);
  const localPhotoUri = useScanStore((s) => s.localPhotoUri);
  const buildingAddress = useScanStore((s) => s.buildingAddress);

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/scan");
    }
  };

  useEffect(() => {
    if (!analysis || !localPhotoUri) {
      handleDismiss();
    }
  }, [analysis, localPhotoUri]);

  if (!analysis || !localPhotoUri) {
    return <YStack flex={1} backgroundColor="$background" />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <YStack height={SCREEN_HEIGHT} position="relative">
          <OverlayCanvas elements={analysis.elements} imageUri={localPhotoUri} />
        </YStack>

        {analysis.critique ? (
          <CritiqueScreen
            critique={analysis.critique}
            summary={analysis.building_summary}
            address={buildingAddress}
          />
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
            {analysis.building_summary.probable_style}
          </Text>
          {buildingAddress ? (
            <Text fontSize={11} color="$colorMuted" numberOfLines={1} marginTop={2}>
              {buildingAddress}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
}
