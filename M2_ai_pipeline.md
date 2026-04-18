# M2 — AI Pipeline

**App:** FacadeLens
**Milestone:** M2 (AI Pipeline)
**Goal:** Supabase Edge Function that receives a storage image path, calls Gemini 2.5 Flash vision API with the structured prompt, parses the JSON response, inserts a scan record to the DB, and returns structured data to the app.

**Depends on:** M1 complete (photo in Supabase Storage, GPS + address captured)

---

## Deliverables

1. Supabase Edge Function `analyze-facade` — receives image path, calls Gemini, returns structured JSON
2. Typed response schema shared between Edge Function and app
3. App calls Edge Function after upload (M1) and receives overlay + critique data
4. Scan record inserted to `scans` table
5. Lottie "Reading the facade..." loading animation during 3–8s API round-trip
6. Tested against at least 6 facade photos across different styles

---

## New Files

```
supabase/
└── functions/
    └── analyze-facade/
        └── index.ts        # Deno Edge Function

app/(tabs)/scan.tsx         # UPDATE — wire up Edge Function call after upload
components/
└── AnalyzingOverlay.tsx    # Lottie loading screen over captured photo
assets/
└── animations/
    └── scanning.json       # Lottie JSON — download from LottieFiles (scanner-effect pack)
types/
└── scan.ts                 # Shared TypeScript types for scan data
```

---

## Lottie Setup — Loading Animation

Download a scanner-effect Lottie JSON from: https://lottiefiles.com/free-animations/scanner-effect

Verify the license is CC0 or CC-BY before using commercially.

### components/AnalyzingOverlay.tsx

```tsx
import LottieView from 'lottie-react-native'
import { YStack, Text } from 'tamagui'
import { StyleSheet, Dimensions } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

const VOCAB_FACTS = [
  'Cornice — the projecting ledge at the top of a wall or building.',
  'Pilaster — a rectangular column projecting slightly from a wall.',
  'Spandrel — the triangular space between an arch and the rectangular frame around it.',
  'Dentil — small square blocks forming a series in a cornice.',
  'Rustication — masonry cut in massive blocks with deep joints to suggest strength.',
]

export function AnalyzingOverlay() {
  const fact = VOCAB_FACTS[Math.floor(Math.random() * VOCAB_FACTS.length)]
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={StyleSheet.absoluteFill}
    >
      <YStack flex={1} bg="rgba(10,10,10,0.92)" ai="center" jc="center" gap="$6" px="$6">
        <LottieView
          source={require('../assets/animations/scanning.json')}
          autoPlay
          loop
          style={{ width: 180, height: 180 }}
        />
        <Text color="$color" fos={13} ta="center" opacity={0.6} lh={20}>
          Reading the facade...
        </Text>
        <YStack
          bg="$backgroundStrong"
          br="$4"
          p="$4"
          borderWidth={1}
          borderColor="$borderColor"
          maxWidth={300}
        >
          <Text color="$colorMuted" fos={12} ta="center" lh={18}>{fact}</Text>
        </YStack>
      </YStack>
    </Animated.View>
  )
}
```

---

## Shared Types (types/scan.ts)

```ts
export interface BoundingBox {
  x_min_pct: number
  y_min_pct: number
  x_max_pct: number
  y_max_pct: number
}

export type Confidence = 'high' | 'medium' | 'low'
export type ElementHierarchy = 'primary_structure' | 'secondary_cladding' | 'ornamental_detail'

export interface ArchitecturalElement {
  name: string
  definition: string
  bounding_box: BoundingBox
  confidence: Confidence
  hierarchy: ElementHierarchy
}

export interface BuildingSummary {
  probable_style: string
  estimated_period: string
  structural_system: string
}

export interface Critique {
  rhythm_and_repetition: string
  proportion_and_scale: string
  materiality_and_tectonics: string
  contextual_dialogue: string
  light_and_shadow: string
}

export interface AnalysisResult {
  building_summary: BuildingSummary
  elements: ArchitecturalElement[]
  critique: Critique
}

export interface ScanRecord {
  id: string
  user_id: string
  image_url: string
  overlay_data: { elements: ArchitecturalElement[] }
  building_summary: BuildingSummary
  critique_text: string  // JSON.stringify(critique)
  building_address: string
  coordinates: string    // 'POINT(lng lat)'
  captured_at: string
}
```

---

## Supabase Edge Function (supabase/functions/analyze-facade/index.ts)

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SYSTEM_PROMPT = `You are an architectural analysis engine. Analyze this building facade photograph and return ONLY a valid JSON object with no additional text, no markdown formatting, no code fences.

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

Identify at least 10 elements if visible. Do not invent elements not present in the image. If fewer than 3 architectural elements are visible (e.g. not a building facade), return an empty elements array and set building_summary.probable_style to "not_a_facade".`

