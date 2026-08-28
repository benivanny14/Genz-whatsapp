import React, { useState, useEffect } from 'react'
import { X, Clock, Archive, Trash2, Eye, RotateCcw, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'

const StatusHistory = ({ onClose, onViewStatus }) => {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/history?page=${page}&limit=15`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      const data = await res.json()
      if (data.success) {
        setStatuses(data.statuses || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Fetch history error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [page])

  const handleRestore = async (statusId) => {
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/history/${statusId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        }
      })
      const data = await res.json()
      if (data.success) {
        setStatuses(prev => prev.filter(s => s._id !== statusId))
        setTotal(prev => prev - 1)
      }
    } catch (err) {
      console.error('Restore error:', err)
    }
  }

  const getStatusLabel = (status) => {
    if (status.isRevoked || status.isDeleted) return { text: 'Deleted', color: '#ef4444', icon: <Trash2 size={12} /> }
    if (status.archived) return { text: 'Archived', color: '#f59e0b', icon: <Archive size={12} /> }
    if (status.expiresAt && new Date(status.expiresAt) <= new Date()) return { text: 'Expired', color: '#8696a0', icon: <Clock size={12} /> }
    return { text: 'Old', color: '#8696a0', icon: <Clock size={12} /> }
  }

  const handleView = (status) => {
    if (!onViewStatus) return
    const owner = status.userId || status.user || {}
    onViewStatus({
      userId: owner._id || owner,
      username: owner.username || status.username || 'Unknown',
      profilePicture: owner.profilePicture || '',
      statuses: [status]
    })
  }

  return (
    <div className="privacy-overlay" style={{ zIndex: 200 }}>
      <div className="privacy-container" style={{ maxWidth: '420px', maxHeight: '85vh' }}>
        <div className="privacy-header">
          <button onClick={onClose}><X size={20} /></button>
          <h3><History size={18} /> Status History</h3>
          <span style={{ color: '#8696a0', fontSize: '13px' }}>{total} total</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8696a0' }}>Loading history...</div>
        ) : statuses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <History size={48} color="#8696a0" />
            <p style={{ color: '#8696a0', marginTop: '12px' }}>No status history yet</p>
            <small style={{ color: '#667781' }}>Expired, archived, or deleted statuses will appear here</small>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 110px)' }}>
            {statuses.map((status) => {
              const label = getStatusLabel(status)
              const owner = status.userId || status.user || {}
              const canRestore = status.archived && status.expiresAt && new Date(status.expiresAt) > new Date()

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
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}>
                    {status.type === 'image' && status.content ? (
                      <img src={status.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                    ) : status.type === 'text' ? (
                      <div style={{
                        width: '100%', height: '100%',
                        background: status.textStatus?.backgroundColor || '#128C7E',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', color: status.textStatus?.fontColor || '#fff', padding: '2px', opacity: 0.7
                      }}>
                        {(status.textStatus?.text || status.content || '').substring(0, 15)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '18px', opacity: 0.5 }}>📱</div>
                    )}
                    {/* Status label badge */}
                    <div style={{
                      position: 'absolute', bottom: '2px', right: '2px',
                      background: label.color, borderRadius: '4px', padding: '1px 4px',
                      display: 'flex', alignItems: 'center', gap: '2px'
                    }}>
                      {label.icon}
                      <span style={{ color: '#fff', fontSize: '8px', fontWeight: 600 }}>{label.text}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>
                        {status.type} status
                      </span>
                      <span style={{ color: label.color, fontSize: '10px', fontWeight: 600 }}>{label.text}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ color: '#667781', fontSize: '11px' }}>
                        {new Date(status.createdAt).toLocaleDateString()}
                      </span>
                      {status.viewCount > 0 && (
                        <span style={{ color: '#667781', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Eye size={10} /> {status.viewCount}
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
                      <Eye size={16} />
                    </button>
                    {canRestore && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(status._id); }}
                        title="Restore to active status"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#22c55e' }}
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                    padding: '6px 12px', color: page === 1 ? '#374045' : '#fff', cursor: page === 1 ? 'default' : 'pointer'
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ color: '#8696a0', fontSize: '13px' }}>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                    padding: '6px 12px', color: page === totalPages ? '#374045' : '#fff', cursor: page === totalPages ? 'default' : 'pointer'
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusHistory
