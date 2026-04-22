import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSampleFacadePhoto } from "./unsplash";

const CACHE_KEY = "facadelens_sample_photo_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SamplePhoto {
  localUri: string;
  remoteUrl: string;
  photographerName: string;
  photographerUrl: string;
  cachedAt: string;
}

export async function getSamplePhotoCached(): Promise<SamplePhoto> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (raw) {
    try {
      const cached = JSON.parse(raw) as SamplePhoto;
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < CACHE_TTL_MS) {
        const info = await FileSystem.getInfoAsync(cached.localUri);
        if (info.exists) return cached;
      }
    } catch {
      // fall through to re-fetch
    }
  }

  const photo = await fetchSampleFacadePhoto();
  const base = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}cache/`;
  const localUri = `${base}sample_facade_${photo.id}.jpg`;
  await FileSystem.downloadAsync(photo.url, localUri);

  const entry: SamplePhoto = {
    localUri,
    remoteUrl: photo.url,
    photographerName: photo.photographerName,
    photographerUrl: photo.photographerUrl,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  return entry;
}
