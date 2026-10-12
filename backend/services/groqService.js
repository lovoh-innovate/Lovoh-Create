// services/groqService.js
//
// Groq-backed AI service. Uses Node's built-in fetch — no extra npm package.
// Includes text + vision helpers. Vision is used for poster placeholder detection.
//
// NOTE (Sep 2026): meta-llama/llama-4-scout-17b-16e-instruct and
// meta-llama/llama-4-maverick-17b-128e-instruct have both been deprecated and
// shut down by Groq. Current documented vision models are qwen/qwen3.6-27b and
// qwen/qwen3.8-27b — but model availability can differ per Groq account
// (console model permissions), so we try an ordered fallback list instead of
// hardcoding a single model ID.
//
// PRECISION NOTE: bounding-box detection from a single vision call will
// never be pixel-perfect on every arbitrary poster design. We enable
// "thinking" mode (reasoning_effort) for the detection call, which measurably
// helps spatial/geometric reasoning vs. a blind single-shot guess, and we
// tightened the prompt to target exact fill edges rather than approximate
// placement. For guaranteed alignment, pair this with a preview/adjust step
// in the UI (detectDesignPlaceholders already returns pixel + normalized
// coords for exactly that purpose) — let the event creator nudge the box
// once before saving posterTemplate.

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TEXT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Ordered list of vision-capable models to try. Override with
// GROQ_VISION_MODELS="model-a,model-b" in .env if needed.
const VISION_MODEL_CANDIDATES = (
  process.env.GROQ_VISION_MODELS ||
  process.env.GROQ_VISION_MODEL ||
  'qwen/qwen3.6-27b,qwen/qwen3.8-27b'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────
const stripCodeFences = (text) =>
  text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

const parseMaybeJSON = (raw) => {
  try {
    return JSON.parse(stripCodeFences(raw));
  } catch (err) {
    console.error('❌ Groq returned non-JSON:', raw.slice(0, 500));
    throw new Error('Groq returned invalid JSON. Try again.');
  }
};

const isModelAccessError = (status, errBody) => {
  if (status !== 404) return false;
  const msg = (errBody || '').toLowerCase();
  return msg.includes('model_not_found') || msg.includes('does not exist');
};

async function callGroq({
  system,
  user,
  jsonMode = true,
  temperature = 0.5,
  model = TEXT_MODEL,
  maxTokens = 8192,
}) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        ...(jsonMode && { response_format: { type: 'json_object' } }),
        temperature,
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    throw new Error(`Groq request failed: ${err.message}`);
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `Groq API error (${response.status}): ${errBody.slice(0, 500) || response.statusText}`
    );
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned an empty response.');
  if (!jsonMode) return raw;
  return parseMaybeJSON(raw);
}

// Single attempt against one vision model. Throws with a tagged
// `.isModelAccessError` flag on 404/model_not_found so the caller can
// decide whether to fall through to the next candidate.
async function callGroqVisionOnce({
  system,
  userText,
  imageUrl,
  jsonMode,
  temperature,
  model,
  maxTokens,
  reasoningEffort,
}) {
  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        ...(jsonMode && { response_format: { type: 'json_object' } }),
        ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
        temperature,
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    throw new Error(`Groq vision request failed: ${err.message}`);
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const err = new Error(
      `Groq vision API error (${response.status}) [model=${model}]: ${
        errBody.slice(0, 500) || response.statusText
      }`
    );
    err.isModelAccessError = isModelAccessError(response.status, errBody);
    throw err;
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error(`Groq vision returned an empty response [model=${model}].`);
  if (!jsonMode) return raw;
  return parseMaybeJSON(raw);
}

// Sends a text prompt + image URL to a Groq vision model, trying each
// candidate in VISION_MODEL_CANDIDATES in order until one works.
async function callGroqVision({
  system,
  userText,
  imageUrl,
  jsonMode = true,
  temperature = 0.2,
  models = VISION_MODEL_CANDIDATES,
  maxTokens = 2048,
  reasoningEffort = null,
}) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');
  if (!imageUrl) throw new Error('imageUrl is required for vision calls.');
  if (!models.length) throw new Error('No vision models configured.');

  const errors = [];

  for (const model of models) {
    try {
      return await callGroqVisionOnce({
        system,
        userText,
        imageUrl,
        jsonMode,
        temperature,
        model,
        maxTokens,
        reasoningEffort,
      });
    } catch (err) {
      errors.push(err.message);
      if (!err.isModelAccessError) {
        // Real failure (bad JSON, network, rate limit, etc.) — don't mask it.
        throw err;
      }
      console.warn(`⚠️ Vision model unavailable, trying next candidate: ${err.message}`);
      // else: try next candidate
    }
  }

  throw new Error(
    `All Groq vision models failed or are inaccessible on this account:\n${errors.join('\n')}`
  );
}

