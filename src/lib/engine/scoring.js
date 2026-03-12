/**
 * Scoring Engine - Combines L1 and L3 scores
 * MVP formula: S = L1 * 0.33 + L3 * 0.67
 */

import { analyzeL1, countWords } from "./l1";
import { analyzeL3 } from "./l3";

const SHORT_TEXT_THRESHOLD = 50; // words (informational only)

/**
 * Run full detection pipeline
 * @param {string} text - Input text to analyze
 * @param {object} ai - Cloudflare AI binding
 * @returns {object} Full detection result
 */
export async function runDetection(text, ai) {
  const wordCount = countWords(text);
  const isShortText = wordCount < SHORT_TEXT_THRESHOLD;

  // Run L1 statistical analysis
  const l1 = analyzeL1(text);

  // Run L3 semantic analysis for ALL text lengths
  const l3 = await analyzeL3(ai, text, l1.score);
  let finalScore = Math.round(l1.score * 0.33 + l3.score * 0.67);

  // Clamp to 0-100
  finalScore = Math.min(100, Math.max(0, finalScore));

  // Determine grade
  const grade = getGrade(finalScore);

  return {
    slopScore: finalScore,
    grade,
    isShortText,
    wordCount,
    l1: {
      score: l1.score,
      lexiconScore: l1.lexiconScore,
      burstinessScore: l1.burstinessScore,
      patternScore: l1.patternScore,
      stdDev: l1.stdDev,
    },
    sentenceScores: l1.sentenceScores,
    l3: {
      score: l3.score,
      hedgingScore: l3.hedgingScore,
      structureScore: l3.structureScore,
    },
    roastedComment: l3.roastedComment,
    highlights: l1.highlights,
  };
}

/**
 * Get grade label based on score
 */
export function getGrade(score) {
  if (score >= 80) return { label: "Total Slop", emoji: "🗑️", level: "critical" };
  if (score >= 60) return { label: "Shameless Copy-Paste", emoji: "🤖", level: "high" };
  if (score >= 40) return { label: "Half-Baked Slop", emoji: "🤢", level: "medium" };
  if (score >= 20) return { label: "Awkwardly Human", emoji: "😒", level: "low" };
  return { label: "Human Soul", emoji: "❤️", level: "safe" };
}

/**
 * Fallback roasts for short text that skips L3
 */
const SHORT_ROASTS = {
  high: [
    "Even in this tiny snippet, the AI stench is undeniable.",
    "Short but unapologetically sloppy. Every word screams 'I was batch-generated.'",
    "You can't hide slop behind brevity. This reeks of prompt engineering.",
    "Few words, maximum cringe. An AI masterclass in soulless mediocrity.",
  ],
  medium: [
    "Too short to be sure, but I'm calling it: algorithmic garbage.",
    "Brief and highly suspicious. Like a robotic one-liner nobody believes.",
    "I'm squinting at this text and I just see ChatGPT's sweating processor.",
    "Not enough evidence for a conviction, but I'm choosing violence: this is AI.",
  ],
  low: [
    "Brief and awkwardly human — a rare trait these days.",
    "Short, slightly chaotic, and refreshingly un-algorithmic.",
    "Terse, messy, possibly human. I'll let it slide.",
    "No obvious slop here, just regular human trash. You passed the check.",
  ],
};

function getShortTextRoast(score) {
  let pool;
  if (score >= 60) pool = SHORT_ROASTS.high;
  else if (score >= 40) pool = SHORT_ROASTS.medium;
  else pool = SHORT_ROASTS.low;
  return pool[Math.floor(Math.random() * pool.length)];
}
