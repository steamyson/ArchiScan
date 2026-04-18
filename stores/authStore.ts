import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  hasHydrated: boolean;
  setSession: (session: Session | null) => void;
  setHasHydrated: (value: boolean) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hasHydrated: false,
  setSession: (session) => set({ session }),
  setHasHydrated: (value) => set({ hasHydrated: value }),
  isAuthenticated: () => get().session !== null,
}));
