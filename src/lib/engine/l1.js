/**
 * L1 Statistical Heuristic Filter
 * Computes Slop Lexicon density and Burstiness (sentence uniformity)
 * Output: 0-100 score + highlight positions
 */

// Slop Lexicon - high-frequency AI vocabulary (200+ words)
// Organized by category for maintainability
const SLOP_WORDS = [
  // === Verbs & Verb Forms ===
  "delve", "delves", "delving", "delved",
  "embark", "embarks", "embarking", "embarked",
  "leverage", "leveraging", "leveraged",
  "streamline", "streamlined", "streamlining",
  "foster", "fostering", "fostered",
  "facilitate", "facilitating", "facilitated",
  "encompass", "encompasses", "encompassing", "encompassed",
  "elevate", "elevating", "elevated",
  "underscores", "underscore", "underscoring",
  "utilize", "utilizes", "utilizing", "utilized",
  "harness", "harnessing", "harnessed",
  "navigate", "navigating", "navigated",
  "spearhead", "spearheading",
  "catalyze", "catalyzing",
  "revolutionize", "revolutionizing", "revolutionized",
  "optimize", "optimizing", "optimized",
  "empower", "empowering", "empowered",
  "bolster", "bolstering", "bolstered",
  "propel", "propelling", "propelled",
  "augment", "augmenting", "augmented",
  "amplify", "amplifying", "amplified",
  "transcend", "transcending", "transcended",
  "resonate", "resonating", "resonated",
  "underscore", "underscoring",
  "demystify", "demystifying",
  "reimagine", "reimagining", "reimagined",
  "prioritize", "prioritizing",
  "juxtapose", "juxtaposing",

  // === Adjectives ===
  "meticulous", "meticulously",
  "intricate", "intricately",
  "comprehensive",
  "multifaceted",
  "pivotal",
  "nuanced",
  "robust",
  "seamless", "seamlessly",
  "commendable",
  "noteworthy",
  "versatile",
  "paramount",
  "invaluable",
  "indispensable",
  "groundbreaking",
  "cutting-edge",
  "thought-provoking",
  "game-changer",
  "game-changing",
  "transformative",
  "holistic",
  "synergistic",
  "innovative",
  "myriad",
  "unparalleled",
  "unprecedented",
  "formidable",
  "compelling",
  "burgeoning",
  "bespoke",
  "quintessential",
  "overarching",
  "imperative",
  "actionable",
  "scalable",
  "interoperable",
  "ubiquitous",
  "symbiotic",
  "unwavering",
  "relentless",
  "seminal",
  "salient",
  "granular",
  "indelible",
  "profound",
  "profoundly",
  "vibrant",
  "dynamic",
  "ever-evolving",
  "ever-changing",
  "all-encompassing",
  "next-generation",
  "state-of-the-art",

  // === Adverbs ===
  "notably",
  "importantly",
  "crucially",
  "furthermore",
  "moreover",
  "consequently",
  "subsequently",
  "henceforth",
  "undeniably",
  "invariably",
  "fundamentally",
  "inherently",
  "intrinsically",
  "ostensibly",
  "arguably",

  // === Nouns & Noun Phrases ===
  "landscape",
  "tapestry",
  "testament",
  "realm",
  "paradigm",
  "synergy",
  "ecosystem",
  "cornerstone",
  "linchpin",
  "catalyst",
  "bedrock",
  "underpinning",
  "underpinnings",
  "endeavor",
  "endeavors",
  "interplay",
  "confluence",
  "nexus",
  "trajectory",
  "zeitgeist",
  "ethos",
  "facet",
  "gamut",
  "plethora",
  "hallmark",
  "benchmark",
  "touchstone",
  "stakeholder",
  "stakeholders",
  "synergies",
  "paradigms",
  "frameworks",
  "methodologies",
  "intricacies",
  "complexities",
  "nuances",
  "ramifications",

  // === Common AI Filler ===
  "crucial", "crucially",
  "vital",
  "essential",
  "ensuring",
  "ultimately",
  "underscore",
];

const SLOP_PHRASES = [
  // === Opening / Structure phrases ===
  "in conclusion",
  "it's important to note",
  "it is important to note",
  "it's worth mentioning",
  "it is worth mentioning",
  "it's worth noting",
  "it is worth noting",
  "it's important to consider",
  "it is important to consider",
  "it goes without saying",

  // === AI cliché phrases ===
  "a testament to",
  "navigating the",
  "in today's digital age",
  "in today's world",
  "in today's fast-paced",
  "in today's rapidly evolving",
  "the power of",
  "unlocking the",
  "at its core",
  "in the realm of",
  "serves as a",
  "plays a crucial role",
  "in the ever-evolving",
  "stands as a",
  "deep dive",
  "paving the way",
  "shedding light on",
  "push the boundaries",
  "pushing the boundaries",
  "at the forefront",
  "on the cutting edge",
  "raises the bar",
  "raises important questions",
  "a wide range of",
  "a broad spectrum of",
  "the intersection of",
  "a myriad of",
  "a plethora of",
  "the landscape of",
  "in an era of",
  "the fabric of",
  "diving into",
  "taking a closer look",
  "a game-changer for",
  "the cornerstone of",
  "the driving force behind",
  "a paradigm shift",
  "the tip of the iceberg",
  "to put it simply",
  "with that being said",
  "having said that",
  "when it comes to",
  "it remains to be seen",
  "only time will tell",
];

