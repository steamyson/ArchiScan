import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';

function toFileUri(path: string): string {
  if (path.startsWith('file://')) {
    return path;
  }
  return `file://${path}`;
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}

/**
 * Resize to max 1500px wide (JPEG), upload to private bucket `facade-photos`.
 * Authenticated: `{user_id}/{uuid}.jpg`. Anonymous: `anonymous/{uuid}.jpg`.
 * Returns the storage object path (sign at display time).
 */
export async function uploadFacadePhoto(localPath: string): Promise<string> {
  const uri = toFileUri(localPath);
  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.85, format: SaveFormat.JPEG }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const folder = session?.user.id ?? 'anonymous';
  const objectPath = `${folder}/${randomUUID()}.jpg`;

  const buffer = await readFileAsArrayBuffer(resized.uri);
  const { error } = await supabase.storage.from('facade-photos').upload(objectPath, buffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw error;
  }
  return objectPath;
}
