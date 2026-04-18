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

export async function analyzeFacade(params: {
  imagePath: string;
  userId: string;
  location: { lat: number; lng: number } | null;
  address: string;
}): Promise<{ scanId: string; analysis: AnalysisResult; cached?: boolean }> {
  const { data, error } = await supabase.functions.invoke("analyze-facade", {
    body: params,
  });

  if (error) {
    throw new Error(`Edge function: ${error.message}`);
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
