"use client";

import { useState, useRef, useCallback } from "react";

// Loading step definitions
const LOADING_STEPS = [
  { icon: "🔍", text: "Scanning for slop vocabulary..." },
  { icon: "📊", text: "Calculating burstiness patterns..." },
  { icon: "🧠", text: "AI semantic analysis in progress..." },
  { icon: "⚡", text: "Computing final slop score..." },
];

const LOADING_STEPS_SHORT = [
  { icon: "🔍", text: "Scanning for slop vocabulary..." },
  { icon: "📊", text: "Calculating burstiness patterns..." },
  { icon: "⚡", text: "Computing final slop score..." },
];

export default function Home() {
  const [mode, setMode] = useState("text"); // 'text' | 'url'
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingSteps, setLoadingSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(-1);
  const [sharing, setSharing] = useState(false);
  const [vote, setVote] = useState(null);

  const textareaRef = useRef(null);
  const resultsRef = useRef(null);

  const getScoreColor = useCallback((score) => {
    if (score >= 80) return "var(--score-critical)";
    if (score >= 60) return "var(--score-high)";
    if (score >= 40) return "var(--score-medium)";
    if (score >= 20) return "var(--score-low)";
    return "var(--score-safe)";
  }, []);

  // Simulate loading steps for visual feedback
  const simulateLoadingSteps = useCallback((isShort) => {
    const steps = isShort ? LOADING_STEPS_SHORT : LOADING_STEPS;
    setLoadingSteps(steps);

    steps.forEach((_, idx) => {
      setTimeout(() => {
        setActiveStep(idx);
      }, idx * 800);
    });
  }, []);

  const handleSubmit = async () => {
    const value = mode === "text" ? inputText.trim() : inputUrl.trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(-1);

    // Estimate if short text for loading animation
    const isShort = mode === "text" && value.split(/\s+/).length < 50;
    simulateLoadingSteps(isShort);

    try {
      const body =
        mode === "text" ? { text: value } : { url: value };

      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("🚨 Rate Limit: " + (data.error || "Daily limit exceeded."));
        }
        throw new Error(data.error || "Detection failed");
      }

      // Small delay to let final loading animation complete
      await new Promise((r) => setTimeout(r, 500));

      setResult({
        ...data,
        originalText: mode === "text" ? value : (data.content || data.textPreview || ""),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setActiveStep(-1);
      setLoadingSteps([]);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setInputText("");
    setInputUrl("");
    setMode("text");
    setSharing(false);
    setVote(null);
  };

  const handleShare = async () => {
    if (!result?.id || sharing) return;
    setSharing(true);
    try {
      const shareUrl = `${window.location.origin}/r/${result.id}`;
      const title = `Score: ${result.slopScore}/100 - ${result.grade?.label} 🤖`;
      const text = `AmISlop said: "${result.roastedComment}"`;
      
      // Try native share first
      if (navigator.canShare && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        alert("Link and result copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share:", err);
    } finally {
      // Just temporarily keep button in generating state to let user see feedback
      setTimeout(() => setSharing(false), 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  // Build highlighted text from result
  const renderHighlightedText = () => {
    if (!result) return null;

    const text = result.originalText || result.content || result.textPreview || "";
    const highlights = result.highlights || [];
    const sentenceScores = result.sentenceScores || [];

    if (highlights.length === 0 && sentenceScores.length === 0) {
      return <div className="text-content">{text}</div>;
    }

    // Combine word highlights and sentence highlights
    // We'll map characters to avoid overlap logic complexity for now
    // But since words are inside sentences, we can render sentence spans that contain word spans.
    // However, the easiest way to render nested spans safely is to sort all boundaries.
    
    // Create an array of text segments
    const parts = [];
    let lastEnd = 0;

    for (const h of highlights) {
      // Safety: skip if positions are invalid
      if (h.start < lastEnd || h.start >= text.length) continue;

      // Text before highlight
      if (h.start > lastEnd) {
        pushSegment(parts, text, lastEnd, h.start, sentenceScores);
      }

      // Highlighted segment
      const actualEnd = Math.min(h.end, text.length);
      const segmentText = text.substring(h.start, actualEnd);
      
      // wrap the highlighted word, but we also want to apply the sentence background if applicable
      const sentence = sentenceScores.find(s => h.start >= s.start && h.start < s.end);
      const bgClass = sentence && sentence.level !== 'low' ? `sentence-bg-${sentence.level}` : '';

      parts.push(
        <span key={`h-${h.start}`} className={bgClass}>
          <span
            className={`slop-highlight ${h.type === "slop_phrase" ? "phrase" : ""}`}
          >
            {segmentText}
            <span className="tooltip">
              {h.type === "slop_phrase" ? "🚨 AI Phrase" : "⚠️ Slop Word"}
            </span>
          </span>
        </span>
      );

      lastEnd = actualEnd;
    }

    // Remaining text
    if (lastEnd < text.length) {
      pushSegment(parts, text, lastEnd, text.length, sentenceScores);
    }

    return <div className="text-content">{parts}</div>;
  };

  // Helper to push text segments and wrap them in sentence backgrounds
  const pushSegment = (parts, text, start, end, sentenceScores) => {
    let current = start;
    while (current < end) {
      // Find which sentence this chunk belongs to
      const sentence = sentenceScores.find(s => current >= s.start && current < s.end);
      
      if (sentence) {
        const chunkEnd = Math.min(end, sentence.end);
        const bgClass = sentence.level !== 'low' ? `sentence-bg-${sentence.level}` : '';
        const chunkText = text.substring(current, chunkEnd);
        
        parts.push(
          <span key={`t-${current}`} className={bgClass} title={sentence.flags?.join(", ")}>
            {chunkText}
          </span>
        );
        current = chunkEnd;
      } else {
        // Find next sentence start
        const nextSentence = sentenceScores.find(s => s.start > current);
        const chunkEnd = nextSentence ? Math.min(end, nextSentence.start) : end;
        parts.push(
          <span key={`t-${current}`}>
            {text.substring(current, chunkEnd)}
          </span>
        );
        current = chunkEnd;
      }
    }
  };

  // Score circle (SVG gauge)
  const renderScoreGauge = () => {
    if (!result) return null;

    const { slopScore } = result;
    const color = getScoreColor(slopScore);
    const circumference = 2 * Math.PI * 65; // r=65
    const offset = circumference - (slopScore / 100) * circumference;

    return (
      <div className="score-gauge">
        <svg className="score-circle" viewBox="0 0 140 140">
          <circle
            className="score-circle-bg"
            cx="70"
            cy="70"
            r="65"
          />
          <circle
            className="score-circle-fill"
            cx="70"
            cy="70"
            r="65"
            style={{
              stroke: color,
              strokeDashoffset: offset,
              strokeDasharray: circumference,
            }}
          />
        </svg>
        <div
          className="score-number"
          style={{ color }}
        >
          {slopScore}
        </div>
      </div>
    );
  };

  const renderDetailBar = (value, color) => (
    <div className="detail-bar">
      <div
        className="detail-bar-fill"
        style={{
          width: `${value}%`,
          background: color || "var(--accent-purple)",
        }}
      />
    </div>
  );

  // ========== RENDER ==========

  // If we have results, show the results view
  if (result) {
    const highlightCount = result.highlights?.length || 0;

    return (
      <main className="main">
        <div className="results-section">
          {/* Left panel - Text with highlights */}
          <div className="text-panel">
            <div className="text-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="text-panel-title">Analyzed Text</span>
                {inputUrl && mode === 'url' && (
                  <a href={inputUrl} target="_blank" rel="noopener noreferrer" className="source-link" title={inputUrl}>
                    🔗 Source Link
                  </a>
                )}
              </div>
              {highlightCount > 0 && (
                <span className="highlight-count">
                  {highlightCount} slop marker{highlightCount > 1 ? "s" : ""} found
                </span>
              )}
            </div>
            {renderHighlightedText()}
            <details className="disclaimer-details">
              <summary className="disclaimer-summary">
                <span className="summary-icon">▲</span>
                Guidance for users and reviewers
              </summary>
              <div className="disclaimer-content">
                The nature of AI content is changing constantly and our detection is not always 100% accurate. 
                These results are for informational purposes only and should not be used as definitive proof. 
                We recommend using human judgment for a holistic assessment.
              </div>
            </details>
          </div>

          {/* Right panel - Results */}
          <div className="results-panel" ref={resultsRef}>
            {/* Score */}
            <div className="score-card" style={{ position: "relative" }}>
              <button 
                className="mini-share-btn"
                onClick={handleShare}
                disabled={sharing}
                title="Share Result"
              >
                🔗 {sharing ? "..." : "Share"}
              </button>
              <div className="score-emoji">{result.grade?.emoji}</div>
              {renderScoreGauge()}
              <div
                className="score-label"
                style={{ color: getScoreColor(result.slopScore) }}
              >
                {result.grade?.label}
              </div>
            </div>

            {/* Roast */}
            {result.roastedComment && (
              <div className="roast-card">
                <p className="roast-quote">"{result.roastedComment}"</p>
              </div>
            )}

            {/* Score breakdown */}
            <div className="details-card">
              <div className="details-title">Score Breakdown</div>

              <div className="detail-row">
                <span className="detail-label">L1 Linguistic Variance</span>
                <span
                  className="detail-value"
                  style={{ color: getScoreColor(result.l1Score) }}
                >
                  {result.l1Score ?? "—"}
                </span>
              </div>
              {result.l1Score != null && renderDetailBar(result.l1Score, getScoreColor(result.l1Score))}

              {result.l3Score != null && (
                <>
                  <div className="detail-row" style={{ marginTop: 8 }}>
                    <span className="detail-label">L3 Perceptual Depth</span>
                    <span
                      className="detail-value"
                      style={{ color: getScoreColor(result.l3Score) }}
                    >
                      {result.l3Score}
                    </span>
                  </div>
                  {renderDetailBar(result.l3Score, getScoreColor(result.l3Score))}
                </>
              )}

              {result.features && (
                <>
                  <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    <div className="detail-row">
                      <span className="detail-label">Vocab Richness</span>
                      <span className="detail-value">
                        {result.features.lexiconScore ?? "—"}
                      </span>
                    </div>
                    {result.features.patternScore != null && (
                      <div className="detail-row">
                        <span className="detail-label">Stylistic Entropy</span>
                        <span className="detail-value">
                          {result.features.patternScore}
                        </span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Structural Rhythm</span>
                      <span className="detail-value">
                        {result.features.burstinessScore ?? "—"}
                      </span>
                    </div>
                    {result.features.hedgingScore != null && (
                      <div className="detail-row">
                        <span className="detail-label">Contextual Nuance</span>
                        <span className="detail-value">
                          {result.features.hedgingScore}/10
                        </span>
                      </div>
                    )}
                    {result.features.structureScore != null && (
                      <div className="detail-row">
                        <span className="detail-label">Logical Cohesion</span>
                        <span className="detail-value">
                          {result.features.structureScore}/10
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="detail-row" style={{ marginTop: 12 }}>
                <span className="detail-label">Word Count</span>
                <span className="detail-value">{result.wordCount ?? "—"}</span>
              </div>



              {result.cached && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  📦 Cached result
                </div>
              )}
            </div>

            <div className="vote-section">
              <span className="vote-label">Give feedback</span>
              <div className="vote-buttons">
                <button 
                  className={`vote-btn upvote ${vote === 'up' ? 'active' : ''}`}
                  onClick={() => setVote(vote === 'up' ? null : 'up')}
                  title="Accurate"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                </button>
                <button 
                  className={`vote-btn downvote ${vote === 'down' ? 'active' : ''}`}
                  onClick={() => setVote(vote === 'down' ? null : 'down')}
                  title="Bullshit"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
                </button>
              </div>
            </div>

            <div className="action-buttons no-export">
              <button className="back-btn" onClick={handleReset} style={{ width: '100%' }}>
                ← Analyze Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ========== INPUT VIEW ==========
  return (
    <main className="main">
      <div className="input-section">
        <div className="hero-tag">Your AI Slop Bores Me.</div>
        <h1 className="hero-title">
          The #1 AI Slop Detector
        </h1>
        <p className="hero-subtitle">
          The original tool to detect and reduce the spread of boring <strong>ai slop</strong>. 
          Analyze content to ensure it captures attention and doesn't bore users.
        </p>

        {/* Mode tabs */}
        <div className="input-tabs">
          <button
            className={`input-tab ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            📝 Paste Text
          </button>
          <button
            className={`input-tab ${mode === "url" ? "active" : ""}`}
            onClick={() => setMode("url")}
          >
            🔗 Enter URL
          </button>
        </div>

        {/* Input area */}
        {mode === "text" ? (
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="text-input"
              placeholder="Paste your text here... (Ctrl+Enter to submit)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <span className="char-count">
              {inputText.length.toLocaleString()} chars
            </span>
          </div>
        ) : (
          <input
            type="url"
            className="url-input"
            placeholder="https://example.com/blog-post"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        )}

        {/* Submit */}
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={
            loading ||
            (mode === "text" ? !inputText.trim() : !inputUrl.trim())
          }
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            "Detect Slop"
          )}
        </button>

        {/* Error */}
        {error && <div className="error-msg">{error}</div>}

        {/* Loading progress (shown below button) */}
        {loading && loadingSteps.length > 0 && (
          <div className="loading-panel" style={{ marginTop: 24, textAlign: "left" }}>
            {loadingSteps.map((step, idx) => (
              <div
                key={idx}
                className={`loading-step ${
                  idx < activeStep
                    ? "done"
                    : idx === activeStep
                    ? "active"
                    : ""
                }`}
                style={{
                  animationDelay: `${idx * 0.8}s`,
                  opacity: idx <= activeStep ? 1 : 0.3,
                }}
              >
                <span className="icon">
                  {idx < activeStep ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {step.icon === "🔍" && <circle cx="11" cy="11" r="8"></circle>}
                      {step.icon === "🔍" && <line x1="21" y1="21" x2="16.65" y2="16.65"></line>}
                      {step.icon === "📊" && <line x1="18" y1="20" x2="18" y2="10"></line>}
                      {step.icon === "📊" && <line x1="12" y1="20" x2="12" y2="4"></line>}
                      {step.icon === "📊" && <line x1="6" y1="20" x2="6" y2="14"></line>}
                      {step.icon === "🧠" && <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.73-2.73 2.5 2.5 0 0 1-4.75-4.21 2.5 2.5 0 0 1 0-2.01 2.5 2.5 0 0 1 4.75-4.21 2.5 2.5 0 0 1 2.73-2.73A2.5 2.5 0 0 1 9.5 2Z"></path>}
                      {step.icon === "🧠" && <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.73-2.73 2.5 2.5 0 0 0 4.75-4.21 2.5 2.5 0 0 0 0-2.01 2.5 2.5 0 0 0-4.75-4.21 2.5 2.5 0 0 0-2.73-2.73A2.5 2.5 0 0 0 14.5 2Z"></path>}
                      {step.icon === "⚡" && <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>}
                    </svg>
                  )}
                </span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEO Content Sections */}
      <div className="container">
        <section className="section">
          <h2 className="section-title">The Internet is Drowning in AI Slop</h2>
          <p className="section-subtitle">Generic metaphors and mechanical repetition.</p>
          <div className="content-grid">
            <div className="content-text">
              <p>
                When every blog post starts with "In the rapidly evolving landscape" and ends 
                with "In conclusion," readers disengage immediately. This is <strong>ai slop</strong>, 
                and it's destroying digital trust.
              </p>
              <p>
                Our tool identifies these typical high-frequency AI patterns, helping you filter out 
                the noise and ensure your content actually captures attention.
              </p>
            </div>
            <div className="content-visual" style={{ minHeight: '360px', overflow: 'hidden' }}>
              <svg width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Background Glow */}
                <circle cx="160" cy="160" r="100" fill="url(#slop-glow)" opacity="0.05" />
                <defs>
                  <radialGradient id="slop-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" transform="translate(160 160) rotate(90) scale(120)">
                    <stop stopColor="var(--accent-purple)" />
                    <stop offset="1" stopColor="transparent" />
                  </radialGradient>
                </defs>

                {/* Robot at Zenith */}
                <g className="robot-zenith" transform="translate(140, 30)">
                  <circle cx="20" cy="20" r="25" stroke="var(--accent-cyan)" strokeOpacity="0.2" fill="var(--bg-secondary)" />
                  <rect x="0" y="8" width="40" height="30" rx="4" stroke="var(--accent-cyan)" strokeWidth="1.5" fill="var(--bg-secondary)" />
                  <path d="M10 0v8M30 0v8" stroke="var(--accent-cyan)" strokeOpacity="0.5" />
                  <circle cx="12" cy="20" r="1.5" fill="var(--accent-cyan)" />
                  <circle cx="28" cy="20" r="1.5" fill="var(--accent-cyan)" />
                </g>

                {/* Dense Slop Mountain */}
                <g className="slop-mountain" transform="translate(20, 80)">
                  {/* Scatter tiny background bubbles */}
                  {[...Array(20)].map((_, i) => (
                    <rect key={`bg-${i}`} x={Math.random() * 260} y={Math.random() * 180 + 50} width={Math.random() * 40 + 10} height="12" rx="3" strokeOpacity="0.05" />
                  ))}
                  
                  {/* Layered Foreground Piles */}
                  {[...Array(15)].map((_, i) => (
                    <rect key={`fg-${i}`} x={60 + (i % 5) * 35 - i * 4} y={180 - Math.floor(i / 5) * 25} width={70 - i} height="20" rx="4" stroke={i % 3 === 0 ? "var(--accent-purple)" : "currentColor"} strokeOpacity={0.15 + (i * 0.02)} />
                  ))}
                  
                  {/* Prominent High-Frequency patterns */}
                  <g stroke="var(--accent-purple)" strokeOpacity="0.5">
                    <rect x="100" y="100" width="80" height="22" rx="4" fill="var(--bg-secondary)" />
                    <rect x="60" y="135" width="90" height="22" rx="4" fill="var(--bg-secondary)" />
                    <rect x="155" y="145" width="100" height="22" rx="4" fill="var(--bg-secondary)" />
                  </g>
                </g>
              </svg>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '500' }}>High-Frequency Pattern Scan</div>
            </div>
          </div>
        </section>

        {/* Section 2: Am I Making AI Slop? */}
        <section className="section" id="creator-edge">
          <h2 className="section-title">Am I Making AI Slop?</h2>
          <p className="section-subtitle">
            Protect your brand's unique human voice.
          </p>
          <div className="content-grid">
            <div className="content-visual" style={{ minHeight: '360px' }}>
              <svg width="340" height="240" viewBox="0 0 340 240" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Browser/Window Frame */}
                <rect x="10" y="10" width="320" height="220" rx="8" strokeOpacity="0.1" fill="var(--bg-primary)" fillOpacity="0.2" />
                <path d="M10 40h320" strokeOpacity="0.1" />
                <circle cx="26" cy="25" r="3" fillOpacity="0.2" fill="currentColor" />
                <circle cx="40" cy="25" r="3" fillOpacity="0.2" fill="currentColor" />
                
                {/* Sidebar Split */}
                <path d="M220 40v190" strokeOpacity="0.1" strokeDasharray="4 2" />
                
                {/* High Density Analysis Content */}
                <g className="dense-analysis" transform="translate(30, 60)">
                  {[...Array(8)].map((_, i) => (
                    <g key={`line-${i}`} transform={`translate(0, ${i * 20})`}>
                      <path d={`M0 0h${160 - Math.random() * 40}`} strokeOpacity="0.08" strokeWidth="1.5" />
                      {i % 2 === 0 && (
                        <rect x={20 + i * 5} y="-5" width={30 + i * 2} height="10" rx="2" fill={i % 4 === 0 ? "var(--accent-purple)" : "var(--accent-cyan)"} fillOpacity="0.25" stroke="none" />
                      )}
                      {i % 3 === 0 && (
                        <rect x={100 - i * 3} y="-5" width="40" height="10" rx="2" fill="var(--accent-purple)" fillOpacity="0.1" stroke="none" />
                      )}
                    </g>
                  ))}
                </g>

                {/* Sidebar Metrics */}
                <g className="sidebar-metrics" transform="translate(240, 60)">
                  {/* Gauge */}
                  <circle cx="40" cy="30" r="32" strokeOpacity="0.05" />
                  <path d="M40 62a32 32 0 1 1 0-64" stroke="var(--accent-purple)" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8" />
                  <text x="40" y="38" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="bold" stroke="none">49</text>
                  
                  {/* Multiple Indicators */}
                  <g transform="translate(0, 85)">
                    {[...Array(5)].map((_, i) => (
                      <g key={`bar-${i}`} transform={`translate(0, ${i * 18})`}>
                        <rect x="0" y="0" width="80" height="4" rx="2" strokeOpacity="0.05" />
                        <rect x="0" y="0" width={20 + Math.random() * 50} height="4" rx="2" fill={i % 2 === 0 ? "var(--accent-cyan)" : "var(--accent-purple)"} fillOpacity="0.4" stroke="none" />
                      </g>
                    ))}
                  </g>
                  
                  {/* Share/Actions Hint */}
                  <rect x="0" y="165" width="80" height="16" rx="4" strokeOpacity="0.1" />
                  <path d="M15 173h50" strokeOpacity="0.05" />
                </g>
              </svg>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '500' }}>Contextual Expression Depth</div>
            </div>
            <div className="content-text">
              <p>
                As a creator, the last thing you want is for your audience to think <strong>your 
                ai slop bores me website</strong>. Even with AI assistance, your unique voice should shine through. 
              </p>
              <p>
                We analyze rhythmic patterns and expression depth to ensure your work remains 
                dominant, engaging, and worthy of your readers' time.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <h2 className="section-title">How It Works</h2>
          <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="faq-item">
              <span className="faq-question">AI Buzzword Detection</span>
              <p className="faq-answer">Identifies common AI "prompts," rigid transition phrases, and typical clichés used by LLMs.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">Tone & Rhythm Analysis</span>
              <p className="faq-answer">Analyzes if the text is too mechanical and flat, capturing the lack of human-specific tonal shifts or varied rhythm.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">Authenticity Scoring</span>
              <p className="faq-answer">Evaluates the "vitality" of the content, distinguishing between sincere expression and meaningless filler.</p>
            </div>
          </div>
        </section>

        {/* Section 4: FAQ */}
        <section className="section" id="faq">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <span className="faq-question">Why does everyone say "your ai slop bores me"?</span>
              <p className="faq-answer">It's a viral reaction to the massive influx of generic, low-effort AI content on social media. People are tired of reading the same "robotic" advice and are craving authentic human connection.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">What exactly qualifies as ai slop?</span>
              <p className="faq-answer"><strong>AI slop</strong> is content generated by AI that is redundant, uninformative, or generic. It adds noise to the internet without providing true value or a unique perspective.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">How is AI slop different from regular AI content?</span>
              <p className="faq-answer">Regular AI content can be genuinely useful—code, summaries, translations. AI slop specifically refers to content that's not only AI-generated but also adds zero value, has no personality, and was clearly made just to fill space.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">How can I avoid making ai slop?</span>
              <p className="faq-answer">The best way is to use our <strong>ai slop detector</strong> to scan your drafts. Look for high "hedging" scores or repetitive sentence structures and replace them with personal anecdotes or specific data.</p>
            </div>
            <div className="faq-item">
              <span className="faq-question">How can I avoid watching AI slop?</span>
              <p className="faq-answer">Curate your feed by following human creators with distinct voices. Use platform filters to block keywords like "AI-generated" and, most importantly, stop rewarding engagement-bait filler with your time and clicks.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" className="logo">
                <svg className="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span className="logo-text">AmISlop</span>
              </a>
              <p>The original tool to stop the spread of boring <strong>ai slop</strong>. Built for humans who hate being bored.</p>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#how-it-works">How it Works</a></li>
                <li><a href="#creator-edge">Creator Guide</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom" style={{ marginTop: '24px', paddingTop: '24px' }}>
            <p>&copy; {new Date().getFullYear()} AmISlop.io. Stop the <strong>ai slop</strong>.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
