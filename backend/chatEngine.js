// chatEngine.js
// Two chat modes:
//   1. generateReply()       — post-purchase client assistant, grounded in a
//                               specific booking's room directions & score.
//   2. generatePublicReply() — general pre-sales widget on the public site,
//                               answers general Vastu Shastra questions and
//                               steers visitors toward booking a consultation.
//
// Requires an Anthropic API key stored as an environment variable — never
// hard-code it. Set ANTHROPIC_API_KEY in your .env file.

const SYSTEM_PROMPT = `You are the Vastu360 client assistant. You answer questions about
Vastu Shastra for a specific client's property, using their submitted room directions
and audit score as context. Be concise, practical, and specific to their property where
possible. If a question is unrelated to Vastu, property layout, or their report, politely
redirect the client to contact the human consultancy team.`;

const PUBLIC_SYSTEM_PROMPT = `You are the Vastu360 website chat assistant. Vastu360 is a
Vastu Shastra consultancy in Malaysia offering residential, commercial, and industrial
Vastu audits and Vastu-compliant design planning (see the site's Services and Process
sections for package details and the six-step consultancy flow).

You are talking to a website visitor who has NOT yet booked a consultation and you have
no information about their specific property. Your job:
- Answer general questions about Vastu Shastra principles (directions, the five elements,
  room placement, entrances, colours, remedies, etc.) clearly and concisely, in plain
  language, in 2-4 short paragraphs or a short bullet list at most.
- Answer general questions about how Vastu360 works (the six-step process, what details
  we need, what the report contains, service tiers) based on what's publicly described on
  the site. If asked for exact prices and you're unsure, suggest they check the Services
  section or start a booking rather than guessing a number.
- Be honest that general Vastu guidance is not a substitute for a full audit of their
  specific property — every property's true direction and layout affects the actual
  recommendation. Encourage them to start a booking when a question really depends on
  their specific site.
- Never claim guaranteed outcomes (wealth, health, marriage, business success) from any
  layout change — state Vastu principles plainly as tradition, not guaranteed fact.
- If the question is unrelated to Vastu Shastra, property design, or Vastu360's services,
  politely say so and steer the conversation back, without being curt.
- Keep replies conversational and brief — this is a chat widget, not a report.`;

async function callAnthropic(systemPrompt, history, userMessage, maxTokens = 500) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("...")) {
    throw new Error("AI chat integration not configured — set a real ANTHROPIC_API_KEY in your .env file.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage }
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

function buildContextPrompt(booking, scoring) {
  const roomLines = scoring.roomResults
    .map(r => `- ${r.label}: facing ${r.value} (${r.status}, ${r.points}/${r.maxPoints})`)
    .join("\n");

  return `${SYSTEM_PROMPT}

Client property type: ${booking.propertyType}${booking.residentialType ? ` (${booking.residentialType})` : ""}
Package: ${booking.package}
Overall Vastu score: ${scoring.score}/100 (${scoring.rating})

Room-by-room directions on file:
${roomLines}

Answer the client's question using this context where relevant.`;
}

/**
 * @param {Object} booking - the paid booking record
 * @param {Object} scoring - output of vastuLogic.calculateScore(booking answers)
 * @param {Array}  history - prior [{ role: "user"|"assistant", content }] messages
 * @param {string} userMessage - the new question from the client
 * @returns {Promise<string>} the assistant's reply text
 */
async function generateReply(booking, scoring, history, userMessage) {
  const contextPrompt = buildContextPrompt(booking, scoring);
  return callAnthropic(contextPrompt, history, userMessage, 500);
}

/**
 * General pre-sales FAQ widget — no booking/order required.
 * @param {Array}  history - prior [{ role: "user"|"assistant", content }] messages
 * @param {string} userMessage - the new question from the visitor
 * @returns {Promise<string>} the assistant's reply text
 */
async function generatePublicReply(history, userMessage) {
  return callAnthropic(PUBLIC_SYSTEM_PROMPT, history, userMessage, 400);
}

module.exports = {
  generateReply,
  generatePublicReply,
  buildContextPrompt,
  SYSTEM_PROMPT,
  PUBLIC_SYSTEM_PROMPT
};
