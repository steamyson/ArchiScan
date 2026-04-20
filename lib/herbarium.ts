import { supabase } from "./supabase";
import type { ScanRecord } from "../types/scan";

export interface HerbariumFilters {
  style?: string;
  dateFrom?: string;
  dateTo?: string;
  tag?: string;
  searchQuery?: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export async function fetchHerbariumScans(
  userId: string,
  filters: HerbariumFilters = {},
): Promise<ScanRecord[]> {
  let query = supabase
    .from("scans")
    .select(
      "id, user_id, image_url, overlay_data, building_summary, critique_text, building_address, captured_at, tags, saved",
    )
    .eq("user_id", userId)
    .eq("saved", true)
    .order("captured_at", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("captured_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("captured_at", filters.dateTo);
  }
  if (filters.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  if (filters.style) {
    query = query.ilike("building_summary->>probable_style", `%${filters.style}%`);
  }
  if (filters.searchQuery) {
    query = query.ilike("building_address", `%${filters.searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as ScanRecord[];
}

export async function fetchScanById(scanId: string, userId: string): Promise<ScanRecord | null> {
  const { data, error } = await supabase
    .from("scans")
    .select(
      "id, user_id, image_url, overlay_data, building_summary, critique_text, building_address, captured_at, tags, saved",
    )
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as ScanRecord | null) ?? null;
}

export async function markScanSaved(scanId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("scans")
    .update({ saved: true })
    .eq("id", scanId)
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
}

export async function getSignedUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("facade-photos")
    .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to sign image URL");
  }
  return data.signedUrl;
}
