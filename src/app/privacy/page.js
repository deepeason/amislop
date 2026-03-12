export const metadata = {
  title: "Privacy Policy | AmISlop",
  description: "Privacy Policy for AmISlop - #1 AI Slop Detector",
};

export default function PrivacyPage() {
  return (
    <>
      <main className="main" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', textAlign: 'left' }}>
        <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '40px' }}>Privacy Policy</h1>
        <div className="content-text" style={{ fontSize: '15px' }}>
          <p><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
          
          <h3 style={{ marginTop: '32px' }}>1. Introduction</h3>
          <p>Welcome to AmISlop (mislop.org). We respect your privacy and are committed to protecting it. This Privacy Policy explains our practices regarding the collection, use, and disclosure of your information when you use our service.</p>

          <h3 style={{ marginTop: '32px' }}>2. Information We Collect</h3>
          <p><strong>Text Inputs and URLs:</strong> When you use our detector, you submit text or URLs for analysis. This data is processed in real-time to generate your slop score and analysis report.</p>
          <p><strong>Usage Data:</strong> We may automatically collect certain information about your device and how you interact with our service (e.g., IP addresses, browser types, and anonymous interaction metrics) to maintain and improve performance.</p>

          <h3 style={{ marginTop: '32px' }}>3. How We Use Your Information</h3>
          <p>We use the collected information solely for the following purposes:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '24px', color: 'var(--text-secondary)' }}>
            <li>To provide, maintain, and improve our core detection service.</li>
            <li>To monitor usage patterns and optimize our algorithms.</li>
            <li>To detect and prevent technical issues or abuse of the service.</li>
          </ul>

          <h3 style={{ marginTop: '32px' }}>4. Data Processing and Storage</h3>
          <p>AmISlop values your intellectual property. <strong>We do NOT use text submitted by users to train any AI models.</strong> Texts are processed ephemerally or cached temporarily solely to speed up repeated queries for the same content. Any cached analysis results are stored without tying them to your personal identity.</p>

          <h3 style={{ marginTop: '32px' }}>5. Third-Party Services</h3>
          <p>We use third-party APIs (such as advanced language models) to perform the deep linguistic analysis. When your text is sent to these partners for processing, it is sent securely and strictly for analysis purposes, subject to their zero-retention or privacy-compliant API policies.</p>

          <h3 style={{ marginTop: '32px' }}>6. Data Security</h3>
          <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.</p>

          <h3 style={{ marginTop: '32px' }}>7. Changes to this Privacy Policy</h3>
          <p>We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible.</p>

          <h3 style={{ marginTop: '32px' }}>8. Contact Us</h3>
          <p>If you have questions or comments about this notice, you may email us at support@mislop.org.</p>
        </div>
      </main>

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
                <li><a href="/#how-it-works">How it Works</a></li>
                <li><a href="/#creator-edge">Creator Guide</a></li>
                <li><a href="/#faq">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom" style={{ marginTop: '24px', paddingTop: '24px' }}>
            <p>&copy; {new Date().getFullYear()} mislop.org. Stop the <strong>ai slop</strong>.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
