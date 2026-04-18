import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { Action } from 'expo-image-manipulator/build/ImageManipulator.types';
import { randomUUID } from 'expo-crypto';
import type { Orientation } from 'react-native-vision-camera';
import { supabase } from './supabase';

/** Same as VisionCamera `Photo.orientation` — re-exported for callers. */
export type PhotoOrientation = Orientation;

/** Clockwise `expo-image-manipulator` rotation to bake `Photo.orientation` into pixels (RN Image ignores EXIF). */
function rotationCorrectionDegrees(orientation: Orientation): number {
  switch (orientation) {
    case 'up':
      return 0;
    case 'right':
      return 270;
    case 'down':
      return 180;
    case 'left':
      return 90;
    default:
      return 0;
  }
}

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
export async function uploadFacadePhoto(localPath: string, orientation: PhotoOrientation): Promise<string> {
  const uri = toFileUri(localPath);
  const rotation = rotationCorrectionDegrees(orientation);
  const actions: Action[] = [];
  if (rotation !== 0) {
    actions.push({ rotate: rotation });
  }
  actions.push({ resize: { width: 1500 } });
  const resized = await manipulateAsync(uri, actions, { compress: 0.85, format: SaveFormat.JPEG });

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
