import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, Button, Spinner } from "tamagui";
import { Camera as CameraIcon } from "phosphor-react-native";
import { useCameraPermission } from "react-native-vision-camera";
import { markLaunched } from "../lib/firstLaunch";
import { logError } from "../lib/logger";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestPermission } = useCameraPermission();
  const [requesting, setRequesting] = useState(false);

  const onStart = useCallback(async () => {
    setRequesting(true);
    try {
      await requestPermission();
    } catch (err) {
      logError("WelcomeScreen.requestCameraPermission", err);
    } finally {
      try {
        await markLaunched();
      } catch (err) {
        logError("WelcomeScreen.markLaunched", err);
      }
      setRequesting(false);
      router.replace("/(tabs)/scan");
    }
  }, [requestPermission, router]);

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 40} pb={insets.bottom + 24} px="$6" jc="space-between">
      <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, justifyContent: "center" }}>
        <YStack gap="$4" ai="center">
          <YStack
            w={96}
            h={96}
            br="$round"
            bg="$backgroundStrong"
            borderWidth={1}
            borderColor="$borderColor"
            ai="center"
            jc="center"
          >
            <CameraIcon size={40} color="#c8a96e" weight="duotone" />
          </YStack>

          <Text fos={13} fontWeight="700" color="#c8a96e" tt="uppercase" ls={1.4} mt="$2">
            FacadeLens
          </Text>

          <Text fos={28} fontWeight="700" color="$color" ta="center" lh={34} mt="$2">
            Point your camera at{"\n"}any building.
          </Text>

          <Text fos={15} color="$colorMuted" ta="center" lh={22} maxWidth={320} mt="$2">
            Learn to read its architecture — style, structure, rhythm, material — in seconds.
          </Text>
        </YStack>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(250).duration(500)}>
        <YStack gap="$3">
          <Button
            onPress={onStart}
            disabled={requesting}
            bg="#c8a96e"
            br="$3"
            h={52}
            pressStyle={{ opacity: 0.85 }}
          >
            {requesting ? (
              <XStack ai="center" gap="$2">
                <Spinner color="#0a0a0a" />
                <Text color="#0a0a0a" fontWeight="700" fos={15}>
                  Starting…
                </Text>
              </XStack>
            ) : (
              <Text color="#0a0a0a" fontWeight="700" fos={15}>
                Start Scanning
              </Text>
            )}
          </Button>
          <Text fos={11} color="$colorMuted" ta="center" lh={16}>
            You can sign in later to save scans to your Herbarium.
          </Text>
        </YStack>
      </Animated.View>
    </YStack>
  );
}
