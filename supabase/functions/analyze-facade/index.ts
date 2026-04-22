import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_PROMPT_VERSION = "0.3";

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

Rules for bounding_box: Values are percentages of total image dimensions (0-100).
0,0 is top-left. x_min_pct/x_max_pct are horizontal (0 = left edge, 100 = right edge).
y_min_pct/y_max_pct are vertical (0 = top edge, 100 = bottom edge).

Draw the tightest possible box around the element itself - hug its visible boundary,
do not pad with surrounding wall or sky. For a keystone, box only the keystone shape.
For a cornice, box only the cornice band, not the wall below it. For a window, box
the full window opening including frame, not the surrounding facade.

The centroid of the bounding box (average of min/max on each axis) is used to place
a marker dot on screen. A loose box shifts the centroid away from the element's visual
center. Precision here directly improves what users see.

Identify at least 10 elements if visible. Do not invent elements not present in the image. If fewer than 3 architectural elements are visible (e.g. not a building facade), return an empty elements array and set building_summary.probable_style to "not_a_facade".

For repeated elements (e.g. windows on multiple floors), identify each floor's windows
as a separate element with its own name ("Third-Floor Windows", "Fourth-Floor Windows")
and its own tight bounding box centered on that floor's window group. Do not merge all
windows of the same type into a single large bounding box spanning multiple floors - this
produces an inaccurate centroid in the middle of the facade.

Do not use **bold**, *italic*, backticks, or any markdown syntax in any string value — plain prose only.

For modern glass curtain walls, treat module systems, mullion patterns, spandrel panels, and structural bays as distinct elements. Aim for the same 10+ element density as traditional masonry facades.

Assign "low" confidence to any element that is partially obstructed, in shadow, at the edge of the frame, or identified primarily from context rather than visible features. Reserve "high" confidence for elements with fully visible, unambiguous features.

