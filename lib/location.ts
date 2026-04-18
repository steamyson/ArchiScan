import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

/**
 * Requests foreground location permission and returns current coordinates.
 * Call from the capture flow (not on cold start) so the prompt has context.
 */
export async function captureLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return null;
  }
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch {
    // Emulators often have no GNSS fix; user may have location off — capture/upload should still proceed.
    return null;
  }
}
