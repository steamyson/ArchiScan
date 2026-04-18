import { supabase } from './supabase';

export type FacadePhotoItem = {
  path: string;
  signedUrl: string;
};

/**
 * Lists JPEGs in `facade-photos/{userId}/` and returns short-lived signed URLs for display.
 * Requires Storage SELECT policy for the user's folder (see ENV_SETUP.md).
 */
export async function listUserFacadePhotos(userId: string): Promise<FacadePhotoItem[]> {
  const { data: files, error } = await supabase.storage.from('facade-photos').list(userId, {
    limit: 50,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) {
    throw error;
  }
  if (!files?.length) {
    return [];
  }

  const items: FacadePhotoItem[] = [];
  for (const f of files) {
    if (!f.name || f.name === '.emptyFolderPlaceholder') {
      continue;
    }
    const path = `${userId}/${f.name}`;
    const { data: signed, error: signErr } = await supabase.storage
      .from('facade-photos')
      .createSignedUrl(path, 3600);
    if (signErr || !signed?.signedUrl) {
      continue;
    }
    items.push({ path, signedUrl: signed.signedUrl });
  }
  return items;
}