/**
 * Tokenize text into words (lowercased, punctuation stripped)
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Split text into sentences with character positions
 */
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Split text into sentences WITH character positions for highlighting
 */
function splitSentencesWithPositions(text) {
  const sentences = [];
  const regex = /[^.!?\n]+[.!?]?/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const s = match[0].trim();
    if (s.length > 5) {
      sentences.push({
        text: s,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return sentences;
}

/**
 * Find all occurrences of slop words/phrases with positions
 */
function findSlopHighlights(text) {
  const highlights = [];
  const lowerText = text.toLowerCase();

  // Match phrases first (longer matches take priority)
  for (const phrase of SLOP_PHRASES) {
    let searchFrom = 0;
    while (true) {
      const idx = lowerText.indexOf(phrase, searchFrom);
      if (idx === -1) break;
      highlights.push({
        start: idx,
        end: idx + phrase.length,
        word: text.substring(idx, idx + phrase.length),
        type: "slop_phrase",
      });
      searchFrom = idx + phrase.length;
    }
  }

  // Match individual words
  const wordRegexParts = SLOP_WORDS.map(
    (w) => `\\b${w.replace(/[-]/g, "\\-")}\\b`
  );
  const wordRegex = new RegExp(wordRegexParts.join("|"), "gi");
  let match;
  while ((match = wordRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    // Skip if overlapping with an existing phrase highlight
    const overlaps = highlights.some(
      (h) => start < h.end && end > h.start
    );
    if (!overlaps) {
      highlights.push({
        start,
        end,
        word: match[0],
        type: "slop_word",
      });
    }
  }

  // Sort by position
  highlights.sort((a, b) => a.start - b.start);
  return highlights;
}

/**
 * Calculate Lexicon Score (0-100)
 * density = slop_word_hits / total_words
 * score = min(density / 0.05, 1.0) * 100
 */
function calcLexiconScore(text) {
  const words = tokenize(text);
  if (words.length === 0) return 0;

  const highlights = findSlopHighlights(text);
  // Count unique word hits (phrases count as their word count)
  let hitWords = 0;
  for (const h of highlights) {
    hitWords += h.word.split(/\s+/).length;
  }

  const density = hitWords / words.length;
  return Math.min(density / 0.05, 1.0) * 100;
}

/**
 * Calculate Burstiness Score (0-100)
 * Lower std_dev of sentence lengths = more AI-like = higher score
 * score = max(0, (1 - std_dev / 15)) * 100
 */
function calcBurstinessScore(text) {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return 50; // Not enough data, neutral

  const lengths = sentences.map((s) => tokenize(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return Math.max(0, (1 - stdDev / 15)) * 100;
}

// ============================================================
// P0: Sentence Pattern Detection
// ============================================================

/**
 * AI-typical sentence structure patterns (regex-based)
 */
const AI_SENTENCE_PATTERNS = [
  // "It is [adj] to [verb]" / "It's important to note"
  { regex: /\b(?:it is|it's)\s+\w+\s+to\s+\w+/gi, label: "Formulaic opener" },
  // "By [verb-ing], [subject] can..."
  { regex: /^by\s+\w+ing\b.*?,\s+/gim, label: "By-gerund pattern" },
  // "This [noun] serves as / stands as / acts as"
  { regex: /\bthis\s+\w+\s+(?:serves|stands|acts)\s+as\b/gi, label: "Declarative formula" },
  // "[Subject] plays a [adj] role in"
  { regex: /\b\w+\s+plays\s+a\s+\w+\s+role\s+in\b/gi, label: "Role attribution" },
  // "There are [number/several/many] [key/main/important]"
  { regex: /\bthere\s+are\s+(?:\d+|several|many|numerous|various)\s+(?:key|main|important|critical|essential|primary)\b/gi, label: "List introduction" },
  // "Not only... but also..."
  { regex: /\bnot\s+only\b.*?\bbut\s+also\b/gi, label: "Balanced construction" },
  // "Whether... or..."
  { regex: /\bwhether\s+.*?\bor\s+\b/gi, label: "Binary framing" },
  // "In order to [verb]"
  { regex: /\bin\s+order\s+to\s+\w+/gi, label: "Verbose infinitive" },
  // "One of the most [adj] [noun]"
  { regex: /\bone\s+of\s+the\s+most\s+\w+/gi, label: "Superlative hedging" },
  // "As [noun] continues to [verb]"
  { regex: /\bas\s+\w+\s+continues?\s+to\s+\w+/gi, label: "Continuity cliché" },
  // "[Noun] has become [increasingly/a]"
  { regex: /\b\w+\s+has\s+become\s+(?:increasingly|a\s+\w+)/gi, label: "Evolution statement" },
  // "The [adj] [noun] of [noun]"
  { regex: /\bthe\s+\w+\s+(?:landscape|realm|world|domain|sphere|arena)\s+of\b/gi, label: "Domain framing" },
];

/**
 * Transition word openers - AI texts start many sentences with these
 */
const TRANSITION_OPENERS = [
  "additionally", "moreover", "furthermore", "consequently",
  "subsequently", "nevertheless", "nonetheless", "however",
  "therefore", "thus", "hence", "meanwhile",
  "conversely", "similarly", "likewise", "alternatively",
  "notably", "importantly", "significantly", "ultimately",
  "essentially", "fundamentally", "overall", "accordingly",
  "in addition",
];

/**
 * Calculate Pattern Score (0-100)
 * Measures density of AI-typical sentence patterns
 */
function calcPatternScore(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0;

  let patternHits = 0;

  // Check sentence patterns
  for (const { regex } of AI_SENTENCE_PATTERNS) {
    // Reset regex state
    regex.lastIndex = 0;
    const matches = text.match(regex);
    if (matches) patternHits += matches.length;
  }

  // Check transition word openers
  let transitionOpeners = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim().toLowerCase();
    for (const opener of TRANSITION_OPENERS) {
      if (trimmed.startsWith(opener + " ") || trimmed.startsWith(opener + ",")) {
        transitionOpeners++;
        break;
      }
    }
  }

  // Pattern density: hits per sentence
  const patternDensity = patternHits / sentences.length;
  const patternScore = Math.min(patternDensity / 0.3, 1.0) * 70; // max 70 from patterns

  // Transition opener ratio
  const transitionRatio = transitionOpeners / sentences.length;
  const transitionScore = Math.min(transitionRatio / 0.25, 1.0) * 30; // max 30 from transitions

  return Math.round(patternScore + transitionScore);
}

// ============================================================
// P0: Sentence-Level AI Scoring
// ============================================================

/**
 * Calculate per-sentence AI probability scores
 * Each sentence gets a 0-100 score based on:
 *  - Slop word density within that sentence
 *  - Pattern matches in that sentence
 *  - Transition word opener
 * @returns {Array<{text: string, start: number, end: number, score: number, flags: string[]}>}
 */
function calcSentenceScores(text) {
  const sentencesWithPos = splitSentencesWithPositions(text);
  if (sentencesWithPos.length === 0) return [];

  const globalHighlights = findSlopHighlights(text);

  return sentencesWithPos.map((s) => {
    const flags = [];
    let score = 0;

    // 1. Slop word density in this sentence (0-50 pts)
    const wordsInSentence = tokenize(s.text);
    const slopInSentence = globalHighlights.filter(
      (h) => h.start >= s.start && h.end <= s.end
    );
    if (wordsInSentence.length > 0 && slopInSentence.length > 0) {
      const slopWords = slopInSentence.reduce(
        (acc, h) => acc + h.word.split(/\s+/).length, 0
      );
      const density = slopWords / wordsInSentence.length;
      score += Math.min(density / 0.08, 1.0) * 50;
      flags.push(`${slopInSentence.length} slop term${slopInSentence.length > 1 ? "s" : ""}`);
    }

    // 2. Sentence pattern matches (0-30 pts)
    for (const { regex, label } of AI_SENTENCE_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(s.text)) {
        score += 10;
        flags.push(label);
      }
    }
    score = Math.min(score, 80); // Cap pattern contribution

    // 3. Transition word opener (0-20 pts)
    const trimmedLower = s.text.trim().toLowerCase();
    for (const opener of TRANSITION_OPENERS) {
      if (trimmedLower.startsWith(opener + " ") || trimmedLower.startsWith(opener + ",")) {
        score += 20;
        flags.push("Transition opener");
        break;
      }
    }

    score = Math.min(100, Math.round(score));

    return {
      text: s.text,
      start: s.start,
      end: s.end,
      score,
      flags,
      level: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    };
  });
}

// ============================================================
// Main L1 Analysis
// ============================================================

/**
 * Run L1 analysis
 * @param {string} text - Input text
 * @returns {{ score, lexiconScore, burstinessScore, patternScore, stdDev, highlights, sentenceScores }}
 */
export function analyzeL1(text) {
  const lexiconScore = Math.round(calcLexiconScore(text));
  const highlights = findSlopHighlights(text);
  const patternScore = Math.round(calcPatternScore(text));
  const sentenceScores = calcSentenceScores(text);

  const sentences = splitSentences(text);
  const lengths = sentences.map((s) => tokenize(s).length);
  const mean =
    lengths.length > 0
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0;
  const variance =
    lengths.length > 1
      ? lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) /
        lengths.length
      : 0;
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

  const burstinessScore = Math.round(calcBurstinessScore(text));

  // Updated formula: lexicon 35%, burstiness 35%, patterns 30%
  const score = Math.round(
    lexiconScore * 0.35 + burstinessScore * 0.35 + patternScore * 0.30
  );

  return {
    score,
    lexiconScore,
    burstinessScore,
    patternScore,
    stdDev,
    highlights,
    sentenceScores,
  };
}

/**
 * Count words in text
 */
export function countWords(text) {
  return tokenize(text).length;
}
