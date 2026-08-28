/**
 * ChatListVirtual — High-performance virtualized chat list using react-window.
 *
 * Replaces the standard .map() loop in Sidebar with a FixedSizeList that
 * only renders visible rows (~10-15 at a time). For users with hundreds of
 * conversations this eliminates the DOM thrashing and memory pressure of
 * rendering every single chat item.
 *
 * Accepts the same props as the inline map (filteredConversations, handlers)
 * and delegates rendering to a ChatItemRow component per row.
 */
import React, { useCallback } from 'react';
import { FixedSizeList } from 'react-window';

const ROW_HEIGHT = 76; // px — matches the existing chat row height

/**
 * ChatItemRow — single row rendered by react-window.
 * style is injected by the virtual list for positioning; index = row index.
 */
const ChatItemRow = React.memo(function ChatItemRow({ index, style, data }) {
  const { conversations, renderChatItem } = data;
  const conversation = conversations[index];
  if (!conversation) return null;

  return (
    <div style={style}>
      {renderChatItem(conversation)}
    </div>
  );
});

/**
 * ChatListVirtual — drop-in replacement for the conversations .map() loop.
 *
 * @param {Array} conversations  – filtered & sorted conversation list
 * @param {Function} renderChatItem – function(conversation) => JSX element
 * @param {number} [height]      – container height (defaults to 100%)
 * @param {number} [rowHeight]   – height per row in px (default 76)
 */
export default function ChatListVirtual({
  conversations = [],
  renderChatItem,
  height,
  rowHeight = ROW_HEIGHT,
}) {
  const itemCount = conversations.length;

  // Memoise the data object passed to each row so react-window doesn't
  // re-render every row when the parent re-renders for unrelated state.
  const itemData = React.useMemo(
    () => ({ conversations, renderChatItem }),
    [conversations, renderChatItem]
  );

  const Row = useCallback(
    (props) => <ChatItemRow {...props} data={itemData} />,
    [itemData]
  );

  if (itemCount === 0) return null;

  return (
    <FixedSizeList
      height={height || '100%'}
      width="100%"
      itemCount={itemCount}
      itemSize={rowHeight}
      overscanCount={5}
      itemData={itemData}
      className="chat-list-virtual"
    >
      {Row}
    </FixedSizeList>
  );
}

export { ROW_HEIGHT };
