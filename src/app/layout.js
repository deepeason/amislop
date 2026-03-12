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
              <span className="logo-icon">🔬</span>
              <span className="logo-text">AmISlop</span>
            </a>
            <nav className="nav-menu">
              <a href="#how-it-works" className="nav-link">How it Works</a>
              <a href="#faq" className="nav-link">FAQ</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
