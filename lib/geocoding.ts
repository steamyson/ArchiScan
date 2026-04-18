const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!GOOGLE_MAPS_KEY) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const data = (await res.json()) as { results?: { formatted_address: string }[] };
    if (data.results?.[0]) {
      return data.results[0].formatted_address;
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
