# FacadeLens — Marker Accuracy Fix: Cursor Agent Handoff

**Problem:** Marker overlay dots appear significantly offset from their architectural
features. Two compounding bugs are responsible — a double-scaling error in coordinate
math, and an under-specified bounding box prompt sent to Gemini.

Fix both in order. Each task is independent.

---

## Root Cause Analysis

### Bug 1 — Double scaling in `LeaderLineOverlay` (coordinate math)

`OverlayCanvas` already calls `computeLabelPositions(elements, SCREEN_WIDTH, SCREEN_HEIGHT)`,
which converts bounding box percentages into screen-space pixel coordinates correctly.
`leaderEndX` and `leaderEndY` on every `LabelPosition` are already in screen pixels.

However `LeaderLineOverlay` then does this:

```ts
const scaleX = SCREEN_WIDTH / imageWidth   // imageWidth is also SCREEN_WIDTH → scaleX = 1.0
const scaleY = SCREEN_HEIGHT / imageHeight // imageHeight is also SCREEN_HEIGHT → scaleY = 1.0
const scaledEndX = pos.leaderEndX * scaleX
const scaledEndY = pos.leaderEndY * scaleY
```

When `OverlayCanvas` passes `SCREEN_WIDTH`/`SCREEN_HEIGHT` as `imageWidth`/`imageHeight`,
the scale factors happen to be 1.0, so LeaderLineOverlay works correctly by accident.

`MarkerOverlay` (newly added) uses `leaderEndX/Y` directly — which is correct — but since
it was built after `LeaderLineOverlay` and the two components weren't audited together,
any future change to what `OverlayCanvas` passes into `computeLabelPositions` could break
`MarkerOverlay` without being obvious.

The real fix is to eliminate the ambiguity entirely: make the coordinate contract explicit.

### Bug 2 — Gemini bounding boxes are too loose

The current prompt says: "Be as spatially precise as possible."

This is too vague. Gemini interprets it as "return an approximate zone where the element
lives" rather than "return a tight box hugging the element boundary." Loose bounding boxes
produce centroids that are pulled toward the center of a large region rather than the
visual center of the element itself — causing marker dots to land in the middle of a wall
rather than on the feature they reference.

---

## TASK 1: Fix Coordinate Contract in `overlayLayout.ts` and `LeaderLineOverlay.tsx`

### What to do

**Step 1 — Rename the parameters in `computeLabelPositions`** to make the contract
explicit. The function always receives rendered container dimensions, never raw image
pixel dimensions.

In `lib/overlayLayout.ts`, rename the function signature:

```ts
// BEFORE
export function computeLabelPositions(
  elements: ArchitecturalElement[],
  imageWidth: number,
  imageHeight: number,
): LabelPosition[]

// AFTER
export function computeLabelPositions(
  elements: ArchitecturalElement[],
  containerWidth: number,
  containerHeight: number,
): LabelPosition[]
```

Update the body to use `containerWidth` and `containerHeight` in place of
`imageWidth` and `imageHeight`. The math itself does not change — only the naming.

**Step 2 — Remove the dead scaling from `LeaderLineOverlay.tsx`**

In `components/LeaderLineOverlay.tsx`, remove the `scaleX`/`scaleY` calculation and
the `imageWidth`/`imageHeight` props entirely. The positions are already in screen space.

```ts
// REMOVE these lines entirely:
const scaleX = SCREEN_WIDTH / imageWidth
const scaleY = SCREEN_HEIGHT / imageHeight
const scaledEndX = pos.leaderEndX * scaleX
const scaledEndY = pos.leaderEndY * scaleY

// REPLACE usage with the direct values:
// scaledEndX → pos.leaderEndX
// scaledEndY → pos.leaderEndY
```

Remove `imageWidth` and `imageHeight` from the `Props` interface of `LeaderLineOverlay`.

**Step 3 — Update `OverlayCanvas.tsx` to remove the now-unused props**

In `components/OverlayCanvas.tsx`, remove `imageWidth` and `imageHeight` from the
`LeaderLineOverlay` JSX call:

```tsx
// BEFORE
<LeaderLineOverlay
  positions={positions}
  imageWidth={SCREEN_WIDTH}
  imageHeight={SCREEN_HEIGHT}
  onLabelPress={setSelectedElement}
/>

// AFTER
<LeaderLineOverlay
  positions={positions}
  onLabelPress={setSelectedElement}
/>
```

**Step 4 — Add a measured container width to OverlayCanvas**

`Dimensions.get('window')` can be slightly wrong on devices with notches or unusual
aspect ratios, and it doesn't account for any insets. Use `onLayout` to get the true
rendered container dimensions and pass those to `computeLabelPositions`.

```tsx
// In OverlayCanvas.tsx — replace the Dimensions.get() approach:

import { useState } from 'react'
import { View, Image, StyleSheet, type LayoutChangeEvent } from 'react-native'

// Replace the top-level Dimensions constants with state:
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

const handleLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  setContainerSize({ width, height })
}

// Only compute positions when we have real dimensions:
const positions = containerSize.width > 0
  ? computeLabelPositions(elements, containerSize.width, containerSize.height)
  : []

// Add onLayout to the container View:
<View style={styles.container} onLayout={handleLayout}>
```

