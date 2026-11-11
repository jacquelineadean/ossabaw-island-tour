/** Sticky top bar. The runtime draws the chapter trail into .spanbar-track and handles the theme button. */
export function SpanBar() {
  return (
    <nav className="spanbar" aria-label="Chapters">
      <div className="spanbar-in">
        <a className="spanbar-title" href="#top">
          Ossabaw
        </a>
        <div className="spanbar-track" role="list" />
        <p className="spanbar-now" aria-live="polite" />
        <button type="button" className="theme-btn" aria-label="Switch light or dark theme" />
      </div>
    </nav>
  );
}