In every critique dimension, reference specific visible elements by name (e.g. "the cornice course", "the central entry bay"). Avoid generic statements that could apply to any facade.`;

const BoundingBoxSchema = z.object({
  x_min_pct: z.number(),
  y_min_pct: z.number(),
  x_max_pct: z.number(),
  y_max_pct: z.number(),
});

const ElementSchema = z.object({
  name: z.string(),
  definition: z.string(),
  bounding_box: BoundingBoxSchema,
  confidence: z.enum(["high", "medium", "low"]),
  hierarchy: z.enum(["primary_structure", "secondary_cladding", "ornamental_detail"]),
});

const AnalysisSchema = z.object({
  building_summary: z.object({
    probable_style: z.string(),
    estimated_period: z.string(),
    structural_system: z.string(),
  }),
  elements: z.array(ElementSchema),
  critique: z.object({
    rhythm_and_repetition: z.string(),
    proportion_and_scale: z.string(),
    materiality_and_tectonics: z.string(),
    contextual_dialogue: z.string(),
    light_and_shadow: z.string(),
  }),
});

interface LocationBody {
  lat: number;
  lng: number;
}

interface AnalyzeRequestBody {
  imagePath?: string;
  userId?: string;
  location?: LocationBody | null;
  address?: string | null;
  imageBase64?: string | null;
}

function isNotAFacade(analysis: {
  building_summary?: { probable_style?: string };
  elements?: unknown[];
}): boolean {
  const style = analysis.building_summary?.probable_style;
  const elements = Array.isArray(analysis.elements) ? analysis.elements : [];
  return style === "not_a_facade" || elements.length < 3;
}

function normalizeAnalysis(raw: Record<string, unknown>): {
  building_summary: Record<string, string>;
  elements: unknown[];
  critique: Record<string, string>;
} {
  const building_summary =
    raw.building_summary && typeof raw.building_summary === "object" && !Array.isArray(raw.building_summary)
      ? (raw.building_summary as Record<string, string>)
      : { probable_style: "", estimated_period: "", structural_system: "" };
  const elements = Array.isArray(raw.elements) ? raw.elements : [];
  const critique =
    raw.critique && typeof raw.critique === "object" && !Array.isArray(raw.critique)
      ? (raw.critique as Record<string, string>)
      : {
          rhythm_and_repetition: "",
          proportion_and_scale: "",
          materiality_and_tectonics: "",
          contextual_dialogue: "",
          light_and_shadow: "",
        };
  return { building_summary, elements, critique };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const startTime = performance.now();

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!geminiKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as AnalyzeRequestBody;
    const { imagePath, userId, location, address, imageBase64 } = body;

    if (!imagePath || !userId) {
      return new Response(JSON.stringify({ error: "Missing imagePath or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "userId does not match session" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imagePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "imagePath must be under your user folder" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingScan, error: existingErr } = await supabase
      .from("scans")
      .select("id, overlay_data, building_summary, critique_text, prompt_version, model_used")
      .eq("image_url", imagePath)
      .maybeSingle();

    if (existingErr) {
      return new Response(JSON.stringify({ error: existingErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingScan) {
      let critique: Record<string, string>;
      try {
        critique = existingScan.critique_text
          ? (JSON.parse(existingScan.critique_text) as Record<string, string>)
          : {
              rhythm_and_repetition: "",
              proportion_and_scale: "",
              materiality_and_tectonics: "",
              contextual_dialogue: "",
              light_and_shadow: "",
            };
      } catch {
        critique = {
          rhythm_and_repetition: "",
          proportion_and_scale: "",
          materiality_and_tectonics: "",
          contextual_dialogue: "",
          light_and_shadow: "",
        };
      }

      const overlay = existingScan.overlay_data as { elements?: unknown[] } | null;
      const building_summary = existingScan.building_summary as Record<string, string>;

      const analysis = {
        building_summary: building_summary ?? {
          probable_style: "",
          estimated_period: "",
          structural_system: "",
        },
        elements: overlay?.elements ?? [],
        critique,
      };

      return new Response(
        JSON.stringify({
          scanId: existingScan.id,
          cached: true,
          analysis,
          building_address: address ?? null,
          promptVersion: (existingScan.prompt_version as string | null) ?? null,
          modelUsed: (existingScan.model_used as string | null) ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let base64Image: string;
    if (imageBase64) {
      base64Image = imageBase64;
    } else {
      const { data: imageData, error: downloadError } = await supabase.storage.from("facade-photos").download(imagePath);
      if (downloadError || !imageData) {
        return new Response(JSON.stringify({ error: "Image download failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const arrayBuffer = await imageData.arrayBuffer();
      base64Image = arrayBufferToBase64(arrayBuffer);
    }

    const geminiPayload = JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    });

    const GEMINI_MODELS = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];
    const RETRIES_PER_MODEL = 2;

    let geminiRes!: Response;
    let lastErrText = "";
    let modelUsed: string | null = null;
    modelLoop:
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
        geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiPayload,
        });
        if (geminiRes.ok) {
          modelUsed = model;
          break modelLoop;
        }
        if (geminiRes.status !== 429 && geminiRes.status !== 503) break modelLoop;
        lastErrText = await geminiRes.text();
        if (attempt < RETRIES_PER_MODEL - 1) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }
    }

    if (!geminiRes.ok) {
      if (!lastErrText) lastErrText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${lastErrText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiDurationMs = Math.round(performance.now() - startTime);

    const geminiData = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    rawText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response as JSON", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalized = normalizeAnalysis(parsed);
    const validation = AnalysisSchema.safeParse(normalized);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Analysis schema validation failed",
          issues: validation.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const analysis = validation.data;

    const total = analysis.elements.length;
    const highCount = analysis.elements.filter((e) => e.confidence === "high").length;
    const medCount = analysis.elements.filter((e) => e.confidence === "medium").length;
    const overallConfidence = total > 0
      ? Math.round(((highCount * 1.0 + medCount * 0.5) / total) * 100) / 100
      : null;

    const estInputTokens = Math.ceil(base64Image.length / 3);
    const estOutputTokens = Math.ceil(rawText.length / 4);
    const estCostUsd = (estInputTokens * 0.075 + estOutputTokens * 0.30) / 1_000_000;
    const estCostCents = Math.round(estCostUsd * 100);

    console.log("[METRIC] gemini_analysis_duration_ms", geminiDurationMs);
    console.log("[METRIC] gemini_model_used", modelUsed);
    console.log("[METRIC] analysis_element_count", total);
    console.log("[METRIC] analysis_overall_confidence", overallConfidence);
    console.log("[METRIC] is_not_a_facade", isNotAFacade(analysis));
    console.log("[METRIC] gemini_estimated_cost_cents", estCostCents);

    if (isNotAFacade(analysis)) {
      return new Response(
        JSON.stringify({
          notAFacade: true,
          message: "We couldn't identify a building facade. Try framing an exterior building face.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const elementsWithConfidence = analysis.elements.filter(
      (e): e is { confidence?: string } => typeof e === "object" && e !== null,
    );
    const lowCount = elementsWithConfidence.filter((e) => e.confidence === "low").length;
    const visibilityNote =
      elementsWithConfidence.length > 0 && lowCount > elementsWithConfidence.length * 0.6
        ? "Limited visibility affected this reading. Results may be less precise than usual."
        : null;

    const { data: scanId, error: rpcError } = await supabase.rpc("create_scan_from_analysis", {
      p_user_id: userId,
      p_image_url: imagePath,
      p_overlay_data: { elements: analysis.elements },
      p_building_summary: analysis.building_summary,
      p_critique_text: JSON.stringify(analysis.critique),
      p_building_address: address ?? null,
      p_lng: location?.lng ?? null,
      p_lat: location?.lat ?? null,
      p_captured_at: new Date().toISOString(),
      p_prompt_version: GEMINI_PROMPT_VERSION,
      p_model_used: modelUsed,
      p_overall_confidence: overallConfidence,
    });

    if (rpcError || !scanId) {
      return new Response(JSON.stringify({ error: rpcError?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        scanId,
        analysis,
        building_address: address ?? null,
        visibility_note: visibilityNote,
        promptVersion: GEMINI_PROMPT_VERSION,
        modelUsed,
        overallConfidence,
        durationMs: geminiDurationMs,
        estimatedCostCents: estCostCents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
