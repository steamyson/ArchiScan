import type { Critique } from "../types/scan";

export function parseCritique(critiqueText: string): Critique | null {
  try {
    return JSON.parse(critiqueText) as Critique;
  } catch {
    return null;
  }
}

/** Strip residual markdown bold/italic Gemini occasionally emits despite instructions. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}
