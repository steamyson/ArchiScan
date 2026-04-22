import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Button, Switch } from 'tamagui';
import { signOut } from '../../lib/auth';
import { logError } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const { colorScheme, toggleColorScheme } = useThemeStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scanCount, setScanCount] = useState<number | null>(null);

  const userId = session?.user.id ?? null;

  const fetchScanCount = useCallback(async () => {
    if (!userId) {
      setScanCount(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('scan_count')
      .eq('id', userId)
      .single();
    if (error) {
      logError('ProfileScreen.fetchScanCount', error);
      setScanCount(null);
      return;
    }
    setScanCount((data as { scan_count: number | null } | null)?.scan_count ?? 0);
  }, [userId]);

  useEffect(() => {
    void fetchScanCount();
  }, [fetchScanCount]);

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined)?.trim() || '—';
  const email = session?.user.email ?? '—';

  const onSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/(tabs)/scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4" gap="$4" justifyContent="center">
      <YStack gap="$2">
        <Text fontSize={13} fontWeight="600" color="$colorMuted" textTransform="uppercase">
          Display name
        </Text>
        <Text fontSize={22} fontWeight="700" color="$color">
          {displayName}
        </Text>
      </YStack>
      <YStack gap="$2">
        <Text fontSize={13} fontWeight="600" color="$colorMuted" textTransform="uppercase">
          Email
        </Text>
        <Text fontSize={17} color="$color">
          {email}
        </Text>
      </YStack>
      <YStack gap="$2">
        <Text fontSize={13} fontWeight="600" color="$colorMuted" textTransform="uppercase">
          Scans
        </Text>
        <Text fontSize={22} fontWeight="700" color="#c8a96e">
          {scanCount ?? '—'}
        </Text>
      </YStack>
      <XStack justifyContent="space-between" alignItems="center" paddingVertical="$3">
        <Text fontSize={15} color="$color">Light mode</Text>
        <Switch
          checked={colorScheme === 'light'}
          onCheckedChange={toggleColorScheme}
          size="$3"
          backgroundColor={colorScheme === 'light' ? '#c8a96e' : '$backgroundFocus'}
        >
          <Switch.Thumb animation="quick" />
        </Switch>
      </XStack>
      <Button
        marginTop="$4"
        backgroundColor="$backgroundFocus"
        borderColor="$borderColor"
        borderWidth={1}
        disabled={loading}
        onPress={() => void onSignOut()}
      >
        <Text color="$color">Sign Out</Text>
      </Button>
    </YStack>
  );
}
