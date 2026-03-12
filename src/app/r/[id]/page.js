import { getCloudflareBindings } from "@/lib/cloudflare";
import { notFound } from "next/navigation";
import { getGrade } from "@/lib/engine/scoring";
import Link from "next/link";

export const runtime = "edge";

export async function generateMetadata({ params }) {
  const { id } = params;
  let bindings;
  try {
    bindings = await getCloudflareBindings();
  } catch (e) {
    return { title: 'AmISlop Result' };
  }
  if (!bindings?.DB) return { title: 'AmISlop Result' };
  
  const record = await bindings.DB.prepare("SELECT slop_score, roasted_comment FROM detections WHERE id = ?").bind(id).first();
  if (!record) return { title: 'Result Not Found | AmISlop' };
  
  const grade = getGrade(record.slop_score);
  return {
    title: `I scored ${record.slop_score}/100 - ${grade.label} 🤖 | AmISlop`,
    description: `AmISlop said: "${record.roasted_comment}"`,
    openGraph: {
      title: `I scored ${record.slop_score}/100 - ${grade.label}`,
      description: `"${record.roasted_comment}"`,
    },
    twitter: {
      card: "summary_large_image",
      title: `I scored ${record.slop_score}/100 - ${grade.label}`,
      description: `"${record.roasted_comment}"`,
    }
  };
}

export default async function ResultPage({ params }) {
  const { id } = params;
  let bindings;
  try {
    bindings = await getCloudflareBindings();
  } catch (e) {
    console.error("Bindings error", e);
  }

  if (!bindings?.DB) {
    return (
      <main className="main-container">
        <div className="container">
          <h2>Database not configured</h2>
        </div>
      </main>
    );
  }

  const record = await bindings.DB.prepare(
    "SELECT * FROM detections WHERE id = ?"
  ).bind(id).first();

  if (!record) {
    notFound();
  }

  const result = {
    slopScore: record.slop_score,
    roastedComment: record.roasted_comment,
    grade: getGrade(record.slop_score),
    highlights: JSON.parse(record.highlights || "[]"),
    features: JSON.parse(record.features || "{}"),
    textPreview: record.text_preview
  };

  return (
    <main className="main-container">
      <div className="header">
        <h1>AmISlop? 🤔</h1>
        <p>AI or Human? Let the machine decide.</p>
      </div>
      
      <div className="container active" style={{ maxWidth: "600px", margin: "0 auto", padding: "0" }}>
        <div className="results-panel" style={{ width: '100%', height: 'auto', borderLeft: 'none', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
          <div className="score-card">
            <div className="score-emoji">{result.grade.emoji}</div>
            <div className={`score-circle ${result.grade.level}`}>
              <svg viewBox="0 0 100 100">
                <circle className="bg" cx="50" cy="50" r="45" />
                <circle
                  className="progress"
                  cx="50"
                  cy="50"
                  r="45"
                  strokeDasharray={`${result.slopScore * 2.827} 282.7`}
                />
              </svg>
              <div className="score-text">
                <span className="number">{result.slopScore}</span>
                <span className="label">/100</span>
              </div>
            </div>
            
            <h2 className={`grade-title ${result.grade.level}`}>
              {result.grade.label}
            </h2>
            
            <div className="roast-box">
              <p>"{result.roastedComment}"</p>
            </div>
          </div>

          <div className="details-card">
            <h3>Analysis Features</h3>
            <div className="feature-grid">
              <div className="feature-item">
                <span className="f-label">Vocabulary</span>
                <span className="f-value">{result.features.lexiconScore || "?"}</span>
              </div>
              <div className="feature-item">
                <span className="f-label">Rhythm</span>
                <span className="f-value">{result.features.burstinessScore || "?"}</span>
              </div>
              {result.features.hedgingScore !== null && (
                <div className="feature-item">
                  <span className="f-label">Hedging (L3)</span>
                  <span className="f-value">{result.features.hedgingScore}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="details-card">
            <h3>Text Snippet</h3>
            <div className="text-snippet" style={{ color: '#aaa', fontStyle: 'italic', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
              {result.textPreview}...
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: '24px' }}>
            <details className="disclaimer-details" style={{ marginBottom: '16px' }}>
              <summary className="disclaimer-summary" style={{ textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', listStyle: 'none' }}>
                <span className="summary-icon">▲</span>
                Guidance for users and reviewers
              </summary>
              <div className="disclaimer-content" style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', textAlign: 'left' }}>
                The nature of AI content is changing constantly and our detection is not always 100% accurate. 
                These results are for informational purposes only and should not be used as definitive proof. 
                We recommend using human judgment for a holistic assessment.
              </div>
            </details>
            <Link href="/" className="back-btn" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%' }}>
              ← Try Your Own Text
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
