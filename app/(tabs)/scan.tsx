import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { YStack, Text, Button } from 'tamagui';
import { CameraView } from '../../components/CameraView';
import { uploadFacadePhoto } from '../../lib/storage';
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

  const onPhotoCaptured = useCallback(async (photoPath: string) => {
    setPhase('uploading');
    setErrorMessage(null);
    try {
      const coords = await captureLocation();
      if (coords) {
        console.log('[M1] GPS', coords.lat, coords.lng);
        const address = await reverseGeocode(coords.lat, coords.lng);
        console.log('[M1] address', address);
      } else {
        console.log('[M1] GPS unavailable (permission denied or error)');
      }

      const storagePath = await uploadFacadePhoto(photoPath);
      console.log('[M1] storage path', storagePath);
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
      <CameraView onCapture={onPhotoCaptured} isCapturing={phase === 'uploading'} />

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