This ensures marker positions are always computed against the actual rendered pixel
dimensions of the image container, not an estimate.

### Files affected
- `lib/overlayLayout.ts` — rename params only
- `components/LeaderLineOverlay.tsx` — remove scaleX/scaleY and imageWidth/imageHeight props
- `components/OverlayCanvas.tsx` — add onLayout, pass containerSize to computeLabelPositions,
  remove imageWidth/imageHeight from LeaderLineOverlay call

### Validation
After making these changes:
1. Open a saved scan in Markers mode — dots should land visibly closer to their features
2. Open the same scan in Diagram mode — leader lines should reach the same positions
3. Rotate the device (if testing) — markers should recompute correctly after rotation
4. No TypeScript errors: run `npx tsc --noEmit` to verify

---

## TASK 2: Tighten Gemini Bounding Box Instructions in the Prompt

### What to do

Open `supabase/functions/analyze-facade/index.ts` and find the `SYSTEM_PROMPT` constant.

Locate the existing bounding box instruction:

```
Rules for bounding_box: Values are percentages of total image dimensions. 0,0 is the
top-left corner. x_min_pct and x_max_pct are horizontal position (0 = left edge,
100 = right edge). y_min_pct and y_max_pct are vertical position (0 = top edge,
100 = bottom edge). Be as spatially precise as possible.
```

**Replace** that paragraph with this expanded version:

```
Rules for bounding_box: Values are percentages of total image dimensions (0–100).
0,0 is top-left. x_min_pct/x_max_pct are horizontal (0 = left edge, 100 = right edge).
y_min_pct/y_max_pct are vertical (0 = top edge, 100 = bottom edge).

Draw the tightest possible box around the element itself — hug its visible boundary,
do not pad with surrounding wall or sky. For a keystone, box only the keystone shape.
For a cornice, box only the cornice band, not the wall below it. For a window, box
the full window opening including frame, not the surrounding facade.

The centroid of the bounding box (average of min/max on each axis) is used to place
a marker dot on screen. A loose box shifts the centroid away from the element's visual
center. Precision here directly improves what users see.
```

**Also add** the following rule for elements that repeat across the facade (e.g. multiple
windows on different floors). Locate or add a rules section for element naming and add:

```
For repeated elements (e.g. windows on multiple floors), identify each floor's windows
as a separate element with its own name ("Third-Floor Windows", "Fourth-Floor Windows")
and its own tight bounding box centered on that floor's window group. Do not merge all
windows of the same type into a single large bounding box spanning multiple floors — this
produces an inaccurate centroid in the middle of the facade.
```

**Bump the prompt version constant** from `'0.2'` to `'0.3'`:

```ts
// BEFORE
const GEMINI_PROMPT_VERSION = '0.2'

// AFTER
const GEMINI_PROMPT_VERSION = '0.3'
```

**Update `PROMPT_ENGINEERING.md`** — add a changelog entry:

```
| v0.3 | April 2026 | Tightened bounding box instructions: explicit tight-box rule,
centroid explanation, per-floor window separation | Marker dots landing offset from
features due to loose zone-style boxes |
```

### Files affected
- `supabase/functions/analyze-facade/index.ts` — update SYSTEM_PROMPT bounding box
  section, bump GEMINI_PROMPT_VERSION to '0.3'
- `PROMPT_ENGINEERING.md` — add changelog entry

### Validation

```bash
# Check Deno syntax
deno check supabase/functions/analyze-facade/index.ts

# Deploy
supabase functions deploy analyze-facade

# Test with the Brooklyn prewar facade from the test matrix (facade type #1)
# Verify in the response that:
# 1. promptVersion is "0.3"
# 2. Each floor's windows are separate elements with distinct bounding boxes
# 3. Bounding boxes are tighter — x/y ranges should be smaller for ornamental elements
#    like keystones and cornices than they were in v0.2
```

---

## Important: Do Not Change

- `MarkerOverlay.tsx` — it correctly uses `pos.leaderEndX` and `pos.leaderEndY` directly.
  No changes needed there.
- `ElementDetailCard.tsx` — untouched.
- `preferencesStore.ts` — untouched.
- The collision-spreading algorithm in `computeLabelPositions` — the spread only affects
  `labelY` for diagram mode label positioning. `leaderEndX` and `leaderEndY` are never
  modified by the spread and remain at the true element centroid. This is correct behavior.

---

## Expected Outcome

After both tasks:
- Marker dots should land within ~5–10% of their target feature visually
- The remaining drift is inherent Gemini coordinate approximation (±5–15% per the
  scoring rubric in PROMPT_ENGINEERING.md) — this is acceptable for V1
- Diagram mode leader lines will terminate at the same improved positions
- Per-floor window elements will each have their own accurately-centered marker
