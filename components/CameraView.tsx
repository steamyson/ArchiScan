import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import type { CameraRef } from 'react-native-vision-camera/lib/views/Camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { XStack, YStack, Text, Button } from 'tamagui';
import { FocusRing } from './FocusRing';
import { CaptureButton } from './CaptureButton';
import { clockwiseDegreesForPhotoOrientation, type PhotoOrientation } from '../lib/storage';

type CameraViewProps = {
  onCapture: (payload: { path: string; orientation: PhotoOrientation }) => void;
  /** Called when takePhoto fails (session not ready, etc.) — otherwise errors are silent. */
  onCaptureError?: (message: string) => void;
  isCapturing?: boolean;
};

export function CameraView({ onCapture, onCaptureError, isCapturing }: CameraViewProps) {
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<CameraRef>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{ path: string; orientation: PhotoOrientation } | null>(null);

  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);
  const focusOpacity = useSharedValue(0);

  useEffect(() => {
    setSessionStarted(false);
  }, [device]);

  const handleFocus = useCallback(async (x: number, y: number) => {
    try {
      await cameraRef.current?.focusTo({ x, y });
    } catch {
      // focus can fail while session is reconfiguring; ignore
    }
  }, []);

  const tapGesture = Gesture.Tap().onEnd((e) => {
    focusX.value = e.x;
    focusY.value = e.y;
    focusOpacity.value = 0;
    focusOpacity.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 800 }));
    runOnJS(handleFocus)(e.x, e.y);
  });

  const takePicture = useCallback(async () => {
    if (!sessionStarted || !isFocused) {
      return;
    }
    try {
      const photo = await photoOutput.capturePhoto({ flashMode: 'off', enableShutterSound: false }, {});
      const path = await photo.saveToTemporaryFileAsync();
      setCapturedPhoto({ path, orientation: photo.orientation });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Photo capture failed';
      console.warn('[M1] photo capture error', e);
      onCaptureError?.(msg);
    }
  }, [isFocused, onCaptureError, photoOutput, sessionStarted]);

  if (!hasPermission) {
    return (
      <YStack flex={1} bg="$background" ai="center" jc="center" gap="$4" padding="$4">
        <Text color="$color" ta="center">
          FacadeLens needs camera access to scan buildings.
        </Text>
        <Button backgroundColor="#c8a96e" onPress={() => void requestPermission()}>
          <Text color="#0a0a0a" fontWeight="700">
            Enable camera
          </Text>
        </Button>
      </YStack>
    );
  }

  if (!device) {
    return <YStack flex={1} bg="$background" />;
  }

  if (capturedPhoto) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: `file://${capturedPhoto.path}` }}
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { rotate: `${clockwiseDegreesForPhotoOrientation(capturedPhoto.orientation)}deg` },
              ],
            },
          ]}
          resizeMode="cover"
        />
        <XStack
          position="absolute"
          bottom={48}
          left={24}
          right={24}
          gap="$3"
        >
          <Button
            flex={1}
            backgroundColor="rgba(30,30,30,0.85)"
            borderColor="rgba(255,255,255,0.15)"
            borderWidth={1}
            onPress={() => setCapturedPhoto(null)}
          >
            <Text color="#ffffff" fontWeight="600">Retake</Text>
          </Button>
          <Button
            flex={1}
            backgroundColor="#c8a96e"
            onPress={() => onCapture(capturedPhoto)}
          >
            <Text color="#0a0a0a" fontWeight="700">Continue</Text>
          </Button>
        </XStack>
      </View>
    );
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={StyleSheet.absoluteFill}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          outputs={[photoOutput]}
          enableNativeZoomGesture
          onStarted={() => setSessionStarted(true)}
          onStopped={() => setSessionStarted(false)}
        />
        <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <FocusRing x={focusX} y={focusY} opacity={focusOpacity} />
        </Animated.View>
        <CaptureButton
          onPress={() => void takePicture()}
          disabled={isCapturing || !sessionStarted || !isFocused}
        />
      </View>
    </GestureDetector>
  );
}
