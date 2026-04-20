import { useState } from "react";
import { useRouter } from "expo-router";
import { Button, Text } from "tamagui";
import { BookBookmark } from "phosphor-react-native";
import { useAuthStore } from "../stores/authStore";
import { markScanSaved } from "../lib/herbarium";
import { logError } from "../lib/logger";
import { getUserFriendlyMessage } from "../lib/errorMessages";

interface SaveButtonProps {
  scanId: string | null;
  initialSaved?: boolean;
  onSaved?: () => void;
}

export function SaveButton({ scanId, initialSaved = false, onSaved }: SaveButtonProps) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = saved || loading || !scanId;

  const handlePress = async () => {
    if (!session?.user.id) {
      router.push("/(auth)/sign-up");
      return;
    }
    if (!scanId) {
      return;
    }
    setSaved(true);
    setLoading(true);
    setError(null);
    try {
      await markScanSaved(scanId, session.user.id);
      onSaved?.();
    } catch (err) {
      logError("SaveButton", err);
      setSaved(false);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const label = saved ? "Saved" : loading ? "Saving…" : "Save to Herbarium";
  const color = saved ? "#c8a96e" : "#c8a96e";

  return (
    <>
      <Button
        onPress={handlePress}
        disabled={disabled}
        bg={saved ? "transparent" : "$backgroundStrong"}
        borderWidth={1}
        borderColor={saved ? "#c8a96e" : "$borderColor"}
        br="$3"
        h={44}
        pressStyle={{ opacity: 0.85 }}
        icon={<BookBookmark size={18} color={color} weight={saved ? "fill" : "regular"} />}
      >
        <Text color={saved ? "#c8a96e" : "$color"} fos={14} fontWeight="600">
          {label}
        </Text>
      </Button>
      {error ? (
        <Text fos={12} color="#c96e6e" mt="$2">
          {error}
        </Text>
      ) : null}
    </>
  );
}
