import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../utils/axios'
import { X, Archive, RotateCcw, Trash2, Eye, ArchiveRestore, ChevronDown } from 'lucide-react'
import './StatusArchive.css'

const StatusArchive = ({ onClose, onViewStatus }) => {
  const [activeTab, setActiveTab] = useState('archived') // archived | deleted
  const [archived, setArchived] = useState([])
  const [revoked, setRevoked] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Swipe gesture state
  const [swipedId, setSwipedId] = useState(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)

  const fetchArchived = async () => {
    try {
      const res = await api.get('/status/archive')
      setArchived(res.data.archived || res.data || [])
    } catch (err) {
      console.error('Failed to fetch archived statuses:', err)
    }
    setLoading(false)
  }

  const fetchRevoked = async () => {
    try {
      const res = await api.get('/status/revoked')
      setRevoked(res.data.statuses || [])
    } catch (err) {
      console.error('Failed to fetch revoked statuses:', err)
    }
  }

  useEffect(() => {
    fetchArchived()
    fetchRevoked()
  }, [])

  const unarchive = async (statusId) => {
    try {
      await api.post(`/status/unarchive/${statusId}`)
      setArchived(prev => prev.filter(s => s._id !== statusId))
    } catch (err) {
      console.error('Failed to unarchive status:', err)
    }
  }

  const deleteStatus = async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`)
      setArchived(prev => prev.filter(s => s._id !== statusId))
      setRevoked(prev => prev.filter(s => s._id !== statusId))
    } catch (err) {
      console.error('Failed to delete status:', err)
    }
  }

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e, statusId) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
    setSwipedId(null)
  }, [])

  const handleTouchMove = useCallback((e, statusId) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    
    // Only allow left swipe (negative diff)
    if (diff < -30) {
      setSwipedId(statusId)
    } else if (diff > 30) {
      setSwipedId(null)
    }
  }, [])

  const handleTouchEnd = useCallback((statusId) => {
    const diff = touchCurrentX.current - touchStartX.current
    // If swiped left more than 80px, trigger delete
    if (diff < -80) {
      if (activeTab === 'archived') {
        deleteStatus(statusId)
      }
      setSwipedId(null)
    }
  }, [activeTab])

  const items = activeTab === 'archived' ? archived : revoked

  return (
    <div className="archive-overlay">
      <div className="archive-container">
        {/* Header */}
        <div className="archive-header" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <button onClick={onClose} style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
          <h3>Archived Status</h3>
          <span>{items.length} items</span>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-4 pb-0">
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-[#00a884] text-white' : 'bg-white/10 text-gray-400'}`}
          >
            📦 Archived ({archived.length})
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'deleted' ? 'bg-[#00a884] text-white' : 'bg-white/10 text-gray-400'}`}
          >
            🗑️ Deleted ({revoked.length})
          </button>
        </div>

        {loading ? (
          <div className="archive-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00a884] border-t-transparent" />
            <p className="mt-2 text-gray-400 text-sm">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="archive-empty">
            <Archive size={48} color="#8696a0" />
            <p className="text-gray-400 mt-2">
              {activeTab === 'archived' ? 'No archived status' : 'No deleted status'}
            </p>
          </div>
        ) : (
          <div className="archive-list overflow-y-auto max-h-[60vh]">
            {items.map(status => (
              <div
                key={status._id}
                className="archive-item"
                style={{
                  transform: `translateX(${swipedId === status._id ? '-80px' : '0'})`,
                  transition: 'transform 0.2s ease'
                }}
                onTouchStart={(e) => handleTouchStart(e, status._id)}
                onTouchMove={(e) => handleTouchMove(e, status._id)}
                onTouchEnd={() => handleTouchEnd(status._id)}
              >
                {/* Thumbnail */}
                {status.type === 'image' && (
                  <img
                    src={status.content}
                    alt=""
                    loading="lazy"
                    style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                {status.type === 'video' && (
                  <video
                    src={status.content}
                    muted
                    loading="lazy"
                    style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                {status.type === 'text' && (
                  <div
                    className="archive-text"
                    style={{
                      background: status.textStatus?.backgroundColor || status.backgroundColor || '#128C7E',
                      width: '56px', height: '56px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <p style={{ color: '#fff', fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                      {(status.textStatus?.text || status.content || '').substring(0, 20)}
                    </p>
                  </div>
                )}
                {(status.type === 'voice' || status.type === 'audio') && (
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                  }}>
                    🎵
                  </div>
                )}

                {/* Meta info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#e9edef', fontSize: '14px', fontWeight: 500 }}>
                    {status.caption || status.type || 'Status'}
                  </p>
                  <p style={{ color: '#8696a0', fontSize: '12px' }}>
                    {new Date(status.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => onViewStatus({ user: status.userId, statuses: [status] })}
                    style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="View status"
                  >
                    <Eye size={18} color="#00a884" />
                  </button>
                  {activeTab === 'archived' && (
                    <button
                      onClick={() => unarchive(status._id)}
                      style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                      aria-label="Restore status"
                    >
                      <ArchiveRestore size={18} color="#22c55e" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteStatus(status._id)}
                    style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="Delete status permanently"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Swipe hint */}
            <p style={{ textAlign: 'center', color: '#667781', fontSize: '11px', padding: '12px' }}>
              💡 Swipe left to delete
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusArchive
