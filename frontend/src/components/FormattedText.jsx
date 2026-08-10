import React from 'react';
import { formatTextTokens } from '../utils/formatText';

/**
 * Renders message text applying WhatsApp-style formatting markers
 * (*bold*, _italic_, ~strikethrough~, `monospace`).
 *
 * `renderText` — optional callback used to render plain-text segments (e.g. to
 * highlight @mentions). Defaults to returning the segment as-is.
 */
const FormattedText = ({ text, className, renderText = (segment) => segment }) => {
  const tokens = formatTextTokens(text);
  return (
    <span className={className}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold':
            return <strong key={i}>{token.content}</strong>;
          case 'italic':
            return <em key={i}>{token.content}</em>;
          case 'strike':
            return <s key={i}>{token.content}</s>;
          case 'mono':
            return (
              <code
                key={i}
                className="px-1 py-0.5 rounded bg-black/25 font-mono text-[0.92em]"
              >
                {token.content}
              </code>
            );
          default:
            return <React.Fragment key={i}>{renderText(token.content)}</React.Fragment>;
        }
      })}
    </span>
  );
};

export default FormattedText;
