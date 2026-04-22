import { create } from "zustand";
import type { AnalysisResult } from "../types/scan";

export interface SampleAttribution {
  photographerName: string;
  photographerUrl: string;
}

interface ScanState {
  scanId: string | null;
  analysis: AnalysisResult | null;
  localPhotoUri: string | null;
  storagePath: string | null;
  buildingAddress: string | null;
  visibilityNote: string | null;
  sampleAttribution: SampleAttribution | null;

  setResult: (payload: {
    scanId: string | null;
    analysis: AnalysisResult;
    localPhotoUri: string;
    storagePath: string | null;
    buildingAddress: string | null;
    visibilityNote: string | null;
    sampleAttribution?: SampleAttribution | null;
  }) => void;
  clear: () => void;
}

const initialState = {
  scanId: null,
  analysis: null,
  localPhotoUri: null,
  storagePath: null,
  buildingAddress: null,
  visibilityNote: null,
  sampleAttribution: null,
};

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,
  setResult: ({ scanId, analysis, localPhotoUri, storagePath, buildingAddress, visibilityNote, sampleAttribution = null }) =>
    set({ scanId, analysis, localPhotoUri, storagePath, buildingAddress, visibilityNote, sampleAttribution }),
  clear: () => set(initialState),
}));
