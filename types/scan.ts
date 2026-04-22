export interface BoundingBox {
  x_min_pct: number;
  y_min_pct: number;
  x_max_pct: number;
  y_max_pct: number;
}

export type Confidence = "high" | "medium" | "low";

export type ElementHierarchy = "primary_structure" | "secondary_cladding" | "ornamental_detail";

export interface ArchitecturalElement {
  name: string;
  definition: string;
  bounding_box: BoundingBox;
  confidence: Confidence;
  hierarchy: ElementHierarchy;
}

export interface BuildingSummary {
  probable_style: string;
  estimated_period: string;
  structural_system: string;
}

export interface Critique {
  rhythm_and_repetition: string;
  proportion_and_scale: string;
  materiality_and_tectonics: string;
  contextual_dialogue: string;
  light_and_shadow: string;
}

export interface AnalysisResult {
  building_summary: BuildingSummary;
  elements: ArchitecturalElement[];
  critique: Critique;
}

/** Row shape for Herbarium / detail screens (matches `public.scans`). */
export interface ScanRecord {
  id: string;
  user_id: string;
  image_url: string;
  overlay_data: { elements: ArchitecturalElement[] };
  building_summary: BuildingSummary;
  /** Stored as `JSON.stringify(critique)` — parse with `JSON.parse` when rendering. */
  critique_text: string;
  building_address: string | null;
  captured_at: string;
  tags?: string[] | null;
  saved?: boolean;
  prompt_version?: string | null;
  model_used?: string | null;
  overall_confidence?: number | null;
}

/** Wire shape returned by the analyze-facade Edge Function on success. */
export interface AnalyzeResponse {
  scanId: string;
  analysis: AnalysisResult;
  cached?: boolean;
  building_address?: string | null;
  visibility_note?: string | null;
  promptVersion?: string | null;
  modelUsed?: string | null;
  overallConfidence?: number | null;
}
