import "./globals.css";

export const metadata = {
  title: "Your AI Slop Bores Me | AI Slop Detector & Quality Checker",
  description:
    "Tired of soulless AI text? Or worried about your own content? AmISlop is the #1 AI slop website to detect boring, repetitive AI slop. Stop the bore and ensure quality.",
  openGraph: {
    title: "Your AI Slop Bores Me | The Original AI Slop Detector",
    description: "Detect AI-generated slop instantly. Stop being tired of AI waste.",
    siteName: "AmISlop",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-container">
            <a href="/" className="logo">
              <svg className="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span className="logo-text">AmISlop</span>
            </a>
            <nav className="nav-menu">
              <a href="/" className="nav-link">Home</a>
              <a href="/#how-it-works" className="nav-link">How it Works</a>
              <a href="/#faq" className="nav-link">FAQ</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
