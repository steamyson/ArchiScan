import { supabase } from './supabase';

export type FacadePhotoItem = {
  path: string;
  signedUrl: string;
};

const SIGN_URL_CONCURRENCY = 10;

async function mapInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.all(batch.map((item) => fn(item)));
    for (const r of settled) {
      if (r != null) {
        out.push(r);
      }
    }
  }
  return out;
}

/**
 * Lists JPEGs in `facade-photos/{userId}/` and returns short-lived signed URLs for display.
 * Requires Storage SELECT policy for the user's folder (see ENV_SETUP.md).
 */
export async function listUserFacadePhotos(userId: string): Promise<FacadePhotoItem[]> {
  const listStart = __DEV__ ? globalThis.performance.now() : 0;
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

  const paths = files
    .map((f) => f.name)
    .filter((name): name is string => Boolean(name) && name !== '.emptyFolderPlaceholder')
    .map((name) => `${userId}/${name}`);

  const items = await mapInBatches(paths, SIGN_URL_CONCURRENCY, async (path) => {
    const { data: signed, error: signErr } = await supabase.storage.from('facade-photos').createSignedUrl(path, 3600);
    if (signErr || !signed?.signedUrl) {
      return null;
    }
    return { path, signedUrl: signed.signedUrl };
  });

  if (__DEV__) {
    console.log(
      '[Herbarium][timing] list+sign ms',
      Math.round(globalThis.performance.now() - listStart),
      'files',
      paths.length,
    );
  }

  return items;
}
