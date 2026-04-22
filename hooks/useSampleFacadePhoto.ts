import { useEffect, useState } from "react";
import type { AnalysisResult } from "../types/scan";
import { getSamplePhotoCached, type SamplePhoto } from "../lib/samplePhotoCache";
import { logError } from "../lib/logger";

interface UseSampleFacadePhotoResult {
  photo: SamplePhoto | null;
  analysis: AnalysisResult;
  loading: boolean;
  error: string | null;
}

const SAMPLE_ANALYSIS: AnalysisResult = require("../assets/sample-scan.json");

export function useSampleFacadePhoto(): UseSampleFacadePhotoResult {
  const [photo, setPhoto] = useState<SamplePhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSamplePhotoCached()
      .then((p) => { if (!cancelled) setPhoto(p); })
      .catch((err) => {
        logError("useSampleFacadePhoto", err);
        if (!cancelled) setError("Could not load sample photo");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { photo, analysis: SAMPLE_ANALYSIS, loading, error };
}
