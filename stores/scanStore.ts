import { create } from "zustand";
import type { AnalysisResult } from "../types/scan";

interface ScanState {
  scanId: string | null;
  analysis: AnalysisResult | null;
  localPhotoUri: string | null;
  storagePath: string | null;
  buildingAddress: string | null;

  setResult: (payload: {
    scanId: string;
    analysis: AnalysisResult;
    localPhotoUri: string;
    storagePath: string;
    buildingAddress: string | null;
  }) => void;
  clear: () => void;
}

const initialState = {
  scanId: null,
  analysis: null,
  localPhotoUri: null,
  storagePath: null,
  buildingAddress: null,
};

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,
  setResult: ({ scanId, analysis, localPhotoUri, storagePath, buildingAddress }) =>
    set({ scanId, analysis, localPhotoUri, storagePath, buildingAddress }),
  clear: () => set(initialState),
}));
