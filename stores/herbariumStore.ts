import { create } from "zustand";
import type { HerbariumFilters } from "../lib/herbarium";

export type HerbariumViewMode = "grid" | "list";

interface HerbariumState {
  viewMode: HerbariumViewMode;
  filters: HerbariumFilters;
  setViewMode: (mode: HerbariumViewMode) => void;
  setFilters: (filters: HerbariumFilters) => void;
  clearFilters: () => void;
}

export const useHerbariumStore = create<HerbariumState>((set) => ({
  viewMode: "grid",
  filters: {},
  setViewMode: (viewMode) => set({ viewMode }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}));
