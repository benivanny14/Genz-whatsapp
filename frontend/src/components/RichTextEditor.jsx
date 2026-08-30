import React, { useRef, useState, useCallback } from 'react'

/**
 * Rich text formatting toolbar + textarea + live preview for text statuses.
 * Supports bold, italic, strikethrough, code, quote, and bullet lists.
 */

const FORMATTING_TOOLS = [
  { icon: 'B', label: 'Bold', prefix: '**', suffix: '**' },
  { icon: 'I', label: 'Italic', prefix: '*', suffix: '*', fontStyle: 'italic' },
  { icon: 'S', label: 'Strikethrough', prefix: '~~', suffix: '~~', textDecoration: 'line-through' },
  { icon: '</>', label: 'Code', prefix: '`', suffix: '`' },
  { icon: '❝', label: 'Quote', prefix: '> ', suffix: '' },
  { icon: '•', label: 'Bullet', prefix: '- ', suffix: '' }
]

/**
 * Convert simple markdown-like syntax to HTML for preview
 */
const renderHTML = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="font-style:italic">$1</em>')
    .replace(/~~(.*?)~~/g, '<del style="text-decoration:line-through;opacity:0.7">$1</del>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(0,168,132,0.2);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>')
    .replace(/^&gt; (.*$)/gm, '<blockquote style="border-left:3px solid #00a884;padding-left:10px;margin:4px 0;opacity:0.9;font-style:italic">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/\n/g, '<br/>')
}

const RichTextEditor = ({ value, onChange, backgroundColor, fontColor }) => {
  const textareaRef = useRef(null)
  const [showPreview, setShowPreview] = useState(false)

  const applyFormat = useCallback((prefix, suffix = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value || ''
    const selected = text.substring(start, end)

    let newText
    if (selected) {
      // Wrap selection
      newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
    } else {
      // Insert markers at cursor
      newText = text.substring(0, start) + prefix + suffix + text.substring(end)
    }
    onChange(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newPos = start + prefix.length + (selected ? selected.length : 0)
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }, [value, onChange])

  return (
    <div className="rich-text-editor" style={{ width: '100%' }}>
      {/* Formatting Toolbar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 8, padding: '6px 8px',
        background: 'rgba(255,255,255,0.08)', borderRadius: 10,
        justifyContent: 'center'
      }}>
        {FORMATTING_TOOLS.map(tool => (
          <button
            key={tool.label}
            onClick={() => applyFormat(tool.prefix, tool.suffix)}
            title={tool.label}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: '#e9edef', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.15s',
              fontFamily: tool.icon === '</>' ? 'monospace' : 'inherit',
              fontStyle: tool.fontStyle || 'normal',
              textDecoration: tool.textDecoration || 'none'
            }}
            onMouseDown={(e) => e.preventDefault()} // prevent blur
          >
            {tool.icon}
          </button>
        ))}

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          title="Preview"
          style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none',
            background: showPreview ? 'rgba(0,168,132,0.3)' : 'rgba(255,255,255,0.06)',
            color: showPreview ? '#00a884' : '#8696a0', fontSize: 16,
            cursor: 'pointer', transition: 'all 0.15s'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          👁
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a status..."
        style={{
          width: '100%',
          background: 'transparent',
          color: fontColor || '#fff',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: 'clamp(20px, 6vw, 36px)',
          minHeight: 120,
          textAlign: 'center',
          lineHeight: 1.3,
          fontFamily: 'inherit'
        }}
      />

      {/* Live Preview */}
      {showPreview && value && (
        <div style={{
          marginTop: 8, padding: 12,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 10, color: fontColor || '#fff'
        }}>
          <div style={{ fontSize: 10, color: '#8696a0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Preview
          </div>
          <div
            style={{ fontSize: 'clamp(16px, 4vw, 24px)', lineHeight: 1.4 }}
            dangerouslySetInnerHTML={{ __html: renderHTML(value) }}
          />
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
