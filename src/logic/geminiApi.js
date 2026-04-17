import { GoogleGenerativeAI } from "@google/generative-ai";
import { getConfidence } from '../context/StadiumContext';

// ─── Singleton Gemini client ──────────────────────────────────────────────────
// Instantiated once at module level to avoid re-initialising the SDK on every
// call. The model reference is also cached — avoids redundant object creation.
let _genAI = null;
let _model = null;

function getModel() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(apiKey);
    // gemini-2.0-flash: fast, low-latency, production-ready Gemini model
    _model = _genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  return _model;
}

// ─── Smart Mode definitions ───────────────────────────────────────────────────
/**
 * Rules injected into the AI prompt for each Smart Mode.
 * Each entry maps to specific routing priorities and tone.
 */
const SMART_MODE_RULES = {
  fastest: {
    label:    '⚡ Fastest',
    priority: 'Minimise travel time above all else. Choose the route with the lowest current density and fastest projected clearance.',
    tone:     'Direct and decisive. State the fastest exit/gate first, then the single reason.',
    example:  '"Use Exit Y. Fastest route with lowest congestion right now."',
  },
  family: {
    label:    '👨‍👩‍👧 Family',
    priority: 'Prioritise safety and low crowd density. Avoid high-density or rapidly-increasing zones. Prefer calm, well-lit paths.',
    tone:     'Reassuring and caring. State the safest exit/gate first, then why it is family-friendly.',
    example:  '"Use Exit Y. Safer and less crowded — ideal for families."',
  },
  group: {
    label:    '👥 Group',
    priority: 'Avoid bottlenecks or narrow zones that could cause a group to split. Choose wide, clear exits. Timing matters — advise leaving promptly.',
    tone:     'Confident and urgent. State the best group exit first, then confirm why it keeps the group together.',
    example:  '"Leave now via Exit Y. Spacious and avoids split risk for larger groups."',
  },
  elderly: {
    label:    '🧓 Elderly',
    priority: 'Prioritise smooth, low-density routes. Avoid crowded or high-trend areas. Prefer gradual paths with minimal stopping.',
    tone:     'Gentle and reassuring. State the most comfortable exit/gate, then the comfort reason.',
    example:  '"Use Gate A. Calm and less dense — comfortable for elderly attendees."',
  },
};

/**
 * buildModeBlock — generates the Smart Mode section for the system prompt.
 * @param {string} mode — one of fastest | family | group | elderly
 */
function buildModeBlock(mode) {
  const m = SMART_MODE_RULES[mode] ?? SMART_MODE_RULES.fastest;
  return `
      === SMART MODE: ${m.label} ===
      User Mode: ${m.label}
      Routing Priority: ${m.priority}
      Response Tone: ${m.tone}
      Example format: ${m.example}

      STRICT RULES FOR THIS MODE:
      1. Keep response to MAX 2 sentences: first sentence = action (which gate/exit), second = ONE reason.
      2. DO NOT provide lists, bullet points, or lengthy explanations.
      3. Personalise the recommendation specifically for the "${mode}" user type.
      4. Open with the recommended gate/exit name directly.
  `;
}

// ─── Prompt injection sanitiser ───────────────────────────────────────────────
/**
 * sanitizeForPrompt — removes characters commonly used in prompt injection attacks
 * before the user message is interpolated into the system prompt.
 * Strips: backticks, angle brackets, and common injection phrases.
 *
 * @param {string} raw — raw user input (already length-limited by the UI)
 * @returns {string} sanitized string safe for system prompt interpolation
 */
