import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'
import { X, Clock, AlertCircle } from 'lucide-react'
import ReactPlayer from 'react-player'
import './SharedStatus.css'

const SharedStatus = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const token = searchParams.get('share') || searchParams.get('token') || ''
        const url = `${resolveApiBase()}/status/shared/${id}?share=${encodeURIComponent(token)}`
        const headers = {}
        const authToken = getAuthToken()
        if (authToken) headers.Authorization = `Bearer ${authToken}`

        const res = await fetch(url, { headers })
        const data = await res.json()

        if (!res.ok || !data.success) {
          setError(data.message || 'This status is no longer available')
        } else {
          setStatus(data.status)
        }
      } catch (err) {
        setError('Failed to load status')
      } finally {
        setLoading(false)
      }
    }

    fetchShared()
  }, [id, searchParams])

  const formatRemainingTime = (expiresAt) => {
    if (!expiresAt) return ''
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m left`
    return `${minutes}m left`
  }

  if (loading) {
    return (
      <div className="shared-status-page">
        <div className="shared-status-loading">
          <div className="spinner" />
          <p>Loading status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shared-status-page">
        <div className="shared-status-error">
          <AlertCircle size={48} color="#8696a0" />
          <h2>Unable to load status</h2>
          <p>{error}</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shared-status-page">
      <div className="shared-status-header">
        <div className="shared-user-info">
          {status.profilePicture && (
            <img src={status.profilePicture} alt="" className="shared-avatar" />
          )}
          <div>
            <h3>{status.username}</h3>
            <span className="shared-time">
              <Clock size={12} />
              {new Date(status.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {status.expiresAt && ` • ${formatRemainingTime(status.expiresAt)}`}
            </span>
          </div>
        </div>
        <button className="shared-close" onClick={() => window.history.back()}>
          <X size={24} />
        </button>
      </div>

      <div className="shared-status-content">
        {status.type === 'text' && (
          <div
            className="shared-text-status"
            style={{
              backgroundColor: status.textStatus?.backgroundColor || '#128C7E',
              color: status.textStatus?.fontColor || '#FFFFFF'
            }}
          >
            <h1>{status.textStatus?.text}</h1>
          </div>
        )}

        {status.type === 'image' && (
          <img src={status.content} alt="Shared status" className="shared-media" />
        )}

        {status.type === 'video' && (
          <ReactPlayer
            url={status.content}
            playing
            controls
            width="100%"
            height="100%"
            style={{ objectFit: 'cover' }}
          />
        )}

        {status.caption && (
          <div className="shared-caption">{status.caption}</div>
        )}
      </div>

      <div className="shared-footer">
        <p>Viewed via share link • Expires with the original status</p>
      </div>
    </div>
  )
}

export default SharedStatus
