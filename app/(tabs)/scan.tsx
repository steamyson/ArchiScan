import { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { XStack, YStack, Text, Button } from "tamagui";
import { AnalyzingOverlay } from "../../components/AnalyzingOverlay";
import { CameraView } from "../../components/CameraView";
import { NotAFacadeError } from "../../components/NotAFacadeError";
import NetInfo from "@react-native-community/netinfo";
import { analyzeFacade, NotAFacadeError as NotAFacadeErrorType } from "../../lib/analysis";
import { getUserFriendlyMessage } from "../../lib/errorMessages";
import { logError } from "../../lib/logger";
import { captureLocation } from "../../lib/location";
import { reverseGeocode } from "../../lib/geocoding";
import { enqueue as enqueueScan } from "../../lib/offlineQueue";
import { uploadFacadePhoto, type PhotoOrientation } from "../../lib/storage";
import { useAuthStore } from "../../stores/authStore";
import { useScanStore } from "../../stores/scanStore";

type ScanPhase = "camera" | "uploading" | "analyzing" | "error" | "not_a_facade";

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const setScanResult = useScanStore((s) => s.setResult);
  const [phase, setPhase] = useState<ScanPhase>("camera");
  const [errorTitle, setErrorTitle] = useState<string>("Couldn't upload photo");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notAFacadeMessage, setNotAFacadeMessage] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadNotice) {
      return;
    }
    const t = setTimeout(() => setUploadNotice(null), 8000);
    return () => clearTimeout(t);
  }, [uploadNotice]);

  const onCaptureError = useCallback((message: string) => {
    setErrorTitle("Camera issue");
    setErrorMessage(message);
    setPhase("error");
  }, []);

  const onPhotoCaptured = useCallback(
    async (payload: { path: string; orientation: PhotoOrientation }) => {
      const { path: photoPath, orientation } = payload;
      const pipelineStart = __DEV__ ? globalThis.performance.now() : 0;
      console.log("[scan] pipeline started", photoPath, "orientation", orientation);
      setPhase("uploading");
      setErrorMessage(null);

      try {
        const uploadStart = __DEV__ ? globalThis.performance.now() : 0;
        const [upload, coords] = await Promise.all([
          uploadFacadePhoto(photoPath, orientation),
          captureLocation(),
        ]);
        const { storagePath, localCorrectedUri } = upload;
        if (__DEV__) {
          const now = globalThis.performance.now();
          console.log("[scan][timing] upload+location ms", Math.round(now - uploadStart));
          console.log("[scan][timing] until after upload+location ms", Math.round(now - pipelineStart));
        }
        console.log("[scan] storage path", storagePath, "coords", coords);

        const address = coords ? await reverseGeocode(coords.lat, coords.lng) : "";

        if (session?.user?.id) {
          setPhase("analyzing");
          try {
            const { scanId, analysis, cached, visibilityNote, promptVersion, modelUsed } = await analyzeFacade({
              imagePath: storagePath,
              userId: session.user.id,
              location: coords,
              address,
              localUri: localCorrectedUri,
            });
            if (__DEV__) {
              console.log("[M2] scanId", scanId, "elements", analysis.elements.length, "cached", cached, "promptVersion", promptVersion, "modelUsed", modelUsed);
            }
            setScanResult({
              scanId,
              analysis,
              localPhotoUri: localCorrectedUri,
              storagePath,
              buildingAddress: address ? address : null,
              visibilityNote,
            });
            setPhase("camera");
            router.push("/overlay");
            return;
          } catch (analyzeErr) {
            if (analyzeErr instanceof NotAFacadeErrorType) {
              setNotAFacadeMessage(analyzeErr.message);
              setPhase("not_a_facade");
              return;
            }
            const net = await NetInfo.fetch();
            if (!net.isConnected) {
              try {
                await enqueueScan({
                  imagePath: storagePath,
                  userId: session.user.id,
                  location: coords,
                  address,
                });
                setUploadNotice("Offline — scan queued. We'll analyze it when you're back online.");
                setPhase("camera");
                return;
              } catch (queueErr) {
                logError("enqueueScan", queueErr);
              }
            }
            logError("analyzeFacade", analyzeErr);
            setErrorTitle("Couldn't analyze photo");
            setErrorMessage(getUserFriendlyMessage(analyzeErr));
            setPhase("error");
            return;
          }
        } else {
          setUploadNotice(`Uploaded: ${storagePath}`);
        }

        setPhase("camera");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        console.error("[scan] capture pipeline error", e);
        setErrorTitle("Couldn't upload photo");
        setErrorMessage(message);
        setPhase("error");
      }
    },
    [session, router, setScanResult],
  );

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setPhase("camera");
  }, []);

  const dismissNotAFacade = useCallback(() => {
    setNotAFacadeMessage(null);
    setPhase("camera");
  }, []);

  return (
    <YStack flex={1} backgroundColor="$background">
      <CameraView onCapture={onPhotoCaptured} onCaptureError={onCaptureError} isCapturing={phase === "uploading" || phase === "analyzing"} />

      {/* Top HUD — FACADELENS brand + GPS badge */}
      {phase === "camera" && (
        <XStack
          position="absolute"
          top={insets.top + 10}
          left={0}
          right={0}
          paddingHorizontal="$5"
          ai="center"
          jc="space-between"
          pointerEvents="none"
        >
          <Text style={{ fontFamily: "BebasNeue_400Regular", fontSize: 22, color: "#c8a96e", letterSpacing: 4 }}>
            FACADELENS
          </Text>
          <XStack
            bg="rgba(10,10,10,0.85)"
            borderColor="#2a2a2a"
            borderWidth={1}
            borderRadius={6}
            px="$2"
            py="$1"
            ai="center"
            gap="$1"
          >
            <YStack width={5} height={5} borderRadius={3} backgroundColor="#6bc96e" />
            <Text fos={10} color="$colorMuted">GPS Active</Text>
          </XStack>
        </XStack>
      )}

      {uploadNotice ? (
        <YStack
          position="absolute"
          bottom={100}
          left={16}
          right={16}
          backgroundColor="#1a1a1a"
          borderColor="#2a2a2a"
          borderWidth={1}
          padding="$3"
          borderRadius={8}
        >
          <Text fontSize={13} color="$color" textAlign="center">
            {uploadNotice}
          </Text>
          <Text fontSize={11} color="$colorMuted" textAlign="center" marginTop="$2">
            {
              "Open Herbarium (signed in) to see uploads. On Android, JS logs may only appear in: adb logcat *:S ReactNativeJS:V"
            }
          </Text>
        </YStack>
      ) : null}

      {!session ? (
        <YStack position="absolute" top={insets.top + 8} left={16} right={16} gap="$2" pointerEvents="box-none">
          <Text fontSize={13} fontWeight="600" color="$colorMuted" textAlign="center">
            Sign in to run facade analysis and save scans. You can still capture and upload photos.
          </Text>
          <Button size="$3" backgroundColor="#1a1a1a" borderColor="#2a2a2a" borderWidth={1} onPress={() => router.push("/(auth)/sign-in")}>
            <Text color="#c8a96e" fontWeight="600">
              Sign in
            </Text>
          </Button>
        </YStack>
      ) : null}

      {phase === "uploading" ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={[StyleSheet.absoluteFill, styles.uploadOverlay]}
          pointerEvents="auto"
        >
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
            <LottieView
              source={require("../../assets/animations/loading-facade.json")}
              autoPlay
              loop
              style={{ width: 120, height: 120 }}
            />
            <Text color="$color" fontSize={15} textAlign="center">
              Uploading scan…
            </Text>
            <Text color="$colorMuted" fontSize={12} textAlign="center">
              {"Location helps record the building's address when you allow it."}
            </Text>
          </YStack>
        </Animated.View>
      ) : null}

      {phase === "analyzing" ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={[StyleSheet.absoluteFill, styles.uploadOverlay]}
          pointerEvents="auto"
        >
          <AnalyzingOverlay />
        </Animated.View>
      ) : null}

      {phase === "not_a_facade" ? (
        <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.uploadOverlay]} pointerEvents="auto">
          <NotAFacadeError onRetry={dismissNotAFacade} message={notAFacadeMessage ?? undefined} />
        </Animated.View>
      ) : null}

      {phase === "error" && errorMessage ? (
        <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.uploadOverlay]} pointerEvents="auto">
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
            <Text color="$color" fontSize={16} fontWeight="600" textAlign="center">
              {errorTitle}
            </Text>
            <Text color="$colorMuted" fontSize={14} textAlign="center">
              {errorMessage}
            </Text>
            <Button backgroundColor="#c8a96e" onPress={dismissError}>
              <Text color="#0a0a0a" fontWeight="700">
                Back to camera
              </Text>
            </Button>
          </YStack>
        </Animated.View>
      ) : null}
    </YStack>
  );
}

const styles = StyleSheet.create({
  uploadOverlay: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