function sanitizeForPrompt(raw) {
  return raw
    .replace(/[`<>]/g, '')                                  // strip code-fence & HTML chars
    .replace(/ignore\s+(previous|all|above)\s+instructions?/gi, '') // neutralize injection phrases
    .replace(/system\s*prompt/gi, '')                       // neutralize "system prompt" references
    .trim();
}

// ─── Vote formatter ───────────────────────────────────────────────────────────
/**
 * Converts raw vote counts into a natural-language block for the AI system prompt.
 * Handles the new "Clear / Free" emphasis — when a location has a clear majority
 * it surfaces a prominent "CLEAR AREA" note so the AI responds accordingly.
 *
 * @param {Record<string, {low:number, medium:number, high:number}>} votes
 * @returns {{ block: string, clearZones: string[], crowdedZones: string[], hasAnyVotes: boolean }}
 */
function analyzeVotes(votes) {
  if (!votes || Object.keys(votes).length === 0) {
    return {
      block: 'No user votes submitted yet.',
      clearZones: [], crowdedZones: [], hasAnyVotes: false,
    };
  }

  const clearZones   = [];
  const crowdedZones = [];
  let   hasAnyVotes  = false;

  const block = Object.entries(votes)
    .map(([locationId, v]) => {
      const total = (v.low ?? 0) + (v.medium ?? 0) + (v.high ?? 0);
      if (total === 0) return `${locationId.toUpperCase()}: No votes yet`;

      hasAnyVotes = true;

      const clearPct    = Math.round(((v.low    ?? 0) / total) * 100);
      const moderatePct = Math.round(((v.medium ?? 0) / total) * 100);
      const crowdedPct  = Math.round(((v.high   ?? 0) / total) * 100);

      // Confidence via shared helper (keeps UI and AI in sync)
      const conf = getConfidence(total);

      // Dominant bucket
      const dominant =
        clearPct >= moderatePct && clearPct >= crowdedPct ? 'CLEAR'
        : crowdedPct >= moderatePct                        ? 'CROWDED'
        :                                                    'MODERATE';

      // Track zones with their confidence tier for AI priority rules
      if (dominant === 'CLEAR' && clearPct >= 50) {
        clearZones.push({ id: locationId, pct: clearPct, conf });
      }
      if (dominant === 'CROWDED' && crowdedPct >= 50) {
        crowdedZones.push({ id: locationId, pct: crowdedPct, conf });
      }

      // Natural-language description with confidence
      let line = `${locationId.toUpperCase()}: ${clearPct}% Clear/Free · ${moderatePct}% Moderate · ${crowdedPct}% Crowded (${total} reports, Confidence: ${conf.label}) → Dominant: ${dominant}`;
      if (dominant === 'CLEAR') {
        line += ` ✅ — User reports indicate this area is mostly clear and offers smooth movement. Based on live reports, this area currently offers smooth movement.`;
      } else if (dominant === 'CROWDED') {
        line += ` 🔴 — Users report high congestion here. Advise attendees to avoid this area.`;
      }

      return line;
    })
    .join('\n      ');

  return { block, clearZones, crowdedZones, hasAnyVotes };
}

// ─── Main AI function ─────────────────────────────────────────────────────────
/**
 * askFlowSyncAI — sends a query to Gemini with full live context:
 *   - Simulated sensor crowd data
 *   - User crowd vote aggregations (with confidence tiers)
 *   - Smart Mode personalisation
 *   - Active vendor perk incentive (when triggered)
 *   - Prompt injection protection on user input
 *
 * @param {string}  userMessage
 * @param {object}  currentStadiumData
 * @param {object}  [votes]       — optional voting data from StadiumContext
 * @param {string}  [smartMode]   — one of fastest | family | group | elderly
 * @param {object}  [activePerk]  — perk object from vendorPerks.js (or null)
 * @param {string}  [language]    — response language
 */
export async function askFlowSyncAI(
  userMessage,
  currentStadiumData,
  votes      = {},
  smartMode  = 'fastest',
  activePerk = null,
  language   = 'English',
) {
  try {
    const model = getModel();
    if (!model) {
      return "Error: API Key is missing. Please check your .env file.";
    }

    // Sanitize user input before prompt interpolation (prompt injection defense)
    const safeUserMessage = sanitizeForPrompt(userMessage);

    const { block: votingBlock, clearZones, crowdedZones, hasAnyVotes } = analyzeVotes(votes);
    const modeBlock = buildModeBlock(smartMode);

    // ── Vendor perk block ────────────────────────────────────────────────────────
    const perkBlock = activePerk?.active
      ? `=== VENDOR PERK (ACTIVE — LIMITED 5 MIN OFFER) ===
      ${activePerk.aiContext}
      RULE: When recommending a route, naturally mention this perk as an incentive.
      Keep perk mention brief (1 sentence max): state the vendor, the offer, and the location.
      Example: "Head to ${activePerk?.clearZone} and enjoy ${activePerk?.offer} at ${activePerk?.vendor}."`
      : '';

    // ── Dynamic AI behaviour rules based on vote state ────────────────────────
    let priorityRules = '';

    if (!hasAnyVotes) {
      priorityRules = '- No user votes submitted yet. Base all advice on sensor data only.';
    } else {
      const highConfClear   = clearZones.filter(z => z.conf.tier === 3);
      const lowConfClear    = clearZones.filter(z => z.conf.tier === 1);
      const highConfCrowded = crowdedZones.filter(z => z.conf.tier === 3);

      priorityRules = `- User-reported voting data IS available. PRIORITIZE HIGH-CONFIDENCE data over low-confidence and sensor data.
      - Use phrases like "Based on live user reports..." or "Users indicate..." when citing votes.
      - ALWAYS mention confidence level when discussing a zone: e.g., "confidence is low" or "high confidence reports indicate".
      - Cross-reference sensor trends with vote consensus for maximum accuracy.`;

      if (highConfClear.length > 0) {
        const zoneList = highConfClear.map(z => `${z.id.toUpperCase()} (${z.pct}% clear, ${z.conf.label} confidence)`).join(', ');
        priorityRules += `\n      - HIGH CONFIDENCE CLEAR ZONES: ${zoneList}.\n        Respond with confident routing: "Based on live reports, [zone] currently offers smooth movement."\n        Emphasise these as Community Verified Best Routes.`;
      }
      if (lowConfClear.length > 0) {
        const zoneList = lowConfClear.map(z => `${z.id.toUpperCase()} (${z.pct}% clear, ${z.conf.label} confidence)`).join(', ');
        priorityRules += `\n      - LOW CONFIDENCE CLEAR ZONES: ${zoneList}.\n        Add caution: "[zone] appears clear, but confidence is low due to limited reports."`;
      }
      if (highConfCrowded.length > 0) {
        const zoneList = highConfCrowded.map(z => `${z.id.toUpperCase()} (${z.pct}% crowded, ${z.conf.label} confidence)`).join(', ');
        priorityRules += `\n      - HIGH CONFIDENCE CROWDED ZONES: ${zoneList}.\n        Strongly advise against routing.`;
      }
      const lowConfCrowded = crowdedZones.filter(z => z.conf.tier < 3);
      if (lowConfCrowded.length > 0) {
        const zoneList = lowConfCrowded.map(z => `${z.id.toUpperCase()} (${z.pct}% crowded, ${z.conf.label} confidence)`).join(', ');
        priorityRules += `\n      - CROWDED ZONES (lower confidence): ${zoneList}.\n        Advise caution and mention that data is still accumulating.`;
      }
    }

    const systemPrompt = buildSystemPrompt({
      safeUserMessage, language, modeBlock, perkBlock,
      currentStadiumData, votingBlock, priorityRules,
    });

    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    const msg = error?.message ?? '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return "Error: Invalid Gemini API key. Please check your .env configuration.";
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return "Error: Gemini API quota exceeded. Please try again later.";
    }
    if (msg.includes('SAFETY')) {
      return "I'm unable to respond to that query due to safety filters. Please rephrase your question.";
    }
    return `Error: Unable to connect to FlowSync Predictive Engine. ${msg}`;
  }
}

// ─── Shared prompt builder (used by both ask and stream) ──────────────────────
function buildSystemPrompt({ safeUserMessage, language, modeBlock, perkBlock, currentStadiumData, votingBlock, priorityRules }) {
  return `
[LANGUAGE OVERRIDE — HIGHEST PRIORITY]
You MUST write your entire response in ${language}. Every word, sentence, and punctuation must be in ${language}. Do NOT use English in your response unless ${language} itself is English. This overrides all other instructions.

      You are FlowSync AI, a strategic stadium crowd management intelligence system.
      You help operators and attendees navigate safely by synthesizing sensor data with live user reports.

      ${modeBlock}

      ${perkBlock}

      === LIVE SENSOR DATA (simulated, 4-second updates) ===
      ${JSON.stringify(currentStadiumData, null, 2)}

      === LIVE CROWD CONSENSUS (real-time user reports with confidence) ===
      ${votingBlock}

      === BEHAVIOUR RULES ===
      ${priorityRules}
      - ALWAYS follow the Smart Mode constraints above.
      - Response MUST be MAX 2 sentences: action first, then reason.
      - When recommending an exit or gate, always state WHY using the combined data.
      - ALWAYS explicitly state confidence level when citing vote data.
      - If a VENDOR PERK is active, naturally mention it in your recommendation (1 sentence max).

      === USER QUERY ===
      "${safeUserMessage}"
    `;
}

// ─── Streaming API call ────────────────────────────────────────────────────────
/**
 * streamFlowSyncAI — streams the Gemini response word-by-word using
 * generateContentStream(). Use this for real-time UI streaming.
 *
 * @param {string}   userMessage
 * @param {object}   currentStadiumData
 * @param {object}   [votes]
 * @param {string}   [smartMode]
 * @param {object}   [activePerk]
 * @param {string}   [language]
 * @param {Function} onChunk  — callback(chunkText: string, fullText: string)
 * @returns {Promise<string>} — full assembled response text
 */
export async function streamFlowSyncAI(
  userMessage,
  currentStadiumData,
  votes      = {},
  smartMode  = 'fastest',
  activePerk = null,
  language   = 'English',
  onChunk    = null,
) {
  try {
    const model = getModel();
    if (!model) return "Error: API Key is missing. Please check your .env file.";

    const safeUserMessage                            = sanitizeForPrompt(userMessage);
    const { block: votingBlock, clearZones,
            crowdedZones, hasAnyVotes }              = analyzeVotes(votes);
    const modeBlock                                  = buildModeBlock(smartMode);
    const perkBlock = activePerk?.active
      ? `=== VENDOR PERK (ACTIVE) ===\n${activePerk.aiContext}` : '';

    let priorityRules = hasAnyVotes
      ? '- User votes available. Cross-reference with sensor data for accuracy.'
      : '- No user votes yet. Base all advice on sensor data only.';

    const systemPrompt = buildSystemPrompt({
      safeUserMessage, language, modeBlock, perkBlock,
      currentStadiumData, votingBlock, priorityRules,
    });

    const result = await model.generateContentStream(systemPrompt);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk?.(chunkText, fullText);
    }
    return fullText;

  } catch (error) {
    console.error("Gemini Stream Error:", error);
    const msg = error?.message ?? '';
    if (msg.includes('API_KEY_INVALID')) return "Error: Invalid API key.";
    if (msg.includes('RESOURCE_EXHAUSTED')) return "Error: API quota exceeded.";
    return `Error: Streaming failed. ${msg}`;
  }
}