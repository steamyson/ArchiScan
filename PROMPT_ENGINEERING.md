# FacadeLens — Prompt Engineering

**Version:** 0.2 (April 2026 — addresses markdown bleed, glass-facade density, confidence inflation, critique specificity)
**Purpose:** Version, test, and iterate the Gemini vision prompt. The AI prompt is the core product feature — treat it as first-class code with its own changelog, test matrix, and scoring rubric.

---

## Principle

The structured system prompt that drives element identification and critique generation is the heart of FacadeLens. A bad prompt produces a bad product regardless of how good the UI is. Iterate this aggressively during M2 and M-1 spike work.

**Rules:**
- The prompt lives in `supabase/functions/analyze-facade/index.ts` as `SYSTEM_PROMPT`
- Every change to the prompt is a versioned entry in the changelog at the bottom of this file
- Changes are tested against the full test matrix (12 facades) before merging
- Prompt version is included in the Edge Function response for debugging: `{ promptVersion: 'v0.1', ... }`

---

## Current Prompt (v0.2)

```
You are an architectural analysis engine. Analyze this building facade photograph and return ONLY a valid JSON object with no additional text, no markdown formatting, no code fences.

The JSON must follow this exact schema:

{
  "building_summary": {
    "probable_style": "",
    "estimated_period": "",
    "structural_system": ""
  },
  "elements": [
    {
      "name": "",
      "definition": "",
      "bounding_box": {
        "x_min_pct": 0,
        "y_min_pct": 0,
        "x_max_pct": 0,
        "y_max_pct": 0
      },
      "confidence": "high | medium | low",
      "hierarchy": "primary_structure | secondary_cladding | ornamental_detail"
    }
  ],
  "critique": {
    "rhythm_and_repetition": "",
    "proportion_and_scale": "",
    "materiality_and_tectonics": "",
    "contextual_dialogue": "",
    "light_and_shadow": ""
  }
}

Rules for bounding_box: Values are percentages of total image dimensions. 0,0 is the top-left corner. x_min_pct and x_max_pct are horizontal position (0 = left edge, 100 = right edge). y_min_pct and y_max_pct are vertical position (0 = top edge, 100 = bottom edge). Be as spatially precise as possible.

Identify at least 10 elements if visible. Do not invent elements not present in the image. If fewer than 3 architectural elements are visible (e.g. not a building facade), return an empty elements array and set building_summary.probable_style to "not_a_facade".

Do not use **bold**, *italic*, backticks, or any markdown syntax in any string value — plain prose only.

For modern glass curtain walls, treat module systems, mullion patterns, spandrel panels, and structural bays as distinct elements. Aim for the same 10+ element density as traditional masonry facades.

Assign "low" confidence to any element that is partially obstructed, in shadow, at the edge of the frame, or identified primarily from context rather than visible features. Reserve "high" confidence for elements with fully visible, unambiguous features.

In every critique dimension, reference specific visible elements by name (e.g. "the cornice course", "the central entry bay"). Avoid generic statements that could apply to any facade.
```

**Gemini config:**
```json
{
  "temperature": 0.2,
  "maxOutputTokens": 2048
}
```

---

## Scoring Rubric

Score each test run on these dimensions (0–3 per dimension):

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **Element count** | < 5 elements | 5–8 elements | 9–12 elements | 13+ elements |
| **Element naming accuracy** | Wrong names | Mostly right, some errors | All correct | All correct + precise terminology |
| **Bounding box zone accuracy** | Elements in wrong zones | Correct zone ±25% | Correct zone ±15% | Correct zone ±5% |
| **Hierarchy classification** | > 30% wrong | 15–30% wrong | 5–15% wrong | < 5% wrong |
| **Building summary accuracy** | Wrong style/period | Style right, period off | Both approximately right | Precise style, period, and structural system |
| **Critique specificity** | Generic filler | Some specific observations | Mostly specific to this facade | Fully specific, analytically strong |
| **JSON validity** | Invalid JSON | Valid but schema errors | Valid, minor schema issues | Valid, perfect schema |

**Maximum score per facade: 21**
**Minimum acceptable score for shipping: 15/21 average across all 12 test facades**

---

## Test Matrix

Test every prompt version against these 12 facade types. Document score + notes per run.

