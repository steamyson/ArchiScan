import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import { YStack, Input, Button, Text } from 'tamagui';
import { signUpWithEmail } from '../../lib/auth';

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: signUpError } = await signUpWithEmail(
        email.trim(),
        password,
        displayName.trim()
      );
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      router.replace('/(tabs)/scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$3">
          <Text fontSize={28} fontWeight="700" color="$color" marginBottom="$2">
            Create account
          </Text>
          <Input
            placeholder="Display name"
            placeholderTextColor="$colorMuted"
            value={displayName}
            onChangeText={setDisplayName}
            backgroundColor="$backgroundStrong"
            borderColor="$borderColor"
            color="$color"
          />
          <Input
            placeholder="Email"
            placeholderTextColor="$colorMuted"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            backgroundColor="$backgroundStrong"
            borderColor="$borderColor"
            color="$color"
          />
          <Input
            placeholder="Password"
            placeholderTextColor="$colorMuted"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            backgroundColor="$backgroundStrong"
            borderColor="$borderColor"
            color="$color"
          />
          {error ? (
            <Text color="#c96e6e" fontSize={14}>
              {error}
            </Text>
          ) : null}
          <Button
            marginTop="$2"
            backgroundColor="#c8a96e"
            disabled={loading}
            onPress={() => void onSubmit()}
          >
            <Text color="#0a0a0a" fontWeight="700">
              Sign Up
            </Text>
          </Button>
          <Button
            unstyled
            marginTop="$3"
            onPress={() => router.push('/(auth)/sign-in')}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text color="#c8a96e" textAlign="center" fontSize={15}>
              Already have an account? Sign in
            </Text>
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
