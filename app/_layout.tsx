import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
        <Stack screenOptions={{ headerShown: false }} />
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
