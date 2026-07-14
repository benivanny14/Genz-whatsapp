// utils/useViewportHeight.js
//
// FIX: "Black bar" appearing under the keyboard on mobile + layout jumping
// -------------------------------------------------------------------------
// Root cause: the app relied on plain CSS units (100vh / 100dvh) applied on
// two DIFFERENT nested elements (the outer app shell in pages/Chat.jsx and
// the inner ChatArea root). `position: fixed` elements are measured against
// the *layout* viewport, which many mobile browsers/WebViews do NOT shrink
// when the on-screen keyboard opens - while `100dvh` on the inner element
// DOES shrink. That mismatch is exactly what produced the black gap at the
// bottom and the keyboard being pushed further than it should.
//
// The fix is the standard, battle-tested approach: track the REAL visible
// height using the `visualViewport` API (falls back to window.innerHeight
// on older WebViews that don't support it) and publish it as a single CSS
// custom property `--app-height`. Every full-height container in the app
// should size itself with `height: var(--app-height)` instead of vh/dvh, so
// there is only one source of truth and it always matches what the user can
// actually see - keyboard included.
// FIX 2: header/input "bar" jumping off the top of the screen when the
// keyboard opens
// -------------------------------------------------------------------------
// Root cause: `--app-height` alone is not enough. On Android (and some iOS
// versions) opening the keyboard doesn't just shrink the visual viewport -
// it also *scrolls* it down relative to the layout viewport so the focused
// input stays visible (`visualViewport.offsetTop` becomes > 0). Elements
// positioned with `position: fixed` (like the outer app shell in
// pages/Chat.jsx, and small overlays like OfflineIndicator/InstallAppPrompt)
// are always anchored to the LAYOUT viewport, not the visual one. So while
// their height correctly shrinks, their top edge stays pinned to
// layout-viewport y=0 - which is now *above* the real visible area - making
// the header/top bar appear to slide up and off-screen.
//
// The fix: also publish the live `offsetTop` as `--app-offset-top` and have
// the fixed shell translate itself down by that amount so it always lines
// up with what the browser is actually showing.
export function initViewportHeightFix() {
  if (typeof window === 'undefined') return () => {};

  const setAppHeight = () => {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const offsetTop = vv ? vv.offsetTop : 0;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--app-offset-top', `${offsetTop}px`);
  };

  setAppHeight();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight);
  }
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', setAppHeight);

  return () => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', setAppHeight);
      window.visualViewport.removeEventListener('scroll', setAppHeight);
    }
    window.removeEventListener('resize', setAppHeight);
    window.removeEventListener('orientationchange', setAppHeight);
  };
}

export default initViewportHeightFix;
