import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store warns (and will eventually throw) on values > 2048 bytes.
 * Supabase's serialized session exceeds that when the project uses asymmetric
 * JWT signing keys (ES256 / RS256). This adapter transparently splits large
 * values across N keys and reassembles them on read. Legacy single-key values
 * are still readable, so existing users migrate on their next session write.
 */
const CHUNK_SIZE = 1800;
const META_SUFFIX = ".meta";
const CHUNK_SUFFIX = ".chunk.";

async function readChunked(key: string): Promise<string | null> {
  const metaRaw = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
  if (!metaRaw) {
    return SecureStore.getItemAsync(key);
  }
  const count = Number.parseInt(metaRaw, 10);
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}${CHUNK_SUFFIX}${i}`)),
  );
  if (chunks.some((c) => c === null)) {
    return null;
  }
  return chunks.join("");
}

async function clearChunks(key: string): Promise<void> {
  const metaRaw = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`);
  if (metaRaw) {
    const count = Number.parseInt(metaRaw, 10);
    if (Number.isFinite(count) && count > 0) {
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}${CHUNK_SUFFIX}${i}`),
        ),
      );
    }
    await SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`);
  }
  await SecureStore.deleteItemAsync(key);
}

async function writeChunked(key: string, value: string): Promise<void> {
  await clearChunks(key);
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const count = Math.ceil(value.length / CHUNK_SIZE);
  const writes: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    writes.push(
      SecureStore.setItemAsync(`${key}${CHUNK_SUFFIX}${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)),
    );
  }
  await Promise.all(writes);
  await SecureStore.setItemAsync(`${key}${META_SUFFIX}`, String(count));
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => readChunked(key),
  setItem: (key: string, value: string) => writeChunked(key, value),
  removeItem: (key: string) => clearChunks(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "FacadeLens: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Add them to .env.local (see ENV_SETUP.md).",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
