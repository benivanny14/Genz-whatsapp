import React, { useState, useEffect } from 'react'
import api from '../utils/axios'
import { X, Archive, RotateCcw, Trash2, Eye } from 'lucide-react'
import './StatusArchive.css'

const StatusArchive = ({ onClose, onViewStatus }) => {
  const [archived, setArchived] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArchived()
  }, [])

  const fetchArchived = async () => {
    try {
      const res = await api.get('/status/archive')
      setArchived(res.data.archived || res.data)
    } catch (err) {
      console.error('Failed to fetch archived statuses:', err)
    }
    setLoading(false)
  }

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
    } catch (err) {
      console.error('Failed to delete status:', err)
    }
  }

  return (
    <div className="archive-overlay">
      <div className="archive-container">
        <div className="archive-header">
          <button onClick={onClose}><X size={24} /></button>
          <h3>Archived Status</h3>
          <span>{archived.length} items</span>
        </div>

        {loading ? (
          <div className="archive-loading">Loading...</div>
        ) : archived.length === 0 ? (
          <div className="archive-empty">
            <Archive size={48} color="#8696a0" />
            <p>No archived status</p>
          </div>
        ) : (
          <div className="archive-list">
            {archived.map(status => (
              <div key={status._id} className="archive-item">
                {status.type === 'image' && <img src={status.content} alt="" />}
                {status.type === 'video' && (
                  <video src={status.content} muted />
                )}
                {status.type === 'text' && (
                  <div className="archive-text" style={{ background: status.textStatus?.backgroundColor || status.backgroundColor || '#128C7E' }}>
                    <p>{status.textStatus?.text || status.content}</p>
                  </div>
                )}
                <div className="archive-meta">
                  <span>{new Date(status.createdAt).toLocaleDateString()}</span>
                  <div className="archive-actions">
                    <button onClick={() => onViewStatus({ user: status.userId, statuses: [status] })}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => unarchive(status._id)}>
                      <RotateCcw size={16} />
                    </button>
                    <button onClick={() => deleteStatus(status._id)} className="danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusArchive
