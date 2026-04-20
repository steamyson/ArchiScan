import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Identify at least 10 elements if visible. Do not invent elements not present in the image. If fewer than 3 architectural elements are visible (e.g. not a building facade), return an empty elements array and set building_summary.probable_style to "not_a_facade".`;

interface LocationBody {
  lat: number;
  lng: number;
}

interface AnalyzeRequestBody {
  imagePath?: string;
  userId?: string;
  location?: LocationBody | null;
  address?: string | null;
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
    const { imagePath, userId, location, address } = body;

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
      .select("id, overlay_data, building_summary, critique_text")
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
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: imageData, error: downloadError } = await supabase.storage.from("facade-photos").download(imagePath);

    if (downloadError || !imageData) {
      return new Response(JSON.stringify({ error: "Image download failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = arrayBufferToBase64(arrayBuffer);

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
    modelLoop:
    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
        geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiPayload,
        });
        if (geminiRes.ok) break modelLoop;
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

    const analysis = normalizeAnalysis(parsed);

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
