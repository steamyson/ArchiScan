import { useEffect, useMemo, useState } from "react";
import { Dimensions, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import type { ArchitecturalElement } from "../types/scan";
import { computeLabelPositions } from "../lib/overlayLayout";
import { LeaderLineOverlay } from "./LeaderLineOverlay";
import { MarkerOverlay } from "./MarkerOverlay";
import { ElementDetailCard } from "./ElementDetailCard";
import { usePreferencesStore } from "../stores/preferencesStore";

interface Props {
  elements: ArchitecturalElement[];
  imageUri: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Aspect-fit (a.k.a. `contain`) the image within the available area. */
function computeImageRect(imageW: number, imageH: number, frameW: number, frameH: number): Rect {
  const imageAspect = imageW / imageH;
  const frameAspect = frameW / frameH;
  if (imageAspect > frameAspect) {
    const h = frameW / imageAspect;
    return { x: 0, y: (frameH - h) / 2, w: frameW, h };
  }
  const w = frameH * imageAspect;
  return { x: (frameW - w) / 2, y: 0, w, h: frameH };
}

export function OverlayCanvas({ elements, imageUri }: Props) {
  const insets = useSafeAreaInsets();
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<ArchitecturalElement | null>(null);
  const overlayMode = usePreferencesStore((s) => s.overlayMode);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      imageUri,
      (w, h) => {
        if (!cancelled) setImageSize({ w, h });
      },
      () => {
        if (!cancelled) setImageSize({ w: SCREEN_WIDTH, h: SCREEN_HEIGHT });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const layout = useMemo(() => {
    if (!imageSize) return null;
    const frameH = SCREEN_HEIGHT - insets.top - insets.bottom;
    const rect = computeImageRect(imageSize.w, imageSize.h, SCREEN_WIDTH, frameH);
    const positions = computeLabelPositions(elements, rect.w, rect.h);
    return { rect, positions };
  }, [imageSize, elements, insets.top, insets.bottom]);

  return (
    <YStack flex={1} backgroundColor="$background">
      {layout ? (
        <>
          <Image
            source={{ uri: imageUri }}
            style={{
              position: "absolute",
              left: layout.rect.x,
              top: insets.top + layout.rect.y,
              width: layout.rect.w,
              height: layout.rect.h,
            }}
            resizeMode="contain"
          />
          <YStack
            position="absolute"
            left={layout.rect.x}
            top={insets.top + layout.rect.y}
            width={layout.rect.w}
            height={layout.rect.h}
            pointerEvents="box-none"
          >
            {overlayMode === 'diagram' ? (
              <LeaderLineOverlay
                positions={layout.positions}
                containerWidth={layout.rect.w}
                onLabelPress={setSelected}
              />
            ) : (
              <MarkerOverlay
                positions={layout.positions}
                containerWidth={layout.rect.w}
                containerHeight={layout.rect.h}
                onMarkerPress={setSelected}
              />
            )}
          </YStack>
        </>
      ) : null}

      <YStack style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <ElementDetailCard element={selected} onDismiss={() => setSelected(null)} />
      </YStack>
    </YStack>
  );
}
