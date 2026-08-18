// floorPlanVision.js
//
// Uses Claude's vision capability (same Anthropic API already configured
// for the chat widget — see chatEngine.js) to read an uploaded floor plan
// image or PDF and extract room positions, types, dimensions, and the
// compass orientation.
//
// IMPORTANT — this is genuinely imperfect, by nature of the task:
// blueprints vary wildly in style, hand-drawn plans, scan quality, and
// symbol conventions. This module never writes directly into a booking's
// answers. It only produces a *draft* for the customer to review and
// correct (see server.js POST .../analyze vs POST .../apply) — treat its
// output as a starting point, not ground truth.

const ROOM_VOCABULARY = [
  "entrance", "kitchen", "bedroom", "room2", "childrenRoom", "homeOffice",
  "poojaRoom", "livingRoom", "bathroom", "bathroom2", "bathroom3",
  "storeroom", "staircase", "waterSource"
];

const DIRECTIONS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];

const VISION_PROMPT = `You are analysing an uploaded residential floor plan (image or PDF) for a Vastu Shastra audit tool.

Your job: identify (1) the compass orientation of the plan, and (2) every labelled room, its approximate compass direction relative to the plan's centre, and its dimensions if labelled.

Respond with ONLY a single JSON object, no other text, no markdown code fences. Schema:

{
  "northArrowFound": boolean,
  "northArrowNote": "one sentence on how you determined orientation, or that you assumed standard top-of-page = North because no arrow/label was visible",
  "overallConfidence": "high" | "medium" | "low",
  "rooms": [
    {
      "detectedLabel": "the exact text label as it appears in the plan, e.g. 'MASTER BEDROOM'",
      "roomId": "one of: ${ROOM_VOCABULARY.join(", ")}, or null if it doesn't clearly match any of these",
      "direction": "one of: ${DIRECTIONS.join(", ")}, or null if unclear",
      "widthFeet": number or null,
      "lengthFeet": number or null,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "warnings": ["short strings noting anything ambiguous, illegible, or uncertain — e.g. 'No north arrow visible, assumed top of page is North', 'Dimensions for Kitchen not legible'"]
}

Room id matching guide:
- "entrance" / "main door" / "foyer" -> entrance
- "kitchen" -> kitchen
- the largest/primary bedroom, "master bedroom" -> bedroom
- a second bedroom -> room2 (a third distinct bedroom can also map to room2 with a note in warnings)
- "children's room" / "kids room" / "nursery" -> childrenRoom
- "study" / "office" / "home office" -> homeOffice
- "pooja room" / "puja room" / "prayer room" / "mandir" -> poojaRoom
- "living room" / "drawing room" / "hall" / "family room" -> livingRoom
- "toilet" / "washroom" / "bathroom" / "WC" -> bathroom (a second one -> bathroom2, a third -> bathroom3)
- "store" / "storeroom" / "utility" -> storeroom
- "staircase" / "stairs" -> staircase
- an overhead tank / borewell / well marked on the plan -> waterSource
- anything else (balcony, porch, garage, dining, yard) -> roomId null, but still list it with its detectedLabel so nothing is silently dropped

Direction: work out each room's position relative to the plan's centre point and the compass orientation, then round to the nearest of the 8 directions listed above.

Return ONLY the JSON object.`;

async function callAnthropicVision(base64Data, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("...")) {
    throw new Error("AI floor plan analysis isn't configured — set a real ANTHROPIC_API_KEY in your .env file.");
  }

  const isPdf = mimeType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: VISION_PROMPT }]
        }
      ]
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(block => block.type === "text");
  if (!textBlock) throw new Error("Anthropic API returned no text content.");
  return textBlock.text;
}

function parseVisionResponse(rawText) {
  // Strip stray markdown fences in case the model adds them despite instructions
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse the AI's response as JSON — the plan may be too unclear to read automatically. Please use manual input instead.");
  }

  const rooms = Array.isArray(parsed.rooms) ? parsed.rooms.map(r => ({
    detectedLabel: String(r.detectedLabel || "").slice(0, 100),
    roomId: ROOM_VOCABULARY.includes(r.roomId) ? r.roomId : null,
    direction: DIRECTIONS.includes(r.direction) ? r.direction : null,
    widthFeet: Number.isFinite(Number(r.widthFeet)) ? Number(r.widthFeet) : null,
    lengthFeet: Number.isFinite(Number(r.lengthFeet)) ? Number(r.lengthFeet) : null,
    confidence: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "low"
  })) : [];

  return {
    northArrowFound: !!parsed.northArrowFound,
    northArrowNote: String(parsed.northArrowNote || "").slice(0, 300),
    overallConfidence: ["high", "medium", "low"].includes(parsed.overallConfidence) ? parsed.overallConfidence : "low",
    rooms,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(w => String(w).slice(0, 300)).slice(0, 20) : [],
    analyzedAt: new Date().toISOString()
  };
}

/**
 * @param {Buffer} fileBuffer - the uploaded floor plan file's raw bytes
 * @param {string} mimeType - e.g. "image/png", "image/jpeg", "application/pdf"
 * @returns {Promise<Object>} structured, customer-reviewable draft — see parseVisionResponse shape
 */
async function analyzeFloorPlan(fileBuffer, mimeType) {
  const base64Data = fileBuffer.toString("base64");
  const rawText = await callAnthropicVision(base64Data, mimeType);
  return parseVisionResponse(rawText);
}

module.exports = { analyzeFloorPlan, parseVisionResponse, ROOM_VOCABULARY, DIRECTIONS };
