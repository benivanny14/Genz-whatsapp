/**
 * ChatListSkeleton — shimmer/skeleton loading state for the chat list.
 *
 * Renders 8 animated placeholder rows that match the exact layout of a
 * real ChatItem row (avatar + two text lines + badge area). The
 * `animate-pulse` Tailwind utility creates the classic skeleton shimmer.
 *
 * Usage:
 *   {loading && <ChatListSkeleton count={8} />}
 */
import React from 'react';

const ChatListSkeletonRow = React.memo(function ChatListSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      {/* Avatar placeholder */}
      <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />

      {/* Text lines */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>

      {/* Badge / time placeholder */}
      <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
    </div>
  );
});

export default function ChatListSkeleton({ count = 8 }) {
  return (
    <div className="chat-list-skeleton" role="status" aria-label="Loading chats">
      <span className="sr-only">Loading chats…</span>
      {Array.from({ length: count }, (_, i) => (
        <ChatListSkeletonRow key={i} />
      ))}
    </div>
  );
}
