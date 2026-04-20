import { useState } from 'react';
import { Platform } from 'react-native';
import { YStack, XStack, Button, Text } from 'tamagui';
import { AppleLogo } from 'phosphor-react-native';
import { signInWithApple, signInWithGoogle } from '../lib/auth';
import { logError } from '../lib/logger';

interface OAuthButtonsProps {
  onSuccess: () => void;
  disabled?: boolean;
}

export function OAuthButtons({ onSuccess, disabled }: OAuthButtonsProps) {
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (provider: 'google' | 'apple') => {
    setError(null);
    setBusy(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (message !== 'OAuth cancelled') {
        logError(`OAuthButtons.${provider}`, err);
        setError(message);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <YStack gap="$3">
      <XStack ai="center" gap="$3">
        <YStack flex={1} height={1} bg="$borderColor" />
        <Text fontSize={12} color="$colorMuted" textTransform="uppercase" letterSpacing={1.2}>
          or
        </Text>
        <YStack flex={1} height={1} bg="$borderColor" />
      </XStack>

      <Button
        backgroundColor="$backgroundStrong"
        borderColor="$borderColor"
        borderWidth={1}
        disabled={disabled || busy !== null}
        onPress={() => void handle('google')}
      >
        <XStack ai="center" gap="$2">
          <Text color="#c8a96e" fontWeight="700" fontSize={15}>
            G
          </Text>
          <Text color="$color" fontWeight="600" fontSize={15}>
            {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
          </Text>
        </XStack>
      </Button>

      {Platform.OS === 'ios' ? (
        <Button
          backgroundColor="#f0ede8"
          disabled={disabled || busy !== null}
          onPress={() => void handle('apple')}
        >
          <XStack ai="center" gap="$2">
            <AppleLogo size={18} weight="fill" color="#0a0a0a" />
            <Text color="#0a0a0a" fontWeight="700" fontSize={15}>
              {busy === 'apple' ? 'Connecting…' : 'Continue with Apple'}
            </Text>
          </XStack>
        </Button>
      ) : null}

      {error ? (
        <Text color="#c96e6e" fontSize={13} textAlign="center">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
