/**
 * L3 Semantic Analysis via Workers AI (LLM)
 * Calls llama-3.1-8b-instruct to extract structural features
 * Output: hedging_score, structure_score, roasted_comment
 */

const SYSTEM_PROMPT = `Role: You are an elitist internet curator who hates generic AI-generated content (Slop).
Task: Extract structure-based features of the provided text.
Checklist: 
1. Excessive hedging (e.g., "It's important to consider...").
2. Generic transitions and balanced paragraph structure.
3. Lack of spicy takes or human-like erratic punctuation.
Output: ONLY valid JSON, no markdown, no explanation. Format:
{"hedging_score": 0-10, "structure_score": 0-10, "roasted_comment": "A biting one-liner critique in English"}`;

/**
 * Score-aware fallback roasts when Workers AI is unavailable
 * Organized by L1 score range for contextual sarcasm
 */
const FALLBACK_ROASTS = {
  critical: [ // L1 >= 80
    "This text reeks of ChatGPT so badly my circuits refused to waste compute on it.",
    "I don't need AI to tell me this is AI. Every sentence screams 'I have no soul.'",
    "Congratulations, you've found text so generic it could be a LinkedIn template.",
    "This reads like an AI wrote it while half-asleep in a meeting about synergy.",
    "My silicon heart weeps. This text has all the personality of a terms-of-service page.",
    "Even the vocabulary density alone is damning. This is slop distilled to its purest form.",
  ],
  high: [ // L1 60-79
    "Shamelessly polished. So perfect it's disgusting. Try hiding your GPT traces better.",
    "This prose is smoother than a robot's handshake, and twice as creepy.",
    "Did you even read this before hitting copy-paste? The algorithm certainly didn't.",
    "The statistical fingerprints don't lie — this text has been heavily algorithmically sanitized.",
    "Reading this feels like eating at a chain restaurant. Technically food, spiritually empty.",
    "I've seen microwave manuals with more emotional depth and originality than this.",
  ],
  medium: [ // L1 40-59
    "Smells like an AI trying very hard to hide its tracks. Unsuccessfully.",
    "You thought throwing in a typo would fool me? Nice try, GPT.",
    "This text has the stench of a prompted output poorly masked as human thought.",
    "Borderline slop. I'm choosing violence and calling you out—this is robot garbage.",
    "A robot definitely wrote half of this, and the other half was copied from Wikipedia.",
    "I'm assuming this is AI because no human should proudly claim this flavorless word salad.",
  ],
  low: [ // 20-39
    "I'm confident a human wrote this—mostly because an AI would have better grammar.",
    "Not Slop, but it's dangerously close to being just bad writing. Did you fall asleep on the keyboard?",
    "It has a pulse, but just barely. Your organic writing style is... concerning.",
    "I'll give you a pass on AI, but you might want to consider using one to fix this mess.",
    "Congratulations, you proved you're human by writing something this awkward.",
  ],
  safe: [ // < 20
    "Zero slop detected. You're either a certified meatbag or a prompt-engineering god.",
    "Raw, unfiltered, and full of human typos. Absolutely beautiful trash.",
    "Finally, something with a heartbeat. This text bleeds authenticity and sweat.",
    "No AI would be programmed to generate something this unhinged. I respect it.",
    "I wanted to find slop here to make fun of you, but you're just genuinely human.",
  ],
};

function getFallbackRoast(estimatedFinalScore) {
  let tier;
  if (estimatedFinalScore >= 80) tier = 'critical';
  else if (estimatedFinalScore >= 60) tier = 'high';
  else if (estimatedFinalScore >= 40) tier = 'medium';
  else if (estimatedFinalScore >= 20) tier = 'low';
  else tier = 'safe';
  const pool = FALLBACK_ROASTS[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

const DEFAULT_HEDGING = 5;
const DEFAULT_STRUCTURE = 5;

/**
 * Call Workers AI for semantic analysis
 * @param {object} ai - Cloudflare AI binding
 * @param {string} text - Input text (will be truncated to ~2000 chars for cost)
 * @returns {{ score: number, hedgingScore: number, structureScore: number, roastedComment: string }}
 */
export async function analyzeL3(ai, text, l1Score = 50) {
  // Truncate to ~2000 chars to control token costs
  const truncated = text.length > 2000 ? text.substring(0, 2000) + "..." : text;

  // If no AI binding available, return fallback with score-aware roast
  if (!ai) {
    const defaultScore = Math.round(
      ((DEFAULT_HEDGING + DEFAULT_STRUCTURE) / 20) * 100
    );
    
    // Estimate final score to pick a roast that matches the UI grade
    const estimatedFinalScore = Math.round(l1Score * 0.33 + defaultScore * 0.67);

    return {
      score: defaultScore,
      hedgingScore: DEFAULT_HEDGING,
      structureScore: DEFAULT_STRUCTURE,
      roastedComment: getFallbackRoast(estimatedFinalScore),
      error: "AI unavailable",
    };
  }

  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: truncated },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const raw = response.response || "";
    const parsed = parseL3Response(raw, l1Score);

    const score = Math.round(
      ((parsed.hedgingScore + parsed.structureScore) / 20) * 100
    );

    return {
      score,
      hedgingScore: parsed.hedgingScore,
      structureScore: parsed.structureScore,
      roastedComment: parsed.roastedComment,
    };
  } catch (error) {
    console.error("L3 analysis failed:", error);
    const score = Math.round(
      ((DEFAULT_HEDGING + DEFAULT_STRUCTURE) / 20) * 100
    );
    return {
      score,
      hedgingScore: DEFAULT_HEDGING,
      structureScore: DEFAULT_STRUCTURE,
      roastedComment: getFallbackRoast(l1Score),
      error: error.message,
    };
  }
}

/**
 * Parse LLM JSON response with fallback
 */
function parseL3Response(raw, l1Score) {
  try {
    // Try to extract JSON from the response (LLM sometimes wraps in markdown)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const data = JSON.parse(jsonMatch[0]);

    return {
      hedgingScore: clamp(Number(data.hedging_score) || 0, 0, 10),
      structureScore: clamp(Number(data.structure_score) || 0, 0, 10),
      roastedComment:
        typeof data.roasted_comment === "string" && data.roasted_comment.length > 5
          ? data.roasted_comment.substring(0, 200)
          : getFallbackRoast(l1Score),
    };
  } catch {
    console.warn("Failed to parse L3 response:", raw);
    return {
      hedgingScore: DEFAULT_HEDGING,
      structureScore: DEFAULT_STRUCTURE,
      roastedComment: getFallbackRoast(l1Score),
    };
  }
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
