/**
 * WhatsApp-style text formatting.
 *
 * Parses the standard WhatsApp markers in message text:
 *   *bold*        → <strong>
 *   _italic_      → <em>
 *   ~strikethrough~ → <s>
 *   `monospace`   → <code>
 *
 * Returns an array of tokens: { type, content } where type is one of
 * 'text' | 'bold' | 'italic' | 'strike' | 'mono'. Nested markers are not
 * supported (matching WhatsApp's single-level behavior).
 */
export const formatTextTokens = (text) => {
  if (typeof text !== 'string' || !text) return [{ type: 'text', content: text || '' }];

  const tokens = [];
  // Underscores only italicize at word boundaries (like WhatsApp): `_gc_` inside
  // a username like `e2e_gc_1786` must NOT become italic, or @mentions break.
  const re = /(\*[^*\n]+\*|(?<![A-Za-z0-9_])_[^_\n]+_(?![A-Za-z0-9_])|~[^~\n]+~|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    const marker = match[0];
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const inner = marker.slice(1, -1);
    let type = 'text';
    if (marker.startsWith('*') && marker.endsWith('*')) type = 'bold';
    else if (marker.startsWith('_') && marker.endsWith('_')) type = 'italic';
    else if (marker.startsWith('~') && marker.endsWith('~')) type = 'strike';
    else if (marker.startsWith('`') && marker.endsWith('`')) type = 'mono';
    tokens.push({ type, content: inner });
    lastIndex = match.index + marker.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return tokens;
};

/** Wrap a text selection with a WhatsApp marker, preserving the selection. */
export const wrapWithMarker = (text, selectionStart, selectionEnd, marker) => {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  // If the selected text is already wrapped with the same marker, unwrap it.
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
    return {
      value: `${before}${selected.slice(marker.length, -marker.length)}${after}`,
      cursorStart: selectionStart,
      cursorEnd: selectionEnd - marker.length * 2
    };
  }
  const wrapped = `${marker}${selected || 'text'}${marker}`;
  const cursorStart = selectionStart + marker.length;
  const cursorEnd = cursorStart + (selected || 'text').length;
  return {
    value: `${before}${wrapped}${after}`,
    cursorStart,
    cursorEnd
  };
};
