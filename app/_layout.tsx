import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import tamaguiConfig from '../tamagui.config';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../lib/supabase';
import { processQueue } from '../lib/offlineQueue';
import { logError } from '../lib/logger';

export default function RootLayout() {
  const { colorScheme, init } = useThemeStore();

  useEffect(() => {
    void init();
  }, [init]);

  useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    BebasNeue_400Regular,
  });
  const setSession = useAuthStore((s) => s.setSession);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setHasHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setHasHydrated(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setHasHydrated, setSession]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void processQueue().catch((err) => logError('RootLayout.processQueue', err));
      }
    });
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
        <Theme name={colorScheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
