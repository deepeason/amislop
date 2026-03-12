export const metadata = {
  title: "Terms of Service | AmISlop",
  description: "Terms of Service for AmISlop - #1 AI Slop Detector",
};

export default function TermsPage() {
  return (
    <>
      <main className="main" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', textAlign: 'left' }}>
        <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '40px' }}>Terms of Service</h1>
        <div className="content-text" style={{ fontSize: '15px' }}>
          <p><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
          
          <h3 style={{ marginTop: '32px' }}>1. Acceptance of Terms</h3>
          <p>By accessing and using AmISlop (mislop.org), you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.</p>

          <h3 style={{ marginTop: '32px' }}>2. Description of Service</h3>
          <p>AmISlop provides an AI-powered text analysis tool designed to detect generic, repetitive, and low-quality AI-generated content (referred to as "slop"). Our service is provided "as is" and is intended for informational and editorial purposes.</p>

          <h3 style={{ marginTop: '32px' }}>3. User Conduct and Input Data</h3>
          <p>You agree not to use the service for any unlawful purpose. You are solely responsible for the text or URLs you submit for analysis. We do not claim ownership of any content you submit.</p>
          <p><strong>No AI Training:</strong> The content you submit is used strictly for real-time analysis. We do not use your input data to train our own or third-party AI models.</p>

          <h3 style={{ marginTop: '32px' }}>4. Intellectual Property</h3>
          <p>All original content, features, and functionality of AmISlop are and will remain the exclusive property of AmISlop and its licensors. The detection results provided by the service are for your personal or internal business use.</p>

          <h3 style={{ marginTop: '32px' }}>5. Limitation of Liability</h3>
          <p>AmISlop does not guarantee 100% accuracy in its AI detection. The tool serves as an indicator and should not be the sole basis for academic, professional, or legal decisions. In no event shall AmISlop be liable for any indirect, incidental, special, consequential or punitive damages arising out of your use of the service.</p>

          <h3 style={{ marginTop: '32px' }}>6. Changes to Terms</h3>
          <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes by updating the date at the top of this page. Your continued use of the service after such changes constitutes your acceptance of the new terms.</p>

          <h3 style={{ marginTop: '32px' }}>7. Contact Us</h3>
          <p>If you have any questions about these Terms, please contact us at support@mislop.org.</p>
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