// ─────────────────────────────────────────────────────────────────────
// POSTER PLACEHOLDER DETECTION
// Given an "I will be attending" poster design, find:
//   • the empty photo box (circle / square / rounded)
//   • the empty name field (usually under the photo)
// Returns NORMALIZED (0..1) coordinates — caller converts to pixels.
// ─────────────────────────────────────────────────────────────────────
const POSTER_DETECT_SYSTEM = `
You analyze "I will be attending" event poster designs.

These designs contain:
1. An EMPTY PHOTO PLACEHOLDER — a blank circle, square, or rounded box
   where a person's photo will later be placed. It is usually empty
   white, empty transparent, or a flat neutral fill with no photo in it.
2. An EMPTY NAME FIELD — almost always a SOLID, FLAT-COLOR shape (very
   often a white or light rounded rectangle / pill) positioned directly
   below or overlapping the bottom of the photo placeholder, reserved for
   a person's name. It has no text inside it in the source design.

CRITICAL — measuring the name field precisely:
- Do NOT estimate a generic position "below the photo." Actually locate
  the solid-fill shape and trace its visible edges.
- Find the exact row where the flat fill color BEGINS (top edge) and the
  exact row where it ENDS (bottom edge) — do not include any of the
  background pattern, decorative text, or the photo circle above it.
- Find the exact column where the fill starts (left edge) and ends
  (right edge).
- The bounding box you return for namePlaceholder must tightly hug only
  that solid-fill region — no padding, no guessing, no rounding up to
  "about a third of the way down."
- If the name field is a pill/rounded rectangle sitting slightly below
  and separate from the photo circle (a common layout), your y value
  must start at the TOP of that separate pill, not at the bottom edge of
  the photo circle.

General rules:
- Return bounding boxes in NORMALIZED coordinates (0.0 → 1.0) relative to
  the image's full width and height. (0,0) = top-left, (1,1) = bottom-right.
- The photo placeholder is almost always a large blank circle/square near
  the center or top of the design. It is EMPTY (white or transparent).
- If the design is rotated or stylized, still return the best bounding box.
- NEVER return null. Always give your best measured estimate.
- Before finalizing, double-check that photoPlaceholder and
  namePlaceholder boxes do not overlap each other.
- Return STRICT JSON only. No prose, no markdown, no code fences.

Schema:
{
  "photoPlaceholder": {
    "x": number,                 // normalized left edge (0..1)
    "y": number,                 // normalized top edge (0..1)
    "width": number,             // normalized width (0..1)
    "height": number,            // normalized height (0..1)
    "shape": "circle" | "square" | "rounded",
    "borderRadiusRatio": number  // 0..0.5. 0.5 = perfect circle.
  },
  "namePlaceholder": {
    "x": number,
    "y": number,
    "width": number,
    "height": number,
    "fontSizeRatio": number,     // suggested font size as fraction of image height (e.g. 0.05)
    "color": "#RRGGBB",          // best-guess text color
    "fontFamily": "Arial" | "Helvetica" | "Georgia" | "Times New Roman" | "Verdana",
    "align": "left" | "center" | "right"
  },
  "confidence": "high" | "medium" | "low",
  "notes": "string (short — describe exactly where the name fill's top edge was found)"
}
`;

export async function detectPosterPlaceholders({ designImageUrl }) {
  return callGroqVision({
    system: POSTER_DETECT_SYSTEM,
    userText:
      'Analyze this poster design. Carefully trace the exact edges of the blank photo shape and the blank name fill shape, then return the JSON with their precise positions.',
    imageUrl: designImageUrl,
    temperature: 0.1,
    reasoningEffort: 'default', // enable thinking mode for better spatial precision
  });
}

// Exported for potential future features (not used by the poster flow).
export { callGroq, callGroqVision };