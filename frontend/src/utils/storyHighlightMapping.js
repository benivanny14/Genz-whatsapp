/**
 * Pure helpers for story highlights — kept free of React/JSX so they can be
 * unit-tested under node --test.
 */

export const HIGHLIGHT_COLORS = [
  'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
  'linear-gradient(45deg,#1cb5e0,#000851)',
  'linear-gradient(45deg,#00b09b,#96c93d)',
  'linear-gradient(45deg,#f7971e,#ffd200)',
  'linear-gradient(45deg,#8e44ad,#3498db)',
  'linear-gradient(45deg,#e74c3c,#c0392b)',
];

/**
 * Map a StoryHighlight API document to the shape the UI consumes.
 * The API stores `name`/`coverUrl`; `title`/`coverImage` are accepted as
 * legacy fallbacks so old saved highlights still display.
 */
export function normalizeStoryHighlight(h, localStatuses = []) {
  return {
    id: h._id,
    name: h.name || h.title,
    color: HIGHLIGHT_COLORS[Number(h.category) || 0] || HIGHLIGHT_COLORS[0],
    coverUrl: h.coverUrl || h.coverImage || null,
    statusIds: h.statusIds || [],
    statuses: localStatuses,
    createdAt: h.createdAt,
  };
}