serve(async (req) => {
  try {
    const { imagePath, userId, location, address } = await req.json()

    if (!imagePath || !userId) {
      return new Response(JSON.stringify({ error: 'Missing imagePath or userId' }), { status: 400 })
    }

    // Initialize Supabase with service role (to bypass RLS for insert)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Idempotency check — don't re-analyze if scan already exists for this image
    const { data: existing } = await supabase
      .from('scans')
      .select('id')
      .eq('image_url', imagePath)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ scanId: existing.id, cached: true }), { status: 200 })
    }

    // Download image from Storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('facade-photos')
      .download(imagePath)

    if (downloadError || !imageData) {
      return new Response(JSON.stringify({ error: 'Image download failed' }), { status: 500 })
    }

    // Convert to base64 in chunks (avoids memory issues with large files)
    const arrayBuffer = await imageData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.slice(i, i + chunkSize))
    }
    const base64Image = btoa(binary)

    // Call Gemini 2.5 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYSTEM_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return new Response(JSON.stringify({ error: `Gemini API error: ${err}` }), { status: 502 })
    }

    const geminiData = await geminiRes.json()
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Strip any accidental markdown code fences
    rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

    let analysis
    try {
      analysis = JSON.parse(rawText)
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse Gemini response as JSON', raw: rawText }), { status: 500 })
    }

    // Build PostGIS point string
    const coordinatesStr = location
      ? `POINT(${location.lng} ${location.lat})`
      : null

    // Insert scan record
    const { data: scan, error: insertError } = await supabase
      .from('scans')
      .insert({
        user_id: userId,
        image_url: imagePath,
        overlay_data: { elements: analysis.elements },
        building_summary: analysis.building_summary,
        critique_text: JSON.stringify(analysis.critique),
        building_address: address ?? null,
        coordinates: coordinatesStr,
        captured_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({
        scanId: scan.id,
        analysis,
        building_address: address,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

---

## Calling the Edge Function from the App

```ts
// lib/analysis.ts
import { supabase } from './supabase'
import { AnalysisResult } from '../types/scan'

export async function analyzeFacade(params: {
  imagePath: string
  userId: string
  location: { lat: number; lng: number } | null
  address: string
}): Promise<{ scanId: string; analysis: AnalysisResult }> {
  const { data, error } = await supabase.functions.invoke('analyze-facade', {
    body: params,
  })
  if (error) throw error
  return data
}
```

---

## Edge Function Deployment

```bash
# Set secrets
supabase secrets set GEMINI_API_KEY=your_key_here

# Deploy
supabase functions deploy analyze-facade

# Test with cURL
curl -X POST https://<project>.supabase.co/functions/v1/analyze-facade \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"imagePath":"<user_id>/test.jpg","userId":"<user_id>","location":{"lat":40.7128,"lng":-74.0060},"address":"123 Main St, Brooklyn, NY"}'
```

---

## Non-Facade Detection

If `analysis.building_summary.probable_style === 'not_a_facade'` or `analysis.elements.length < 3`:
- Do not save a scan record
- Return a friendly message to the app: "We couldn't identify a building facade. Try framing an exterior building face."
- Handle this in the Edge Function before inserting.

---

## M2 Test Checklist (run before M3)

Test the Edge Function against these facade types and verify element accuracy:

- [ ] NYC prewar brick tenement (Romanesque Revival / Beaux-Arts)
- [ ] Mid-century modern glass curtain wall office building
- [ ] Brutalist concrete facade
- [ ] Residential wood-frame Victorian
- [ ] Contemporary glass + steel mixed-use
- [ ] Non-building photo (tree, street, interior) — should return `not_a_facade`

For each: confirm element count ≥ 10, bounding boxes are in the correct zones, hierarchy classifications are correct, building summary is accurate.

---

## Done Criteria

- [ ] Edge Function deploys without errors
- [ ] Function returns valid JSON for a test facade photo
- [ ] Scan record appears in Supabase `scans` table after analysis
- [ ] `overlay_data`, `building_summary`, `critique_text` all populated correctly
- [ ] `critique_text` is stored as `JSON.stringify(critique)` (parse with `JSON.parse` in M4)
- [ ] Non-facade input returns `not_a_facade` and no scan record is inserted
- [ ] Lottie loading overlay (`AnalyzingOverlay`) appears during the API round-trip
- [ ] Idempotency check prevents duplicate scan records for same image path
- [ ] Tested against 6 facade types (checklist above)
