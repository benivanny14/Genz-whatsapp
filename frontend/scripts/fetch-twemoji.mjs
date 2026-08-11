// fetch-twemoji.mjs
// ────────────────────────────────────────────────────────────────────────────
// Vendors the Twemoji PNGs used by the built-in sticker catalog into
// frontend/public/stickers/twemoji/ so stickers keep rendering when the
// jsDelivr CDN is unreachable (StickerImage falls back to this local copy).
//
// Usage:
//   cd frontend && npm run fetch:twemoji
//
// The list below MUST stay in sync with PACK_DEFS in
// backend/controllers/stickerController.js. Emoji → codepoint conversion
// mirrors emojiToCodepoint() there, so filenames match the CDN exactly.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Keep in sync with backend/controllers/stickerController.js (PACK_DEFS) ──
const EMOJIS = [
  // genz-classics
  '😂', '🔥', '💯', '😭', '🥹', '😎', '🤙', '🫡', '👀', '🙌', '💀', '✨',
  // love-vibes
  '❤️', '😍', '🥰', '💕', '💖', '😘', '🌹', '💘', '😻', '💝', '🫶', '💞',
  // mood-swings
  '😤', '😡', '😩', '😔', '🥲', '😴', '🙄', '😬', '🫠', '😵‍💫', '🤯', '😱',
  // celebration
  '🎉', '🎊', '🥳', '🍾', '🎂', '🏆', '🙏', '👏', '🎈', '🎁', '💪', '🚀',
  // animals
  '🐶', '🐱', '🐼', '🐨', '🦁', '🐸', '🐵', '🦊', '🐹', '🐰', '🐣', '🦄',
  // reactions
  '👍', '👎', '🤝', '✅', '❌', '❓', '❗', '🤔', '👌', '🤐', '🫣', '🤫',
];

const TWEMOJI_VERSION = '14.0.2';
const BASE = `https://cdn.jsdelivr.net/gh/twitter/twemoji@${TWEMOJI_VERSION}/assets/72x72`;
const OUT_DIR = path.resolve(__dirname, '../public/stickers/twemoji');

const emojiToCodepoint = (emoji) => {
  const codepoints = [];
  for (const char of emoji) {
    codepoints.push(char.codePointAt(0).toString(16));
  }
  return codepoints.join('-');
};

const run = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const unique = [...new Set(EMOJIS)];
  let ok = 0;
  let skipped = 0;
  const failed = [];

  for (const emoji of unique) {
    const filename = `${emojiToCodepoint(emoji)}.png`;
    const dest = path.join(OUT_DIR, filename);
    if (existsSync(dest)) {
      skipped += 1;
      continue;
    }
    try {
      const res = await fetch(`${BASE}/${filename}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      ok += 1;
    } catch (err) {
      // Twemoji strips U+FE0F variation selectors from its filenames (e.g.
      // ❤️ is 2764.png, not 2764-fe0f.png). The backend's catalog URL keeps
      // the -fe0f suffix, so vendor the real file under that exact name to
      // keep the local mirror addressable by the same URL.
      const stripped = filename.replace(/-fe0f\.png$/, '.png');
      if (stripped !== filename) {
        try {
          const res = await fetch(`${BASE}/${stripped}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await writeFile(dest, Buffer.from(await res.arrayBuffer()));
          ok += 1;
          console.warn(`  ⚠ ${emoji} saved as ${filename} (CDN serves ${stripped})`);
          continue;
        } catch (err2) {
          failed.push(`${emoji} (${filename}): ${err2.message}`);
          continue;
        }
      }
      failed.push(`${emoji} (${filename}): ${err.message}`);
    }
  }

  console.log(`Twemoji local assets → ${OUT_DIR}`);
  console.log(`  downloaded: ${ok}, already present: ${skipped}, failed: ${failed.length}`);
  for (const f of failed) console.error(`  ✗ ${f}`);
  if (failed.length > 0) process.exitCode = 1;
};

run();
