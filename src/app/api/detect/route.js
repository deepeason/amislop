/**
 * POST /api/detect
 * Main detection endpoint
 * Accepts: { text?: string, url?: string }
 * Returns: detection result with scores, highlights, and roasted comment
 */
import { NextResponse } from "next/server";
import { getCloudflareBindings } from "@/lib/cloudflare";
import { runDetection, getGrade } from "@/lib/engine/scoring";
import { fetchUrlContent } from "@/lib/engine/url-fetcher";

export const runtime = "edge";

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, url } = body;

    // Validate input
    if (!text && !url) {
      return NextResponse.json(
        { error: "Please provide text or a URL to analyze." },
        { status: 400 }
      );
    }

    // Get Cloudflare bindings
    let bindings;
    try {
      bindings = await getCloudflareBindings();
    } catch {
      // Fallback for local dev without Cloudflare bindings
      bindings = { AI: null, DB: null, KV: null, VECTORIZE: null };
    }

    // IP-based Rate Limiting (5 times/day for anonymous users)
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "127.0.0.1";
    if (bindings.KV) {
      try {
        const today = new Date().toISOString().split('T')[0];
        // Hash IP or use directly (for simplicity we use plain IP unless hashing is mandated)
        const rateKey = `rate:anon:${ip}:${today}`;
        const currentCountStr = await bindings.KV.get(rateKey);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        
        if (currentCount >= 5) {
          return NextResponse.json(
            { error: "Daily limit exceeded. You can only analyze 5 items per day. Rate limit relies on your IP address." },
            { status: 429 }
          );
        }
        
        // Increment immediately to prevent race conditions during long AI calls
        // 172800 seconds = 48 hours TTL
        await bindings.KV.put(rateKey, (currentCount + 1).toString(), { expirationTtl: 172800 });
      } catch (e) {
        console.warn("KV rate limiting failed:", e);
      }
    }

    // Resolve content
    let content = text || "";
    let sourceType = "text";
    let sourceUrl = null;

    if (url) {
      sourceType = "url";
      sourceUrl = url;
      const fetched = await fetchUrlContent(url);
      content = fetched.text;
    }

    // Validate content length
    if (content.trim().length < 10) {
      return NextResponse.json(
        { error: "Text is too short. Please provide at least 10 characters." },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      content = content.substring(0, 50000);
    }

    // Generate content hash
    const contentHash = await sha256(content.trim().toLowerCase());

    // Check cache: same text already analyzed?
    if (bindings.DB) {
      try {
        const cached = await bindings.DB.prepare(
          "SELECT * FROM detections WHERE content_hash = ? ORDER BY created_at DESC LIMIT 1"
        ).bind(contentHash).first();

        if (cached) {
          return NextResponse.json({
            id: cached.id,
            cached: true,
            slopScore: cached.slop_score,
            l1Score: cached.l1_score,
            l3Score: cached.l3_score,
            roastedComment: cached.roasted_comment,
            highlights: JSON.parse(cached.highlights || "[]"),
            features: JSON.parse(cached.features || "{}"),
            grade: getGrade(cached.slop_score),
            sourceType: cached.source_type,
            textPreview: cached.text_preview,
          });
        }
      } catch (e) {
        console.warn("D1 cache lookup failed:", e);
      }
    }

    // Run detection pipeline
    const result = await runDetection(content, bindings.AI);

    // Generate ID
    const id = crypto.randomUUID();

    // Store in D1
    if (bindings.DB) {
      try {
        await bindings.DB.prepare(
          `INSERT INTO detections (id, content_hash, text_preview, slop_score, l1_score, l3_score, features, roasted_comment, highlights, source_type, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            contentHash,
            content.substring(0, 200),
            result.slopScore,
            result.l1.score,
            result.l3?.score || null,
            JSON.stringify({
              lexiconScore: result.l1.lexiconScore,
              burstinessScore: result.l1.burstinessScore,
              stdDev: result.l1.stdDev,
              hedgingScore: result.l3?.hedgingScore || null,
              structureScore: result.l3?.structureScore || null,
            }),
            result.roastedComment,
            JSON.stringify(result.highlights),
            sourceType,
            sourceUrl
          )
          .run();
      } catch (e) {
        console.warn("D1 insert failed:", e);
      }
    }

    return NextResponse.json({
      id,
      cached: false,
      slopScore: result.slopScore,
      grade: result.grade,
      isShortText: result.isShortText,
      wordCount: result.wordCount,
      l1Score: result.l1.score,
      l3Score: result.l3?.score || null,
      roastedComment: result.roastedComment,
      highlights: result.highlights,
      sentenceScores: result.sentenceScores,
      features: {
        lexiconScore: result.l1.lexiconScore,
        burstinessScore: result.l1.burstinessScore,
        patternScore: result.l1.patternScore,
        stdDev: result.l1.stdDev,
        hedgingScore: result.l3?.hedgingScore || null,
        structureScore: result.l3?.structureScore || null,
      },
      sourceType,
      content, // Full text for display (already capped at 50k in input validation)
    });
  } catch (error) {
    console.error("Detection failed:", error);
    return NextResponse.json(
      { error: error.message || "Detection failed. Please try again." },
      { status: 500 }
    );
  }
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getGradeFromScore(score) {
  if (score >= 80) return { label: "Pure Slop", emoji: "🗑️", level: "critical" };
  if (score >= 60) return { label: "Suspiciously Polished", emoji: "🤖", level: "high" };
  if (score >= 40) return { label: "On the Fence", emoji: "🤔", level: "medium" };
  if (score >= 20) return { label: "Mostly Human", emoji: "✍️", level: "low" };
  return { label: "Human Soul", emoji: "❤️", level: "safe" };
}
