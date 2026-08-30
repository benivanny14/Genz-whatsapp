import React, { useState, useRef, useCallback } from 'react'
import { X, Plus, GripVertical, Columns, LayoutGrid } from 'lucide-react'

const LAYOUTS = [
  { id: '2x2', label: '2×2', cols: 2, rows: 2, slots: 4 },
  { id: '1+2', label: '1+2', cols: 2, rows: 2, slots: 3, spans: [{ col: '1 / 3', row: '1 / 2' }, { col: '1 / 2', row: '2 / 3' }, { col: '2 / 3', row: '2 / 3' }] },
  { id: '3x1', label: '3×1', cols: 3, rows: 1, slots: 3 },
  { id: '2x1', label: '2×1', cols: 2, rows: 1, slots: 2 },
  { id: '1x3', label: '1×3', cols: 1, rows: 3, slots: 3 },
  { id: 'masonry', label: 'Masonry', cols: 2, rows: 'auto', slots: 4 }
]

/**
 * Collage builder — lets users pick a layout, add images, reorder them,
 * and export the final collage as a single image.
 */
const CollageBuilder = ({ onComplete, onCancel }) => {
  const [layout, setLayout] = useState('2x2')
  const [images, setImages] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const fileInputRef = useRef(null)

  const currentLayout = LAYOUTS.find(l => l.id === layout) || LAYOUTS[0]

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newImages = files.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      id: Date.now() + Math.random()
    }))
    setImages(prev => [...prev, ...newImages].slice(0, currentLayout.slots))
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const moveImage = (from, to) => {
    if (to < 0 || to >= images.length) return
    setImages(prev => {
      const arr = [...prev]; [arr[from], arr[to]] = [arr[to], arr[from]]; return arr
    })
  }

  // Render collage as a visual grid
  const renderGrid = () => {
    if (layout === '1+2' && currentLayout.spans) {
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 3,
          width: '100%',
          aspectRatio: '1',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          {currentLayout.spans.map((span, i) => (
            <div
              key={i}
              style={{
                gridColumn: span.col,
                gridRow: span.row,
                background: images[i] ? 'transparent' : 'rgba(255,255,255,0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {images[i] ? (
                <>
                  <img src={images[i].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removeImage(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none',
                      color: '#fff', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12
                    }}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', height: '100%', background: 'none',
                    border: '1px dashed rgba(255,255,255,0.3)', color: '#8696a0',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${currentLayout.cols}, 1fr)`,
        gridTemplateRows: layout === 'masonry'
          ? 'auto'
          : `repeat(${currentLayout.rows}, 1fr)`,
        gap: 3,
        width: '100%',
        aspectRatio: layout === '3x1' ? '3' : layout === '2x1' ? '2' : layout === '1x3' ? '0.33' : '1',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        {Array.from({ length: currentLayout.slots }).map((_, i) => (
          <div key={i} style={{
            background: images[i] ? 'transparent' : 'rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: layout === 'masonry' ? 100 : undefined
          }}>
            {images[i] ? (
              <>
                <img src={images[i].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', top: 2, left: 2, display: 'flex', gap: 2
                }}>
                  {i > 0 && (
                    <button
                      onClick={() => moveImage(i, i - 1)}
                      style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        color: '#fff', cursor: 'pointer', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      ←
                    </button>
                  )}
                  {i < images.length - 1 && (
                    <button
                      onClick={() => moveImage(i, i + 1)}
                      style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        color: '#fff', cursor: 'pointer', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      →
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    color: '#fff', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 12
                  }}
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: '100%', minHeight: layout === 'masonry' ? 100 : 80,
                  background: 'none', border: '1px dashed rgba(255,255,255,0.2)',
                  color: '#8696a0', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  const handleExport = () => {
    if (images.length < 2) return
    // Return the image URLs for the parent to create the collage
    onComplete?.({
      type: 'collage',
      layout,
      images: images.map(img => img.url)
    })
  }

  return (
    <div style={{ padding: '12px 0' }}>
      {/* Layout picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {LAYOUTS.map(l => (
          <button
            key={l.id}
            onClick={() => { setLayout(l.id); setImages(prev => prev.slice(0, l.slots)) }}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: layout === l.id ? '#00a884' : 'rgba(255,255,255,0.08)',
              border: layout === l.id ? '1px solid #00a884' : '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer'
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Grid preview */}
      {renderGrid()}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleAddImages}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Add Photos
        </button>
        {images.length >= 2 && (
          <button
            onClick={handleExport}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#00a884', border: 'none', color: '#fff', cursor: 'pointer'
            }}
          >
            Create Collage
          </button>
        )}
      </div>
    </div>
  )
}

export default CollageBuilder
