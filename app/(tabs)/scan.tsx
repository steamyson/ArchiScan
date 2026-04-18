import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { YStack, Text, Button } from 'tamagui';
import { CameraView } from '../../components/CameraView';
import { uploadFacadePhoto, type PhotoOrientation } from '../../lib/storage';
import { captureLocation } from '../../lib/location';
import { reverseGeocode } from '../../lib/geocoding';
import { useAuthStore } from '../../stores/authStore';

type ScanPhase = 'camera' | 'uploading' | 'error';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const [phase, setPhase] = useState<ScanPhase>('camera');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadNotice) {
      return;
    }
    const t = setTimeout(() => setUploadNotice(null), 8000);
    return () => clearTimeout(t);
  }, [uploadNotice]);

  const onCaptureError = useCallback((message: string) => {
    setErrorMessage(message);
    setPhase('error');
  }, []);

  const onPhotoCaptured = useCallback(async (payload: { path: string; orientation: PhotoOrientation }) => {
    const { path: photoPath, orientation } = payload;
    const pipelineStart = __DEV__ ? globalThis.performance.now() : 0;
    console.log('[M1] upload pipeline started', photoPath, 'orientation', orientation);
    setPhase('uploading');
    setErrorMessage(null);

    // Location + geocode run in parallel with upload; M2 can persist metadata from DB later.
    void (async () => {
      const t0 = __DEV__ ? globalThis.performance.now() : 0;
      try {
        const coords = await captureLocation();
        if (coords) {
          console.log('[M1] GPS', coords.lat, coords.lng);
          const address = await reverseGeocode(coords.lat, coords.lng);
          console.log('[M1] address', address);
        } else {
          console.log('[M1] GPS unavailable (permission denied, services off, or no fix)');
        }
        if (__DEV__) {
          console.log('[M1][timing] location+geocode (non-blocking) ms', Math.round(globalThis.performance.now() - t0));
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[M1] location metadata failed (non-blocking)', err);
        }
      }
    })();

    try {
      const uploadStart = __DEV__ ? globalThis.performance.now() : 0;
      const storagePath = await uploadFacadePhoto(photoPath, orientation);
      if (__DEV__) {
        const now = globalThis.performance.now();
        console.log('[M1][timing] upload (resize+storage) ms', Math.round(now - uploadStart));
        console.log('[M1][timing] until upload done (overlay) ms', Math.round(now - pipelineStart));
      }
      console.log('[M1] storage path', storagePath);
      setUploadNotice(`Uploaded: ${storagePath}`);
      setPhase('camera');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      console.error('[M1] capture pipeline error', e);
      setErrorMessage(message);
      setPhase('error');
    }
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setPhase('camera');
  }, []);

  return (
    <YStack flex={1} backgroundColor="$background">
      <CameraView onCapture={onPhotoCaptured} onCaptureError={onCaptureError} isCapturing={phase === 'uploading'} />

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
        <YStack
          position="absolute"
          top={insets.top + 8}
          left={16}
          right={16}
          gap="$2"
          pointerEvents="box-none"
        >
          <Text fontSize={13} fontWeight="600" color="$colorMuted" textAlign="center">
            Sign in to save scans to Herbarium. You can still capture here.
          </Text>
          <Button size="$3" backgroundColor="#1a1a1a" borderColor="#2a2a2a" borderWidth={1} onPress={() => router.push('/(auth)/sign-in')}>
            <Text color="#c8a96e" fontWeight="600">
              Sign in
            </Text>
          </Button>
        </YStack>
      ) : null}

      {phase === 'uploading' ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={[StyleSheet.absoluteFill, styles.uploadOverlay]}
          pointerEvents="auto"
        >
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
            <LottieView
              source={require('../../assets/animations/loading-facade.json')}
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

      {phase === 'error' && errorMessage ? (
        <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.uploadOverlay]} pointerEvents="auto">
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
            <Text color="$color" fontSize={16} fontWeight="600" textAlign="center">
              {"Couldn't upload photo"}
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
