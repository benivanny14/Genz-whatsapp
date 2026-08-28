import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'
import { X, Clock, AlertCircle, Download, QrCode, Share2, Heart } from 'lucide-react'
import ReactPlayer from 'react-player'
import './SharedStatus.css'

const SharedStatus = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [liked, setLiked] = useState(false)

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

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${status.username}'s Status`,
          text: status.textStatus?.text || 'Check out this status',
          url: window.location.href
        })
      } catch (err) { /* cancelled */ }
    }
  }

  const getQRCodeUrl = () => {
    const url = encodeURIComponent(window.location.href)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}&bgcolor=1a1a2e&color=00a884`
  }

  if (loading) {
    return (
      <div className="shared-status-page">
        <div className="shared-status-loading">
          <div className="shared-spinner" />
          <p>Loading status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shared-status-page">
        <div className="shared-status-error">
          <AlertCircle size={56} color="#8696a0" />
          <h2>Unable to load status</h2>
          <p>{error}</p>
          <button className="shared-btn-primary" onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shared-status-page">
      {/* Header */}
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
        <div className="shared-header-actions">
          <button className="shared-icon-btn" onClick={handleNativeShare} title="Share">
            <Share2 size={20} />
          </button>
          <button className="shared-icon-btn" onClick={() => setShowQR(!showQR)} title="QR Code">
            <QrCode size={20} />
          </button>
          <button className="shared-close" onClick={() => window.history.back()}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* QR Code Panel */}
      {showQR && (
        <div className="shared-qr-panel">
          <div className="shared-qr-card">
            <img src={getQRCodeUrl()} alt="QR Code" className="shared-qr-image" />
            <p className="shared-qr-text">Scan to view this status</p>
          </div>
        </div>
      )}

      {/* Content */}
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

        {(status.type === 'voice' || status.type === 'audio') && (
          <div className="shared-voice-status">
            <div className="shared-voice-icon">🎤</div>
            <p className="shared-voice-label">Voice Status</p>
            <audio src={status.content} controls autoPlay style={{ width: '85%', maxWidth: '340px', borderRadius: '24px' }} />
          </div>
        )}

        {status.caption && (
          <div className="shared-caption">{status.caption}</div>
        )}
      </div>

      {/* Footer */}
      <div className="shared-footer">
        <button
          className={`shared-like-btn ${liked ? 'liked' : ''}`}
          onClick={() => setLiked(!liked)}
        >
          <Heart size={20} fill={liked ? '#ef4444' : 'none'} color={liked ? '#ef4444' : '#8696a0'} />
        </button>
        <p className="shared-footer-text">Shared via Genz Messenger</p>
        <a href="https://github.com/benivanny14/Genz-whatsapp" target="_blank" rel="noreferrer" className="shared-download-btn">
          <Download size={16} /> Get the App
        </a>
      </div>
    </div>
  )
}

export default SharedStatus
