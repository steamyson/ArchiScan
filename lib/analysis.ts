import type { AnalysisResult } from "../types/scan";
import { supabase } from "./supabase";

export class NotAFacadeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAFacadeError";
  }
}

interface AnalyzeSuccessResponse {
  scanId: string;
  analysis: AnalysisResult;
  cached?: boolean;
  building_address?: string | null;
}

interface AnalyzeNotFacadeResponse {
  notAFacade: true;
  message: string;
}

interface AnalyzeErrorResponse {
  error: string;
  raw?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnalyzeSuccessResponse(value: unknown): value is AnalyzeSuccessResponse {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.scanId === "string" && isRecord(value.analysis);
}

function isNotFacadeResponse(value: unknown): value is AnalyzeNotFacadeResponse {
  return isRecord(value) && value.notAFacade === true && typeof value.message === "string";
}

function isErrorResponse(value: unknown): value is AnalyzeErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

function hasResponseContext(err: unknown): err is { context: Response } {
  return typeof err === "object" && err !== null && "context" in err && err.context instanceof Response;
}

function isHttpErrorStatus(err: unknown, status: number): boolean {
  return hasResponseContext(err) && err.context.status === status;
}

/** Supabase sets `context` to the fetch Response when the function returns a non-2xx body with `{ error: string }`. */
async function messageFromFunctionsInvokeError(err: unknown): Promise<string> {
  if (hasResponseContext(err)) {
    const res = err.context;
    try {
      const raw = await res.text();
      if (raw) {
        try {
          const body: unknown = JSON.parse(raw);
          if (isRecord(body) && typeof body.error === "string") {
            return `${body.error} (HTTP ${res.status})`;
          }
          if (isRecord(body) && typeof body.message === "string") {
            return `${body.message} (HTTP ${res.status})`;
          }
          if (isRecord(body) && typeof body.msg === "string") {
            return `${body.msg} (HTTP ${res.status})`;
          }
          if (isRecord(body)) {
            const s = JSON.stringify(body);
            return s.length > 400 ? `${s.slice(0, 400)}… (HTTP ${res.status})` : `${s} (HTTP ${res.status})`;
          }
        } catch {
          return raw.length > 400 ? `${raw.slice(0, 400)}… (HTTP ${res.status})` : `${raw} (HTTP ${res.status})`;
        }
      }
      return `HTTP ${res.status} ${res.statusText}`.trim();
    } catch {
      /* use fallback below */
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export async function analyzeFacade(params: {
  imagePath: string;
  userId: string;
  location: { lat: number; lng: number } | null;
  address: string;
}): Promise<{ scanId: string; analysis: AnalysisResult; cached?: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("Not signed in. Sign in again to analyze facades.");
  }

  const invoke = () =>
    supabase.functions.invoke("analyze-facade", {
      body: params,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  let { data, error } = await invoke();

  if (error && isHttpErrorStatus(error, 401)) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const next = refreshed.session?.access_token;
    if (next) {
      accessToken = next;
      ({ data, error } = await invoke());
    }
  }

  if (error) {
    const detail = await messageFromFunctionsInvokeError(error);
    throw new Error(`Edge function: ${detail}`);
  }

  if (isNotFacadeResponse(data)) {
    throw new NotAFacadeError(data.message);
  }

  if (isErrorResponse(data)) {
    throw new Error(data.raw ? `${data.error} (${data.raw.slice(0, 200)})` : data.error);
  }

  if (!isAnalyzeSuccessResponse(data)) {
    throw new Error("Unexpected response from analyze-facade");
  }

  return {
    scanId: data.scanId,
    analysis: data.analysis as AnalysisResult,
    cached: data.cached,
  };
}
