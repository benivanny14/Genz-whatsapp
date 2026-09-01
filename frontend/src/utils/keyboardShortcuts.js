/**
 * keyboardShortcuts.js — Global keyboard shortcuts for desktop users.
 *
 * Ctrl/Cmd + K  → Open search
 * Ctrl/Cmd + N  → New chat
 * Escape        → Close active modal/dialog
 *
 * All shortcuts are disabled on mobile (no physical keyboard) and inside
 * input/textarea/contentEditable fields (to avoid hijacking typing).
 */

let searchOpener = null;
let newChatOpener = null;
let modalCloser = null;

/** Check if the event originated from a text input */
const isTextInput = (e) => {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (e.target?.isContentEditable) return true;
  return false;
};

/** Key handler */
const handleKeyDown = (e) => {
  // Escape always works — close modals regardless of text input
  if (e.key === 'Escape') {
    modalCloser?.();
    return;
  }

  // Skip shortcuts when typing in an input
  if (isTextInput(e)) return;

  const mod = e.ctrlKey || e.metaKey;

  // Ctrl/Cmd + K → Search
  if (mod && e.key === 'k') {
    e.preventDefault();
    searchOpener?.();
    return;
  }

  // Ctrl/Cmd + N → New chat
  if (mod && e.key === 'n') {
    e.preventDefault();
    newChatOpener?.();
    return;
  }
};

/**
 * Initialize global keyboard shortcuts.
 * Call once in App.jsx on mount.
 *
 * @param {Object} handlers
 * @param {Function} handlers.openSearch   — called on Ctrl+K
 * @param {Function} handlers.openNewChat  — called on Ctrl+N
 * @param {Function} handlers.closeModals  — called on Escape
 */
export const initKeyboardShortcuts = ({ openSearch, openNewChat, closeModals } = {}) => {
  searchOpener = openSearch || null;
  newChatOpener = openNewChat || null;
  modalCloser = closeModals || null;

  document.addEventListener('keydown', handleKeyDown);
};

/** Remove all shortcuts (cleanup) */
export const destroyKeyboardShortcuts = () => {
  document.removeEventListener('keydown', handleKeyDown);
  searchOpener = null;
  newChatOpener = null;
  modalCloser = null;
};
