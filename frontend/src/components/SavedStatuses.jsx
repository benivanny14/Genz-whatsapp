import React, { useState, useEffect } from 'react'
import { X, Bookmark, Eye, Clock, Trash2, ExternalLink } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'

const SavedStatuses = ({ onClose, onViewStatus }) => {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSaved = async () => {
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/saved`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      const data = await res.json()
      if (data.success) setStatuses(data.statuses || [])
    } catch (err) {
      console.error('Fetch saved statuses error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSaved()
  }, [])

  const handleUnsave = async (statusId) => {
    try {
      const token = getAuthToken()
      await fetch(`${resolveApiBase()}/status/${statusId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        }
      })
      setStatuses(prev => prev.filter(s => s._id !== statusId))
    } catch (err) {
      console.error('Unsave error:', err)
    }
  }

  const handleView = (status) => {
    if (!onViewStatus) return
    // Group by user for StatusViewer compatibility
    const ownerUser = status.userId || status.user || {}
    onViewStatus({
      userId: ownerUser._id || ownerUser,
      username: ownerUser.username || status.username || 'Unknown',
      profilePicture: ownerUser.profilePicture || '',
      statuses: [status]
    })
  }

  return (
    <div className="privacy-overlay" style={{ zIndex: 200 }}>
      <div className="privacy-container" style={{ maxWidth: '420px', maxHeight: '80vh' }}>
        <div className="privacy-header">
          <button onClick={onClose}><X size={20} /></button>
          <h3><Bookmark size={18} /> Saved Statuses</h3>
          <span style={{ color: '#8696a0', fontSize: '13px' }}>{statuses.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8696a0' }}>Loading...</div>
        ) : statuses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Bookmark size={48} color="#8696a0" />
            <p style={{ color: '#8696a0', marginTop: '12px' }}>No saved statuses yet</p>
            <small style={{ color: '#667781' }}>Tap the bookmark icon on any status to save it here</small>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>
            {statuses.map((status) => {
              const owner = status.userId || status.user || {}
              return (
                <div
                  key={status._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onClick={() => handleView(status)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden',
                    flexShrink: 0, background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {status.type === 'image' && status.content ? (
                      <img src={status.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : status.type === 'video' && status.content ? (
                      <video src={status.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : status.type === 'text' ? (
                      <div style={{
                        width: '100%', height: '100%',
                        background: status.textStatus?.backgroundColor || '#128C7E',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: status.textStatus?.fontColor || '#fff', padding: '2px'
                      }}>
                        {(status.textStatus?.text || status.content || '').substring(0, 15)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '20px' }}>🎵</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img
                        src={owner.profilePicture || '/default-avatar.png'}
                        alt=""
                        style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                      />
                      <span style={{ color: '#e9edef', fontSize: '14px', fontWeight: 500 }}>
                        {owner.username || status.username || 'Unknown'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'capitalize' }}>
                        {status.type}
                      </span>
                      {status.savedAt && (
                        <span style={{ color: '#667781', fontSize: '11px' }}>
                          Saved {new Date(status.savedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleView(status); }}
                      title="View"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#00a884' }}
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnsave(status._id); }}
                      title="Remove from saved"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedStatuses
