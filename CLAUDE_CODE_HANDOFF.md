# FacadeLens — Claude Code Handoff

**Date:** April 21, 2026  
**Status:** M0–M6 implemented; ready for targeted improvements  
**Priority:** Fix prompt issues + add instrumentation before beta launch

---

## Overview

You have several high-impact improvements to make before pushing to TestFlight/Play Store:

1. **Prompt engineering fixes** (v0.2) — address markdown, confidence, glass facades
2. **Add prompt + model versioning** — track which version analyzed each scan
3. **Add Zod validation** — catch malformed Gemini responses before inserting
4. **Implement Unsplash sample photo** — M6 blocker
5. **Add offline queue deduplication** — prevent double-analysis
6. **Add confidence aggregation** — needed for data curation (M7)

---

## How To Use This Document

Each section has:
- **What:** The problem being solved
- **Claude Code Prompt:** Copy this verbatim into Claude Code terminal
- **Files Affected:** Which files get modified
- **Validation:** How to test the change

Run these in order. Each Claude Code session should handle **one task**.

---

# TASK 1: Fix Prompt v0.2 + Add Versioning

## What
Update the Gemini prompt to fix:
- Markdown bold/italic being included in critique text
- Better handling of modern glass facades (lower element density)
- Confidence calibration (reduce false "high" confidence on obstructed facades)
- Improve critique specificity (avoid generic analysis)

Return the prompt version in every API response so scans are tracked.

## Files Affected
- `supabase/functions/analyze-facade/index.ts` — update `SYSTEM_PROMPT` + add version constant + return in response
- `PROMPT_ENGINEERING.md` — add changelog entry
- `types/scan.ts` — add `promptVersion` field to response types (optional, but recommended)

## Claude Code Prompt

```
I need to update the Gemini prompt for FacadeLens to v0.2 and add prompt version tracking.

Current state:
- SYSTEM_PROMPT lives in supabase/functions/analyze-facade/index.ts
- Version is documented in PROMPT_ENGINEERING.md but not returned in API responses
- Known issues: markdown bold in critique, low element count on glass facades, confidence inflation

Tasks:
1. Read the current SYSTEM_PROMPT from supabase/functions/analyze-facade/index.ts
2. Read PROMPT_ENGINEERING.md to understand the issues and desired improvements
3. Create an improved SYSTEM_PROMPT (v0.2) that addresses:
   - Explicitly forbids markdown formatting: "Do not use **bold** or *italic** — plain prose only."
   - Adds guidance for modern glass facades: "For glass curtain walls, identify module systems, mullion patterns, spandrel panels, structural bays as distinct elements."
   - Adds confidence calibration: "Assign 'low' confidence to any element that is partially obstructed, in shadow, or identified primarily by context rather than visible features."
   - Adds critique specificity guide: "Reference specific visible elements by name. Avoid generic observations."
4. Update supabase/functions/analyze-facade/index.ts:
   - Add constant: const GEMINI_PROMPT_VERSION = '0.2'
   - Replace SYSTEM_PROMPT with the new v0.2 version
   - In the return statement for successful analysis, add: promptVersion: GEMINI_PROMPT_VERSION
5. Update PROMPT_ENGINEERING.md:
   - Add a changelog entry for v0.2 with the changes and reasoning
   - Update the "Current Prompt" section to show v0.2

Output:
- The complete updated index.ts file
- The updated PROMPT_ENGINEERING.md with changelog entry
- A summary of what changed and why
```

## Validation

After Claude Code finishes:

```bash
# Check syntax
deno check supabase/functions/analyze-facade/index.ts

# Deploy to Supabase
supabase functions deploy analyze-facade

# Test with a test facade image
curl -X POST https://<project>.supabase.co/functions/v1/analyze-facade \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "imagePath": "test.jpg",
    "userId": "<user_id>",
    "location": {"lat": 40.7128, "lng": -74.0060},
    "address": "Test Facade, NYC",
    "imageBase64": "<base64_encoded_image>"
  }'

# Check response includes promptVersion
# Should see: "promptVersion": "0.2"
```

---

# TASK 2: Add Zod Validation for Gemini Response

## What
Add runtime validation of Gemini's JSON response using Zod. This prevents malformed data from being inserted into the database.

Currently, you're relying on `normalizeAnalysis()` to patch bad responses, but there's no guarantee the result is valid. Zod will throw if the response doesn't match the expected schema.

## Files Affected
- `supabase/functions/analyze-facade/index.ts` — add Zod import, create schema, validate response
- `deno.json` or `deno.jsonc` — may need to add Zod dependency (if not already there)

## Claude Code Prompt

```
I need to add Zod validation to the Gemini response parser in the analyze-facade Edge Function.

Current state:
- Gemini response is parsed with JSON.parse() then passed to normalizeAnalysis()
- normalizeAnalysis() returns a best-effort normalized object, but there's no guarantee it's valid
- If Gemini returns a malformed response, bad data could be inserted into the database

Task:
1. Check if Zod is already available in supabase/functions/analyze-facade (look at imports, deno.json)
2. If not available, add Zod to the function (use Deno-compatible Zod via esm.sh)
3. Create a Zod schema for AnalysisResult that matches types/scan.ts:
   - building_summary: {probable_style, estimated_period, structural_system} (all strings)
   - elements: array of {name, definition, bounding_box: {x_min_pct, y_min_pct, x_max_pct, y_max_pct}, confidence: "high"|"medium"|"low", hierarchy: "primary_structure"|"secondary_cladding"|"ornamental_detail"}
   - critique: {rhythm_and_repetition, proportion_and_scale, materiality_and_tectonics, contextual_dialogue, light_and_shadow} (all strings)
4. Replace the call to normalizeAnalysis() with a Zod parse:
   - Try to parse with Zod
   - If parsing fails, return a 400 error with details: "Response validation failed: {error details}"
   - If parsing succeeds, use the validated result
5. Keep the normalizeAnalysis() function as a fallback for partial/incomplete responses (makes Zod more forgiving)

Output:
- Updated supabase/functions/analyze-facade/index.ts with Zod import and schema
- The new validation logic
- Error handling for invalid responses
- Explanation of what Zod catches that normalizeAnalysis doesn't
```

## Validation

```bash
# Deploy
supabase functions deploy analyze-facade

# Test with valid response (should work)
curl -X POST https://<project>.supabase.co/functions/v1/analyze-facade \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"imagePath": "...", "userId": "...", ...}'

# Test with intentionally malformed response (for manual verification):
# Modify the test to return invalid JSON and verify the error message is helpful
```

---

# TASK 3: Add Prompt + Model Versioning to Database

## What
Track which prompt version and which Gemini model analyzed each scan. This is critical for:
- Understanding when analysis quality changed (if you update the prompt)
- Debugging scans that look wrong
- A/B testing different prompt versions

## Files Affected
- `types/scan.ts` — add `promptVersion` and `modelUsed` to `ScanRecord`
- `supabase/functions/analyze-facade/index.ts` — return these in response, pass to RPC
- `supabase/functions/analyze-facade/index.ts` — track which model actually succeeded in the fallback loop
- Supabase migration (if you're using SQL migrations) — add columns to `scans` table

## Claude Code Prompt

```
I need to add prompt_version and model_used tracking to the analyze-facade Edge Function and the scans table.

Current state:
- scans table has columns: id, user_id, image_url, overlay_data, building_summary, critique_text, building_address, coordinates, captured_at
- No way to know which prompt or model generated each scan
- Makes debugging and iteration difficult

Task:
1. Update types/scan.ts:
   - Add promptVersion?: string to ScanRecord
   - Add modelUsed?: string to ScanRecord (optional, only include if returned from API)
2. Update supabase/functions/analyze-facade/index.ts:
   - In the model fallback loop, track which model successfully completed: const modelUsed = "gemini-2.5-flash" (or whichever succeeded)
   - In the success response, return: modelUsed: modelUsed, promptVersion: GEMINI_PROMPT_VERSION
   - In the RPC call to create_scan_from_analysis, pass: p_prompt_version: GEMINI_PROMPT_VERSION, p_model_used: modelUsed
3. Create a Supabase migration to add columns to scans table:
   - CREATE IF NOT EXISTS supabase/migrations/add_version_tracking.sql
   - ALTER TABLE public.scans ADD COLUMN prompt_version text DEFAULT '0.1'
   - ALTER TABLE public.scans ADD COLUMN model_used text
   - Add comment explaining these fields
4. Update the RPC create_scan_from_analysis to accept and insert these parameters
   - Find the RPC definition (likely in supabase/migrations or in a separate SQL file)
   - Add p_prompt_version text parameter
   - Add p_model_used text parameter
   - Add these to the INSERT statement

Output:
- Updated types/scan.ts
- Updated index.ts with version tracking
- The migration SQL file
- Instructions for running the migration: `supabase migration up`
```

## Validation

```bash
# Run migration
supabase migration up

# Deploy function
supabase functions deploy analyze-facade

# Test and verify version tracking
curl -X POST https://<project>.supabase.co/functions/v1/analyze-facade \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"imagePath": "...", "userId": "...", ...}'

# Check response includes promptVersion and modelUsed
# Query Supabase to verify the columns are populated
supabase sql
SELECT id, prompt_version, model_used FROM public.scans LIMIT 1;
```

---

# TASK 4: Implement Unsplash Sample Photo (M6 Blocker)

## What
Implement the sample scan feature so new users can see the app's capabilities without signing up. This is blocking your beta launch.

## Files Affected
- `lib/unsplash.ts` — new file, fetch and cache facade images from Unsplash
- `hooks/useSampleFacadePhoto.ts` — new hook, manage sample photo state
- `lib/samplePhotoCache.ts` — new file, local caching logic (optional but recommended)
- `app/(tabs)/scan.tsx` or your home screen — add button to view sample scan

## Claude Code Prompt

```
I need to implement the Unsplash sample photo feature for FacadeLens M6.

Current state:
- Sample photo is planned in M6_polish.md but not implemented
- New users see empty Herbarium on first launch (no way to see the app without signing up)
- This is a blocker for beta testing

Prerequisites:
- You have EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in your .env file (from M6_polish.md)
- You have expo-file-system already installed (from M1)

Task:
1. Create lib/unsplash.ts:
   - Function fetchSampleFacadePhoto(): Promise<{url: string, photographerName: string, photographerUrl: string}>
   - Calls Unsplash API: https://api.unsplash.com/photos/random?query=building+facade+architecture+new+york&orientation=portrait&client_id=<key>
   - Extracts: urls.regular, user.name, user.links.html
   - Adds UTM params to photographer URL: ?utm_source=facadelens&utm_medium=referral
   - Returns structured data
   - Error handling: if fetch fails, throw Error with descriptive message

2. Create lib/samplePhotoCache.ts:
   - Function getSamplePhotoCached(): Promise<{url: string, ...}>
   - Check AsyncStorage for cached photo (key: 'facadelens_sample_photo_cache')
   - If cached and less than 7 days old, return it
   - Otherwise, fetch fresh from Unsplash, cache it, return it
   - Metadata: {url, photographerName, photographerUrl, cachedAt: ISO string}

3. Create hooks/useSampleFacadePhoto.ts:
   - Custom hook that loads sample photo on mount
   - State: {photo: SamplePhoto | null, loading: boolean, error: string | null}
   - useEffect to call getSamplePhotoCached()
   - Return {photo, loading, error}

4. Add button to your scan screen or home screen:
   - If no scans exist in Herbarium, show: "View Sample Scan" button
   - On press: fetch sample photo, then navigate to the overlay screen (OverlayCanvas) with fake AnalysisResult
   - The fake AnalysisResult should be a pre-analyzed Brooklyn facade (from your test matrix)

5. Create a helper function analyzeSampleFacade(): Promise<AnalysisResult>:
   - Return a hardcoded AnalysisResult for a pre-analyzed facade (e.g., the one you tested in M2)
   - Include 10+ elements, realistic critique, etc.
   - This is the analysis data shown when viewing the sample

Output:
- lib/unsplash.ts (fetch from Unsplash)
- lib/samplePhotoCache.ts (local caching)
- hooks/useSampleFacadePhoto.ts (React hook)
- Updated scan screen with "View Sample" button
- A sample AnalysisResult constant (can live in lib/samplePhotoCache.ts or types/scan.ts)
- Instructions for testing: "Open app as new user, you should see 'View Sample Scan' button"
```

## Validation

```bash
# Test locally
npx expo start

# As a new user (first launch), you should see:
# 1. Welcome screen with "Start Scanning" button
# 2. After permission granted, Scan tab with "View Sample Scan" button
# 3. Tap button → loads photo from Unsplash + shows overlay + critique

# Verify Unsplash attribution is shown with proper link
# Verify photo is cached (close app, reopen, should load instantly)
```

---

# TASK 5: Fix Offline Queue Deduplication

## What
Prevent the same photo from being queued and analyzed multiple times if the app crashes or user retries.

## Files Affected
- `lib/offlineQueue.ts` — add deduplication check

## Claude Code Prompt

```
I need to fix the offline queue to prevent duplicate analysis of the same image.

Current state:
- enqueue() adds items without checking if they're already queued
- If user captures offline, queues → app crashes → relaunches → retries the same scan, it gets queued again
- When connectivity returns, same scan is analyzed twice, creating duplicate ScanRecords

Task:
1. In lib/offlineQueue.ts, update the enqueue() function:
   - Before adding to queue, check if imagePath already exists in the queue
   - If it exists, log and return early (don't re-queue)
   - Only add to queue if it's a new imagePath
2. Add a helper function isInQueue(imagePath: string): Promise<boolean>
   - Checks existing queue for matching imagePath
   - Returns true/false
3. Update any retry logic in app/(tabs)/scan.tsx:
   - When user taps "Retry", first check isInQueue(imagePath)
   - If already queued, show message: "This scan is already being analyzed. It will be completed when you have internet."
   - If not queued, call enqueue() normally

Output:
- Updated lib/offlineQueue.ts with deduplication
- Updated scan screen retry logic (if applicable)
- Explanation of deduplication logic
```

## Validation

```bash
# Manual test:
# 1. Turn off internet (airplane mode)
# 2. Capture a photo
# 3. See "Offline, scan queued" message
# 4. Without internet, tap "Retry" on the same photo
# 5. Should see: "Already queued" message, not a second entry
# 6. Turn internet back on
# 7. Should see only ONE scan record created
```

---

# TASK 6: Add Confidence Aggregation to API Response

## What
Compute an overall confidence score for each scan based on per-element confidence. This is needed for data curation (M7).

## Files Affected
- `supabase/functions/analyze-facade/index.ts` — compute `overallConfidence` after analysis
- `types/scan.ts` — add `overallConfidence` to response types

## Claude Code Prompt

```
I need to add overall confidence scoring to the analyze-facade Edge Function.

Current state:
- Each element has confidence: "high" | "medium" | "low"
- No scan-level confidence score
- Can't tell which scans are "good" vs "uncertain" without examining all elements

Task:
1. In supabase/functions/analyze-facade/index.ts, after analysis completes:
   - Count elements by confidence level:
     - highCount = elements.filter(e => e.confidence === 'high').length
     - mediumCount = elements.filter(e => e.confidence === 'medium').length
     - lowCount = elements.filter(e => e.confidence === 'low').length
   - Calculate overallConfidence as a weighted average:
     - (highCount * 1.0 + mediumCount * 0.5 + lowCount * 0) / totalElements
     - This gives a score from 0.0 (all low) to 1.0 (all high)
   - Round to 2 decimals: Math.round(score * 100) / 100
2. Return overallConfidence in the success response: overallConfidence: score
3. Include it in the RPC call to create_scan_from_analysis: p_overall_confidence: overallConfidence
4. Update types/scan.ts to add overallConfidence?: number to response types

Output:
- Updated supabase/functions/analyze-facade/index.ts with confidence calculation
- Updated types/scan.ts
- Explanation of the scoring formula
- Note: You can use this in M7 to filter "good" scans (>0.7) for training data
```

## Validation

```bash
# Test with a facade that has mixed confidence elements
curl -X POST https://<project>.supabase.co/functions/v1/analyze-facade \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check response includes: "overallConfidence": 0.65 (or similar)

# Example:
# If you have 6 high, 2 medium, 2 low elements:
# overall = (6*1.0 + 2*0.5 + 2*0) / 10 = (6 + 1) / 10 = 0.7
```

---

# TASK 7: Add Instrumentation (Cost, Latency, Accuracy)

## What
Add logging/metrics for:
- Gemini API cost per scan (based on model + token usage)
- Analysis latency (how long analysis takes)
- Accuracy metrics (element count, non-facade detection rate)

This helps you understand performance and cost as you scale.

## Files Affected
- `supabase/functions/analyze-facade/index.ts` — add timing + cost calculation
- `lib/logger.ts` or new `lib/metrics.ts` — structured logging for metrics
- Optional: integrate with Sentry or a metrics backend

## Claude Code Prompt

```
I need to add instrumentation to track Gemini API cost, latency, and accuracy metrics.

Current state:
- No tracking of costs or performance
- Can't tell if you're burning money or if certain facades are slow
- No visibility into which models/prompts perform better

Task:
1. In supabase/functions/analyze-facade/index.ts:
   - Add timing: const startTime = performance.now() at the start
   - After Gemini call completes, calculate: const duration = performance.now() - startTime
   - Track which model was used and how many elements were returned
   - After analysis completes, log metrics:
     - gemini_analysis_duration_ms: duration
     - gemini_model_used: modelUsed
     - analysis_element_count: elements.length
     - analysis_overall_confidence: overallConfidence
     - is_not_a_facade: isNotAFacade(analysis)
2. Create or update lib/metrics.ts:
   - Function logMetric(name: string, value: number, tags: {key: string}): Promise<void>
   - For now, just log to console in dev, but structure it for future Sentry/backend integration
   - Tags example: {model: "gemini-2.5-flash", promptVersion: "0.2", isFacade: "true"}
3. Calculate estimated cost:
   - Gemini pricing (as of April 2026):
     - Flash: $0.075 per 1M input tokens, $0.3 per 1M output tokens
   - Estimate tokens from image size + response size (rough heuristic)
   - Log: gemini_estimated_cost_cents: Math.round(cost * 100)
4. Return these metrics in the API response (optional but useful for frontend analytics):
   - duration_ms: duration
   - estimated_cost_cents: costCents

Output:
- Updated supabase/functions/analyze-facade/index.ts with timing and logging
- lib/metrics.ts with logMetric() function
- Explanation of cost calculation
- Note for future: "Hook up to Sentry in M7 for real-time dashboards"
```

## Validation

```bash
# Deploy
supabase functions deploy analyze-facade

# Test and watch logs
supabase functions logs analyze-facade --follow

# You should see output like:
# [METRIC] gemini_analysis_duration_ms: 4523
# [METRIC] gemini_model_used: "gemini-2.5-flash"
# [METRIC] analysis_element_count: 12
# [METRIC] gemini_estimated_cost_cents: 3
```

---

# Recommended Execution Order

1. **TASK 1 (Prompt v0.2)** — highest impact, enables better testing
2. **TASK 2 (Zod Validation)** — prevents data corruption
3. **TASK 3 (Version Tracking)** — needed before you iterate on prompt again
4. **TASK 4 (Unsplash Sample)** — unblocks beta launch
5. **TASK 5 (Queue Dedup)** — edge case fix
6. **TASK 6 (Confidence Aggregation)** — foundation for M7
7. **TASK 7 (Instrumentation)** — ongoing observability

---

# Deliverables Checklist

After completing all tasks:

- [ ] TASK 1: Prompt v0.2 deployed, verified in API response
- [ ] TASK 2: Zod validation in place, error messages improved
- [ ] TASK 3: prompt_version and model_used in database
- [ ] TASK 4: Unsplash sample photo working, new users can view demo
- [ ] TASK 5: Queue deduplication working, no double-analysis
- [ ] TASK 6: overallConfidence returned and stored
- [ ] TASK 7: Metrics logged, basic instrumentation in place

**After these are done**, you're ready for:
- Beta testing with TestFlight/Play Store internal
- M7 work (data curation dashboard)
- M8 work (custom model fine-tuning)

---

# Notes for Claude Code Sessions

- Each task is independent and can be done in separate sessions
- Read the "Files Affected" section first to understand scope
- Use `view <filepath>` to read existing code before making changes
- Use `str_replace` to edit files, or `create_file` for new files
- Run bash commands to test/deploy changes
- If you get stuck, ask for clarification on the specific file structure
- Project lives at `/mnt/project/`; output files to `/mnt/user-data/outputs/`
