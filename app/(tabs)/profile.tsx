import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Button, Switch } from 'tamagui';
import { MapPin, BookOpen, CircleIcon } from 'phosphor-react-native';
import { signOut } from '../../lib/auth';
import { logError } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { usePreferencesStore } from '../../stores/preferencesStore';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const { colorScheme, toggleColorScheme } = useThemeStore();
  const overlayMode = usePreferencesStore((s) => s.overlayMode);
  const setOverlayMode = usePreferencesStore((s) => s.setOverlayMode);
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
      <YStack gap="$2">
        <Text fos={13} fw="700" color="#c8a96e" tt="uppercase" ls={1.2}>
          Overlay Style
        </Text>
        <Text fos={13} color="$colorMuted" mb="$2">
          How architectural elements are shown when you scan a building.
        </Text>

        <Pressable onPress={() => setOverlayMode('markers')}>
          <XStack
            bg="$backgroundStrong"
            br="$4"
            borderWidth={1}
            borderColor={overlayMode === 'markers' ? '#c8a96e' : '$borderColor'}
            p="$4"
            gap="$3"
            ai="center"
          >
            <MapPin
              size={20}
              color={overlayMode === 'markers' ? '#c8a96e' : '#888880'}
              weight={overlayMode === 'markers' ? 'fill' : 'regular'}
            />
            <YStack flex={1} gap="$1">
              <Text fos={15} color="$color" fw="600">Markers</Text>
              <Text fos={13} color="$colorMuted">
                Colored dots on each feature. Tap to learn more.
              </Text>
            </YStack>
            {overlayMode === 'markers' && (
              <CircleIcon size={8} color="#c8a96e" weight="fill" />
            )}
          </XStack>
        </Pressable>

        <Pressable onPress={() => setOverlayMode('diagram')}>
          <XStack
            bg="$backgroundStrong"
            br="$4"
            borderWidth={1}
            borderColor={overlayMode === 'diagram' ? '#c8a96e' : '$borderColor'}
            p="$4"
            gap="$3"
            ai="center"
          >
            <BookOpen
              size={20}
              color={overlayMode === 'diagram' ? '#c8a96e' : '#888880'}
              weight={overlayMode === 'diagram' ? 'fill' : 'regular'}
            />
            <YStack flex={1} gap="$1">
              <Text fos={15} color="$color" fw="600">Diagram</Text>
              <Text fos={13} color="$colorMuted">
                Labeled annotations with lines to each feature.
              </Text>
            </YStack>
            {overlayMode === 'diagram' && (
              <CircleIcon size={8} color="#c8a96e" weight="fill" />
            )}
          </XStack>
        </Pressable>
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
