import React from 'react'

const ANIMATIONS = [
  { id: 'none', label: 'None', icon: '❌' },
  { id: 'fadeIn', label: 'Fade In', icon: '🌅' },
  { id: 'slideUp', label: 'Slide Up', icon: '⬆️' },
  { id: 'typewriter', label: 'Typewriter', icon: '⌨️' },
  { id: 'bounce', label: 'Bounce', icon: '🏀' },
  { id: 'zoomIn', label: 'Zoom', icon: '🔍' },
  { id: 'glitch', label: 'Glitch', icon: '⚡' },
  { id: 'wave', label: 'Wave', icon: '🌊' }
]

/**
 * Animation picker grid for text statuses.
 * Shows small preview buttons with the animation name.
 */
const TextAnimationPicker = ({ selected, onSelect }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      padding: '8px 0'
    }}>
      {ANIMATIONS.map(anim => (
        <button
          key={anim.id}
          onClick={() => onSelect(anim.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 4px',
            background: selected === anim.id ? 'rgba(0,168,132,0.25)' : 'rgba(255,255,255,0.08)',
            border: selected === anim.id ? '1.5px solid #00a884' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontSize: 11,
            fontWeight: selected === anim.id ? 600 : 400
          }}
        >
          <span style={{ fontSize: 20 }}>{anim.icon}</span>
          <span>{anim.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Returns CSS animation class name for the given animation id.
 */
export const getAnimationClass = (animId) => {
  if (!animId || animId === 'none') return ''
  return `text-anim-${animId}`
}

/**
 * Returns inline CSS animation styles for the given animation id.
 */
export const getAnimationStyle = (animId) => {
  switch (animId) {
    case 'fadeIn':
      return { animation: 'animFadeIn 1s ease-out forwards' }
    case 'slideUp':
      return { animation: 'animSlideUp 0.8s ease-out forwards' }
    case 'typewriter':
      return {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        animation: 'animTyping 2.5s steps(40) forwards',
        maxWidth: 'fit-content',
        margin: '0 auto'
      }
    case 'bounce':
      return { animation: 'animBounce 0.6s ease-out forwards' }
    case 'zoomIn':
      return { animation: 'animZoomIn 0.5s ease-out forwards' }
    case 'glitch':
      return { animation: 'animGlitch 0.8s ease-in-out infinite' }
    case 'wave':
      return { animation: 'animWave 1.5s ease-in-out infinite' }
    default:
      return {}
  }
}

/**
 * CSS keyframes to inject once into the document.
 * Call this once at app mount.
 */
export const injectAnimationKeyframes = () => {
  if (document.getElementById('status-text-animations')) return
  const style = document.createElement('style')
  style.id = 'status-text-animations'
  style.textContent = `
    @keyframes animFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes animSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes animTyping { from { width: 0; } to { width: 100%; } }
    @keyframes animBounce { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes animZoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes animGlitch { 0% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
    @keyframes animWave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  `
  document.head.appendChild(style)
}

export default TextAnimationPicker
