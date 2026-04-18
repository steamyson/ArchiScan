import { Tabs } from 'expo-router';
import { Camera, BookBookmark, User } from 'phosphor-react-native';
import { YStack, Spinner } from 'tamagui';
import { useAuthStore } from '../../stores/authStore';

export default function TabsLayout() {
  const session = useAuthStore((s) => s.session);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#0a0a0a">
        <Spinner size="large" color="#c8a96e" />
      </YStack>
    );
  }

  const authed = session !== null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#2a2a2a',
        },
        tabBarActiveTintColor: '#c8a96e',
        tabBarInactiveTintColor: '#888880',
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Camera color={color} size={size ?? 24} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="herbarium"
        options={{
          title: 'Herbarium',
          ...(authed ? {} : { href: null }),
          tabBarIcon: ({ color, size }) => (
            <BookBookmark color={color} size={size ?? 24} weight="duotone" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          ...(authed ? {} : { href: null }),
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} weight="duotone" />,
        }}
      />
    </Tabs>
  );
}
