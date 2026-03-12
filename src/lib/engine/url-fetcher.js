/**
 * URL Content Fetcher via Jina Reader
 * Fetches URL content as clean markdown/text
 */

const JINA_BASE = "https://r.jina.ai/";
const FETCH_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch URL content via Jina Reader
 * @param {string} url - URL to fetch
 * @returns {{ text: string, title: string }} Cleaned text content
 */
export async function fetchUrlContent(url) {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${JINA_BASE}${url}`, {
      headers: {
        Accept: "text/plain",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned ${response.status}`);
    }

    const text = await response.text();

    if (!text || text.trim().length < 10) {
      throw new Error("No meaningful content extracted from URL");
    }

    // Clean up markdown formatting to get plain text
    const cleaned = cleanMarkdown(text);

    // Detect anti-bot / security verification pages
    detectBlockedContent(cleaned);

    // Check minimum content after cleaning
    if (cleaned.length < 50) {
      throw new Error(
        "Could not extract meaningful content from this URL. The page may be behind a paywall or require login. Please paste the text directly."
      );
    }

    // Extract title (first line is usually the title in Jina output)
    const lines = cleaned.split("\n").filter((l) => l.trim());
    const title = lines[0]?.substring(0, 100) || "Untitled";

    return {
      text: cleaned,
      title,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("URL fetch timed out (10s). Please paste the text directly.");
    }
    throw new Error(`Failed to fetch URL: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strip markdown formatting and Jina Reader metadata to get clean article text
 */
function cleanMarkdown(md) {
  return md
    // Remove Jina Reader metadata lines
    .replace(/^Title:\s*.*$/gm, "")
    .replace(/^URL Source:\s*.*$/gm, "")
    .replace(/^Published Time:\s*.*$/gm, "")
    .replace(/^Markdown Content:\s*$/gm, "")
    .replace(/^Warning:.*$/gm, "")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    // Remove headers markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic
    .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`([^`]*)`/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^---+$/gm, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Detect anti-bot pages, security verifications, paywalls, etc.
 * Throws a user-friendly error if blocked content is detected.
 */
function detectBlockedContent(text) {
  const lower = text.toLowerCase();

  const BLOCKED_PATTERNS = [
    { pattern: "security verification", msg: "security verification" },
    { pattern: "performing security verification", msg: "security verification" },
    { pattern: "verify you are human", msg: "bot verification" },
    { pattern: "verifies you are not a bot", msg: "bot verification" },
    { pattern: "checking your browser", msg: "browser check" },
    { pattern: "enable javascript and cookies", msg: "JavaScript requirement" },
    { pattern: "access denied", msg: "access denied" },
    { pattern: "403 forbidden", msg: "access denied" },
    { pattern: "please complete the captcha", msg: "CAPTCHA" },
    { pattern: "captcha challenge", msg: "CAPTCHA" },
    { pattern: "just a moment", msg: "Cloudflare challenge" },
    { pattern: "ray id:", msg: "Cloudflare block" },
    { pattern: "you need to sign in", msg: "login required" },
    { pattern: "sign in to continue", msg: "login required" },
    { pattern: "this content is for subscribers", msg: "paywall" },
    { pattern: "subscribe to read", msg: "paywall" },
    { pattern: "member-only story", msg: "paywall" },
  ];

  for (const { pattern, msg } of BLOCKED_PATTERNS) {
    if (lower.includes(pattern)) {
      throw new Error(
        `Could not access this page (${msg}). The site may be blocking automated access. Please copy and paste the text directly.`
      );
    }
  }

  // Also check if the content is suspiciously short (likely a stub/error page)
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 20) {
    throw new Error(
      "The fetched content is too short — the page may require login or is blocking access. Please paste the text directly."
    );
  }
}
