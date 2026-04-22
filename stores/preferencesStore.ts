import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type OverlayMode = 'markers' | 'diagram'

interface PreferencesState {
  overlayMode: OverlayMode
  setOverlayMode: (mode: OverlayMode) => void
  init: () => Promise<void>
}

const STORAGE_KEY = 'prefs_overlay_mode'

export const usePreferencesStore = create<PreferencesState>((set) => ({
  overlayMode: 'markers',
  setOverlayMode: (mode) => {
    set({ overlayMode: mode })
    void AsyncStorage.setItem(STORAGE_KEY, mode)
  },
  init: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored === 'markers' || stored === 'diagram') set({ overlayMode: stored })
  },
}))
