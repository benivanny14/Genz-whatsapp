import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { escapeRegExp, getEntityId } from './chatTextHelpers';

// JSX render helpers extracted from ChatArea.jsx. The pure (JSX-free) helpers
// live in chatTextHelpers.js so the node test runner can import them.

const API_URL = resolveApiBase() || '/api';

export const renderTextWithMentions = (text = '', mentions = [], currentUserId = '') => {
  const names = [...new Set(
    (mentions || [])
      .map((mention) => mention.username || mention.displayName || mention.user?.username)
      .filter(Boolean)
  )].sort((a, b) => b.length - a.length);

  if (!text || !names.length) return text;

  const mentionByName = new Map(
    (mentions || []).map((mention) => [
      String(mention.username || mention.displayName || mention.user?.username || '').toLowerCase(),
      mention
    ])
  );
  const regex = new RegExp(`@(${names.map(escapeRegExp).join('|')})(?=$|\\s|[.,!?;:)\\]])`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const name = match[1];
    const mention = mentionByName.get(String(name).toLowerCase());
    const mentionedUserId = getEntityId(mention?.user || mention?.userId);
    const isCurrentUser = mentionedUserId && mentionedUserId === String(currentUserId);
    parts.push(
      <span
        key={`${match.index}-${name}`}
        className={`inline-flex rounded-md px-1 font-semibold ${isCurrentUser ? 'bg-amber-300/25 text-amber-100' : 'bg-primary-500/20 text-primary-100'
          }`}
        title={`@${name}`}
      >
        @{name}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

// ── Link Preview Card Component ──
export const LinkPreviewCard = ({ url }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    authFetch(`${API_URL}/advanced/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { if (data.success) setPreview(data.preview); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className="mt-2 border border-white/10 rounded-xl overflow-hidden animate-pulse bg-white/5 h-16" />
  );
  if (!preview) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 block border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-colors no-underline">
      {preview.image && (
        <img src={preview.image} alt="preview" className="w-full h-28 object-cover" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
      )}
      <div className="p-2">
        <p className="text-[10px] text-primary-400 font-bold uppercase truncate">{preview.domain}</p>
        <p className="text-xs font-semibold text-white truncate">{preview.title}</p>
        {preview.description && <p className="text-[10px] text-white/50 truncate mt-0.5">{preview.description}</p>}
      </div>
    </a>
  );
};
