import * as SecureStore from "expo-secure-store";

const FIRST_LAUNCH_KEY = "facadelens_has_launched";

export async function hasLaunchedBefore(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
  return value === "true";
}

export async function markLaunched(): Promise<void> {
  await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "true");
}

export async function resetLaunchFlag(): Promise<void> {
  await SecureStore.deleteItemAsync(FIRST_LAUNCH_KEY);
}
