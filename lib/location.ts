import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

function toLatLng(location: Location.LocationObject): LatLng {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}

/**
 * Try a fresh fix, then a lower-power fix, then whatever the OS last cached.
 * We intentionally do not bail on `hasServicesEnabledAsync()` alone: on some Android
 * devices it reports false while fused / network location still works.
 */
async function resolveCoordinates(): Promise<Location.LocationObject | null> {
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), 3000));
  let fresh: Location.LocationObject | null = null;
  try {
    fresh = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }),
      timeout,
    ]);
  } catch (e) {
    if (__DEV__) {
      console.warn('[location] getCurrentPosition Balanced failed', e);
    }
  }
  if (fresh) return fresh;
  if (__DEV__) {
    console.warn('[location] GPS timed out or failed — falling back to last-known');
  }
  const last = await Location.getLastKnownPositionAsync({
    maxAge: 60 * 60 * 1000,
    requiredAccuracy: 10_000,
  });
  return last;
}

/**
 * Requests foreground location permission and returns current coordinates.
 * Call from the capture flow (not on cold start) so the prompt has context.
 */
export async function captureLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const location = await resolveCoordinates();
  if (!location) {
    if (__DEV__) {
      console.warn('[location] no coordinates (permission denied earlier, services off, or no fix yet)');
    }
    return null;
  }
  return toLatLng(location);
}
