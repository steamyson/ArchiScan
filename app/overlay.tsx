import { useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OverlayCanvas } from "../components/OverlayCanvas";
import { OverlaySheet } from "../components/OverlaySheet";
import { CritiqueScreen, CritiqueUnavailable } from "../components/CritiqueScreen";
import { SaveButton } from "../components/SaveButton";
import { VisibilityNote } from "../components/VisibilityNote";
import { useScanStore } from "../stores/scanStore";

const TAB_BAR_HEIGHT = 76;

type OverlayView = "overlay" | "critique";

export default function OverlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const analysis = useScanStore((s) => s.analysis);
  const localPhotoUri = useScanStore((s) => s.localPhotoUri);
  const buildingAddress = useScanStore((s) => s.buildingAddress);
  const scanId = useScanStore((s) => s.scanId);
  const visibilityNote = useScanStore((s) => s.visibilityNote);
  const [view, setView] = useState<OverlayView>("overlay");
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleDismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/scan");
  };

  useEffect(() => {
    if (!analysis || !localPhotoUri) handleDismiss();
  }, [analysis, localPhotoUri]);

  // Sheet slides in after element labels have staggered
  useEffect(() => {
    if (!analysis) return;
    const delay = analysis.elements.length * 80 + 1400;
    const t = setTimeout(() => setSheetVisible(true), delay);
    return () => clearTimeout(t);
  }, [analysis]);

  if (!analysis || !localPhotoUri) {
    return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  }

  if (view === "critique") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <Pressable
          onPress={() => setView("overlay")}
          style={[styles.backBtn, { top: insets.top + 8, left: 12 }]}
          hitSlop={12}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 52 }}
          showsVerticalScrollIndicator={false}
        >
          {analysis.critique ? (
            <CritiqueScreen
              critique={analysis.critique}
              summary={analysis.building_summary}
              address={buildingAddress}
            />
          ) : (
            <CritiqueUnavailable />
          )}
          {visibilityNote ? <VisibilityNote message={visibilityNote} /> : null}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <SaveButton scanId={scanId} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Full-bleed canvas */}
      <View style={StyleSheet.absoluteFill}>
        <OverlayCanvas elements={analysis.elements} imageUri={localPhotoUri} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={handleDismiss} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        {buildingAddress ? (
          <View style={styles.addressBadge}>
            <Text style={styles.addressText} numberOfLines={1}>{buildingAddress}</Text>
          </View>
        ) : null}
      </View>

      {/* Hierarchy legend */}
      <View style={[styles.legend, { top: insets.top + 90 }]} pointerEvents="none">
        {[
          { label: "Structure", color: "#c8a96e" },
          { label: "Cladding", color: "#b89264" },
          { label: "Ornament", color: "#8a7455" },
        ].map((h) => (
          <View key={h.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: h.color }]} />
            <Text style={styles.legendLabel}>{h.label}</Text>
          </View>
        ))}
      </View>

      {/* Identifying hint before sheet appears */}
      {!sheetVisible && (
        <View style={[styles.hintWrap, { bottom: TAB_BAR_HEIGHT + 14 }]} pointerEvents="none">
          <Text style={styles.hintText}>Identifying elements…</Text>
        </View>
      )}

      {/* Draggable summary sheet */}
      {sheetVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <OverlaySheet
            visible={sheetVisible}
            summary={analysis.building_summary}
            address={buildingAddress}
            onReadCritique={() => setView("critique")}
            bottomOffset={TAB_BAR_HEIGHT}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 10,
  },
  backBtn: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 18,
    color: "#f0ede8",
    lineHeight: 20,
  },
  addressBadge: {
    backgroundColor: "rgba(10, 10, 10, 0.8)",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 160,
    alignSelf: "flex-end",
    marginRight: 0,
  },
  addressText: {
    fontSize: 9,
    color: "#888880",
  },
  legend: {
    position: "absolute",
    right: 8,
    backgroundColor: "rgba(10, 10, 10, 0.7)",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 5,
    padding: 7,
    gap: 5,
    zIndex: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  legendLabel: {
    fontSize: 8,
    color: "#888880",
    fontWeight: "500",
  },
  hintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  hintText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
    letterSpacing: 0.5,
  },
});
