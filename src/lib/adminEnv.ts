// The admin page is a local authoring tool, not a production feature. There is
// no backend/auth in this app, so access is gated purely by hostname: only
// localhost / 127.0.0.1 (the developer's own machine) may open it. A deployed
// build served from any other origin treats /admin as off-limits and the page
// redirects home.
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    // Vite sometimes binds the LAN address; treat the loopback-style 127.x as local.
    h.startsWith('127.')
  );
}
