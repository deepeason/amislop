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
                <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" /><path d="M9 14h2" /><path d="M9 12a2 2 0 1 0-4 0v6" /><path d="M12 7V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4" />
              </svg>
              <span className="logo-text">AmISlop</span>
            </a>
            <nav className="nav-menu">
              <a href="#how-it-works" className="nav-link">How it Works</a>
              <a href="#faq" className="nav-link">FAQ</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
