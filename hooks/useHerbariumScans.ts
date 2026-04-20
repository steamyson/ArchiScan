import { useCallback, useEffect, useState } from "react";
import { fetchHerbariumScans, getSignedUrl } from "../lib/herbarium";
import { useAuthStore } from "../stores/authStore";
import { useHerbariumStore } from "../stores/herbariumStore";
import { getUserFriendlyMessage } from "../lib/errorMessages";
import { logError } from "../lib/logger";
import type { ScanRecord } from "../types/scan";

interface UseHerbariumScansResult {
  scans: ScanRecord[];
  signedUrls: Record<string, string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SIGN_URL_CONCURRENCY = 10;

async function signUrlsInBatches(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < paths.length; i += SIGN_URL_CONCURRENCY) {
    const batch = paths.slice(i, i + SIGN_URL_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (path) => {
        try {
          return [path, await getSignedUrl(path)] as const;
        } catch (err) {
          logError("useHerbariumScans.signUrl", err, { path });
          return null;
        }
      }),
    );
    for (const entry of settled) {
      if (entry) {
        out[entry[0]] = entry[1];
      }
    }
  }
  return out;
}

export function useHerbariumScans(): UseHerbariumScansResult {
  const session = useAuthStore((s) => s.session);
  const filters = useHerbariumStore((s) => s.filters);
  const userId = session?.user.id ?? null;

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setScans([]);
      setSignedUrls({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchHerbariumScans(userId, filters);
      setScans(rows);
      const urls = await signUrlsInBatches(rows.map((r) => r.image_url));
      setSignedUrls(urls);
    } catch (err) {
      logError("useHerbariumScans", err);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { scans, signedUrls, loading, error, refetch: load };
}