| # | Facade Type | Example | Key challenge |
|---|---|---|---|
| 1 | NYC prewar brick tenement (Beaux-Arts) | Brooklyn 5-story walkup | Element density, ornamental detail |
| 2 | Mid-century modern glass curtain wall | Lever House style | Minimal elements, reflection interference |
| 3 | Brutalist concrete | Boston City Hall style | Texture vs form distinction |
| 4 | Residential wood-frame Victorian | SF painted lady | Color vs material detection |
| 5 | Contemporary glass + steel mixed-use | Hudson Yards style | Few classical elements |
| 6 | Gothic Revival institutional | Church or university | Vertical proportion, tracery |
| 7 | Art Deco commercial | Chrysler Building style | Decorative vs structural distinction |
| 8 | Industrial brick loft | DUMBO Brooklyn style | Repetition, material uniformity |
| 9 | Postmodern hybrid | Mixed style building | Style ambiguity handling |
| 10 | Residential suburban | Detached house | Simpler facade, fewer elements |
| 11 | Heavily scaffolded / obstructed | Any obscured facade | Low visibility handling |
| 12 | Non-building (control) | Tree, car, interior | `not_a_facade` detection |

---

## Test Log

### v0.1 — April 2026

**Facades tested:** 1 (Brooklyn prewar, Beaux-Arts)
**Score:** ~18/21 (estimated — bounding boxes zone-approximate at ±5–15%)
**Notes:**
- Returned 10 elements with correct names and hierarchy
- Building summary: "Neo-Renaissance / Beaux-Arts Influenced Brick Tenement, Early 20th Century (1910–1930)" ✅
- Critique was specific to the tested facade, not generic ✅
- Bounding coordinates spatially approximate (±5–15%) — expected, led to leader-line design decision ✅
- JSON fence stripping required (model occasionally wraps in ```json despite instructions) ✅

**Remaining gaps:** Only 1 facade tested. Need to run test matrix #2–12 during M2.

---

## Known Issues & Mitigations

### Issue 1: JSON code fence wrapping
**Symptom:** Model returns ` ```json\n{...}\n``` ` despite instructions
**Status:** Known, handled in Edge Function with regex strip
**Mitigation:** `rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()`

### Issue 2: Markdown bold in critique text
**Symptom:** Model wraps key terms in `**bold**` even with instructions to return plain text
**Status:** Addressed in v0.2 — prompt now explicitly forbids markdown in any string value. Frontend `stripMarkdown()` remains as belt-and-braces.

### Issue 3: Element count drops on glass curtain walls
**Symptom:** Modern glass facades return 3–5 elements instead of 10+
**Status:** Addressed in v0.2 — prompt guides model to treat module systems, mullion patterns, spandrel panels, and structural bays as distinct elements.

### Issue 4: Confidence inflation
**Symptom:** Model returns `high` confidence for most elements even on obstructed facades
**Status:** Addressed in v0.2 — prompt calibrates `low` for obstructed/shadowed/edge-of-frame/contextual elements; reserves `high` for fully visible features. Verify effectiveness in next test matrix run.

---

## Prompt Iteration Workflow

1. **Identify a failing test case** — a facade type that scores below 15/21
2. **Hypothesize a prompt change** — add, reword, or restructure a constraint
3. **Test the change** against the full 12-facade matrix
4. **Compare scores** — did overall score improve without regressing strong categories?
5. **Document in the changelog** and bump the version number
6. **Update the Edge Function** — commit prompt version change as its own commit

---

## Critique Quality Guidelines

The critique should read like a paragraph from a well-written architectural review — specific, analytical, and tied to what is visually present. Flag these patterns as poor critique quality:

**Generic filler (bad):**
> "The building exhibits interesting architectural elements that contribute to its overall character."

**Specific analysis (good):**
> "The five-bay rhythm established by the rusticated limestone base is interrupted at the fourth bay by a recessed entry portal, creating a subtle asymmetry that grounds what would otherwise be an overly mechanical repetition."

**Critique calibration instruction (add to prompt in v0.2):**
> "Each critique section should be 2–4 sentences long. Reference specific visible elements by name. Avoid generic observations that could apply to any building. Do not use markdown formatting — plain prose only."

---

## V2+ Considerations

- **Fine-tuning trigger:** When V1 scan volume reaches 1,000+ verified specimens, evaluate fine-tuning a detection model (YOLO / Faster R-CNN) for precise element bounding. The LLM remains for critique only.
- **Prompt A/B testing:** Test "Accessible" vs "Academic" critique tone with real users in beta to determine default.
- **Multi-image prompting:** Future: send 2–3 photos of the same facade (different angles) in a single prompt for more complete element coverage.

---

## Changelog

| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | April 2026 | Initial prompt from spec Appendix A | Baseline — validated on 1 Brooklyn facade |
| v0.2 | 2026-04-21 | Forbid markdown in any string; glass-facade density guidance; confidence calibration; critique specificity | Addresses Issues 2/3/4 from Known Issues; required before beta launch |

*Add entries here as the prompt evolves.*
