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
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[location] getCurrentPosition Balanced failed', e);
    }
  }
  const last = await Location.getLastKnownPositionAsync({
    maxAge: 60 * 60 * 1000,
    requiredAccuracy: 10_000,
  });
  if (last && __DEV__) {
    console.warn('[location] using last-known position (may be stale)');
  }
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
