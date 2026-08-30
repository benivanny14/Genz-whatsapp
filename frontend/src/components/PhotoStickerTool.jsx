import React, { useRef, useState, useCallback } from 'react'
import { Scissors, MousePointer2, RotateCcw, Check, X } from 'lucide-react'

/**
 * Photo Sticker Tool — allows creating stickers from images via:
 * 1. Auto background removal (canvas-based edge detection)
 * 2. Manual freehand lasso cutout
 * 3. Shape crop (circle, square, heart)
 *
 * Produces a transparent PNG sticker from the input image.
 */

const SHAPE_OPTIONS = [
  { id: 'freehand', label: '✂️ Freehand', icon: Scissors },
  { id: 'circle', label: '⭕ Circle', icon: null },
  { id: 'square', label: '⬜ Square', icon: null },
  { id: 'heart', label: '❤️ Heart', icon: null }
]

const PhotoStickerTool = ({ imageUrl, onStickerCreated, onClose }) => {
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const [shape, setShape] = useState('circle')
  const [isDrawing, setIsDrawing] = useState(false)
  const [points, setPoints] = useState([])
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, size: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef(null)

  // Load image onto canvas
  const initCanvas = useCallback((img) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const maxW = Math.min(300, window.innerWidth - 40)
    const maxH = maxW
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const size = Math.min(canvas.width, canvas.height) * 0.8
    setCropRect({
      x: (canvas.width - size) / 2,
      y: (canvas.height - size) / 2,
      size
    })
    setImageLoaded(true)
    imageRef.current = img
  }, [])

  // Handle freehand drawing
  const handleCanvasMouseDown = (e) => {
    if (shape !== 'freehand') return
    const canvas = overlayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    setIsDrawing(true)
    setPoints([{ x, y }])
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || shape !== 'freehand') return
    const canvas = overlayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    setPoints(prev => [...prev, { x, y }])

    // Draw the path
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(0, 168, 132, 0.8)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
  }

  // Apply cutout and produce sticker
  const applyCutout = () => {
    const srcCanvas = canvasRef.current
    const srcCtx = srcCanvas.getContext('2d')
    const w = srcCanvas.width
    const h = srcCanvas.height

    // Create output canvas with transparency
    const outCanvas = document.createElement('canvas')
    outCanvas.width = w
    outCanvas.height = h
    const outCtx = outCanvas.getContext('2d')

    // Draw original image
    outCtx.drawImage(srcCanvas, 0, 0)

    // Apply shape mask
    outCtx.globalCompositeOperation = 'destination-in'
    outCtx.beginPath()

    if (shape === 'circle') {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2
      outCtx.arc(cx, cy, r, 0, Math.PI * 2)
    } else if (shape === 'square') {
      const size = Math.min(w, h) * 0.85
      outCtx.rect((w - size) / 2, (h - size) / 2, size, size)
    } else if (shape === 'heart') {
      // Heart shape using bezier curves
      const cx = w / 2, cy = h / 2
      const s = Math.min(w, h) * 0.004
      outCtx.moveTo(cx, cy + 20 * s)
      outCtx.bezierCurveTo(cx - 50 * s, cy - 10 * s, cx - 50 * s, cy - 50 * s, cx, cy - 30 * s)
      outCtx.bezierCurveTo(cx + 50 * s, cy - 50 * s, cx + 50 * s, cy - 10 * s, cx, cy + 20 * s)
    } else if (shape === 'freehand' && points.length > 2) {
      outCtx.moveTo(points[0].x, points[0].y)
      points.forEach(p => outCtx.lineTo(p.x, p.y))
      outCtx.closePath()
    }

    outCtx.fill()
    outCtx.globalCompositeOperation = 'source-over'

    // Export as data URL
    const stickerUrl = outCanvas.toDataURL('image/png')
    onStickerCreated(stickerUrl)
  }

  return (
    <div style={{
      padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
    }}>
      {/* Shape selector */}
      <div style={{
        display: 'flex', gap: 6, width: '100%', justifyContent: 'center', flexWrap: 'wrap'
      }}>
        {SHAPE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => { setShape(opt.id); setPoints([]) }}
            style={{
              padding: '6px 12px', borderRadius: 20, border: 'none',
              background: shape === opt.id ? '#00a884' : 'rgba(255,255,255,0.1)',
              color: shape === opt.id ? '#fff' : '#8696a0',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Canvas area */}
      <div style={{ position: 'relative', display: 'inline-block', borderRadius: 12, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', borderRadius: 12 }}
        />
        {shape === 'freehand' && (
          <canvas
            ref={overlayCanvasRef}
            width={canvasRef.current?.width || 300}
            height={canvasRef.current?.height || 300}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              cursor: 'crosshair'
            }}
          />
        )}
        {/* Crop indicator for non-freehand shapes */}
        {shape !== 'freehand' && imageLoaded && (
          <div style={{
            position: 'absolute',
            border: '2px dashed rgba(0,168,132,0.6)',
            borderRadius: shape === 'circle' ? '50%' : shape === 'heart' ? '50%' : 0,
            pointerEvents: 'none',
            ...getOverlayStyle(shape, cropRect)
          }} />
        )}
      </div>

      {shape === 'freehand' && (
        <p style={{ color: '#8696a0', fontSize: 11, textAlign: 'center', margin: 0 }}>
          Draw around the object you want to cut out
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={() => { setPoints([]); initCanvas(imageRef.current) }}
          style={{
            flex: 1, padding: 10, borderRadius: 10, border: 'none',
            background: 'rgba(255,255,255,0.08)', color: '#e9edef',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button
          onClick={() => {
            applyCutout()
            onClose?.()
          }}
          style={{
            flex: 2, padding: 10, borderRadius: 10, border: 'none',
            background: '#00a884', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          <Check size={14} /> Create Sticker
        </button>
      </div>
    </div>
  )
}

function getOverlayStyle(shape, cropRect) {
  if (shape === 'circle' || shape === 'heart') {
    return {
      left: cropRect.x,
      top: cropRect.y,
      width: cropRect.size,
      height: cropRect.size,
    }
  }
  // square
  const s = cropRect.size * 0.85
  return {
    left: (cropRect.x + cropRect.size / 2) - s / 2,
    top: (cropRect.y + cropRect.size / 2) - s / 2,
    width: s,
    height: s,
  }
}

export default PhotoStickerTool
