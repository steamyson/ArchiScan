import { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, Text, Spinner } from 'tamagui';
import { BookBookmark } from 'phosphor-react-native';
import { useAuthStore } from '../../stores/authStore';
import { listUserFacadePhotos, type FacadePhotoItem } from '../../lib/facadeUploads';

export default function HerbariumScreen() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  const [items, setItems] = useState<FacadePhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listUserFacadePhotos(userId);
      setItems(rows);
      if (rows.length) {
        console.log('[Herbarium] loaded', rows.length, 'facade photo(s) from storage');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load photos';
      setError(msg);
      console.warn('[Herbarium] list failed', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!userId) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$4" padding="$4">
        <BookBookmark size={56} color="#888880" weight="duotone" />
        <Text fontSize={17} fontWeight="600" color="$color" textAlign="center">
          Sign in to see your herbarium
        </Text>
      </YStack>
    );
  }

  if (loading && items.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="#c8a96e" />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$3" padding="$4">
        <Text fontSize={16} fontWeight="600" color="$color" textAlign="center">
          Could not load your photos
        </Text>
        <Text fontSize={14} color="$colorMuted" textAlign="center">
          {error}
        </Text>
        <Text fontSize={12} color="$colorMuted" textAlign="center">
          Confirm Supabase Storage has a SELECT policy for your user folder (see ENV_SETUP.md).
        </Text>
      </YStack>
    );
  }

  if (items.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap="$4" padding="$4">
        <BookBookmark size={56} color="#888880" weight="duotone" />
        <Text fontSize={17} fontWeight="600" color="$color" textAlign="center">
          No facade photos yet
        </Text>
        <Text fontSize={14} color="$colorMuted" textAlign="center">
          Captures from the Scan tab are stored here after upload (signed-in users).
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop="$3">
      <Text fontSize={13} fontWeight="600" color="$colorMuted" paddingHorizontal="$4" marginBottom="$2">
        FACADE PHOTOS (SUPABASE STORAGE)
      </Text>
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => item.path}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#c8a96e" />}
        renderItem={({ item }) => (
          <YStack backgroundColor="#111111" borderRadius={8} overflow="hidden" borderWidth={1} borderColor="#2a2a2a">
            <Image source={{ uri: item.signedUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
            <Text fontSize={11} color="$colorMuted" padding="$2" numberOfLines={1}>
              {item.path.split('/').pop()}
            </Text>
          </YStack>
        )}
      />
    </YStack>
  );
}
