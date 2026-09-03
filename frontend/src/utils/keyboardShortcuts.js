/**
 * keyboardShortcuts.js — Global keyboard shortcuts for desktop/web users.
 *
 * Installed once in App.jsx. Silently ignores shortcuts when the user is
 * typing in an input/textarea (to avoid hijacking normal typing).
 *
 * Shortcuts:
 *   Ctrl/Cmd + K  → Open search
 *   Ctrl/Cmd + N  → New chat
 *   Ctrl/Cmd + ,  → Settings
 *   Escape        → Close active modal
 *   Ctrl/Cmd + /  → Help
 */

/**
 * Initialize keyboard shortcuts.
 * @param {Object} callbacks
 * @param {() => void} [callbacks.onSearch]
 * @param {() => void} [callbacks.onNewChat]
 * @param {() => void} [callbacks.onSettings]
 * @param {() => void} [callbacks.onCloseModal]
 * @param {() => void} [callbacks.onHelp]
 * @returns {() => void} cleanup function
 */
export const initKeyboardShortcuts = (callbacks = {}) => {
  const handleKeyDown = (e) => {
    // Ignore if user is typing in an input/textarea
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
      return;
    }

    const mod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + K = Search
    if (mod && e.key === 'k') {
      e.preventDefault();
      callbacks.onSearch?.();
      return;
    }

    // Ctrl/Cmd + N = New chat
    if (mod && e.key === 'n') {
      e.preventDefault();
      callbacks.onNewChat?.();
      return;
    }

    // Ctrl/Cmd + , = Settings
    if (mod && e.key === ',') {
      e.preventDefault();
      callbacks.onSettings?.();
      return;
    }

    // Escape = Close modal
    if (e.key === 'Escape') {
      callbacks.onCloseModal?.();
      return;
    }

    // Ctrl/Cmd + / = Help
    if (mod && e.key === '/') {
      e.preventDefault();
      callbacks.onHelp?.();
      return;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
};

export default initKeyboardShortcuts;
