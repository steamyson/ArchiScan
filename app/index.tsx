import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { YStack } from 'tamagui';
import { hasLaunchedBefore } from '../lib/firstLaunch';
import { logError } from '../lib/logger';

type Destination = '/welcome' | '/(tabs)/scan';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const launched = await hasLaunchedBefore();
        if (cancelled) return;
        setDestination(launched ? '/(tabs)/scan' : '/welcome');
      } catch (err) {
        logError('Index.hasLaunchedBefore', err);
        if (cancelled) return;
        setDestination('/(tabs)/scan');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!destination) {
    return <YStack flex={1} bg="$background" />;
  }

  return <Redirect href={destination} />;
}
