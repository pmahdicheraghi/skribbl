/**
 * iOS Safari keyboard fix (same approach as Telegram Web A).
 *
 * On Android, `interactive-widget=resizes-content` (index.html) shrinks the
 * viewport when the on-screen keyboard opens, and the CSS reflows the game
 * screen above it on its own. iOS Safari ignores that setting: the keyboard
 * just covers the page, and Safari pans the view to reveal the focused input.
 *
 * So on iOS we publish what's actually visible, and the CSS does the rest:
 *   --app-height  visible height (shrinks while the keyboard is open)
 *   --app-top     how far Safari panned the view (keeps the screen in sight)
 */
export function installIosViewportFix() {
  const vv = window.visualViewport;
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (!isIOS || !vv) return;

  const root = document.documentElement;
  const update = () => {
    // Pinch-zoom also shrinks the visual viewport; don't resize the app for it.
    if (vv.scale > 1.01) return;
    root.style.setProperty('--app-height', `${Math.round(vv.height)}px`);
    root.style.setProperty('--app-top', `${Math.round(vv.offsetTop)}px`);
  };

  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}
