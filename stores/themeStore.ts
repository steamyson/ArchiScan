import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type ThemeStore = {
  colorScheme: 'dark' | 'light';
  init: () => Promise<void>;
  toggleColorScheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  colorScheme: 'dark',
  init: async () => {
    const stored = await AsyncStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') set({ colorScheme: stored });
  },
  toggleColorScheme: () => {
    const next = get().colorScheme === 'dark' ? 'light' : 'dark';
    set({ colorScheme: next });
    void AsyncStorage.setItem('theme', next);
  },
}));
