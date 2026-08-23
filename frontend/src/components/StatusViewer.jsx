import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { X, Volume2, VolumeX, Send, Eye, Trash2, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import ReactPlayer from 'react-player'
import './StatusViewer.css'

// Format remaining time as "Xh Ym" or "Ym" or "<1m"
const formatRemainingTime = (expiresAt) => {
  if (!expiresAt) return ''
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m left`
  if (minutes > 0) return `${minutes}m left`
  return '<1m left'
}

const StatusViewer = ({ user, initialIndex = 0, onClose }) => {
  const { currentUser, viewStatus, deleteStatus, socket } = useStatusContext()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState([])
  const [duration, setDuration] = useState(5000) // default 5s for images
  const [remainingTime, setRemainingTime] = useState('')
  const progressRef = useRef(null)
  const containerRef = useRef(null)
  const touchStartX = useRef(0)

  const statuses = user?.statuses || []
  const currentStatus = statuses[currentIndex]
  const isOwner = currentUser?.id === currentStatus?.userId?._id

  // Update remaining time every 30 seconds
  useEffect(() => {
    if (!currentStatus?.expiresAt) return
    const update = () => setRemainingTime(formatRemainingTime(currentStatus.expiresAt))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [currentStatus?.expiresAt])

  // Mark as viewed
  useEffect(() => {
    if (currentStatus && !currentStatus.isViewed) {
      viewStatus(currentStatus._id)
    }
  }, [currentStatus, viewStatus])

  // Progress timer
  useEffect(() => {
    if (isPaused || showReply || showViewers) return
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goNext()
          return 0
        }
        return prev + (100 / (duration / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, duration, showReply, showViewers])

  const goNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, statuses.length, onClose])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setProgress(0)
    }
  }, [currentIndex])

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    setIsPaused(true)
  }

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    setIsPaused(false)
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  const handleSendReply = () => {
    if (!replyText.trim() || !socket) return
    socket.emit('reply_to_status', {
      statusId: currentStatus._id,
      ownerId: currentStatus.userId._id,
      senderId: currentUser.id,
      message: replyText
    })
    setReplyText('')
    setShowReply(false)
  }

  const fetchViewers = async () => {
    if (!isOwner) return
    try {
      const res = await fetch(`http://localhost:5000/api/status/viewers/${currentStatus._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      setViewers(data.viewers || [])
      setShowViewers(true)
      setIsPaused(true)
    } catch (err) {
      console.error(err)
    }
  }

  if (!currentStatus) return null

  return (
    <div className="status-viewer" ref={containerRef}>
      {/* Top Bar */}
      <div className="viewer-top-bar">
        <div className="progress-bars">
          {statuses.map((_, idx) => (
            <div key={idx} className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  transition: idx === currentIndex ? 'width 0.1s linear' : 'none'
                }}
              />
            </div>
          ))}
        </div>
        
        <div className="viewer-header">
          <div className="viewer-user-info">
            <img src={currentStatus.userId?.profilePicture || '/default-avatar.png'} alt="" />
            <div>
              <h4>{currentStatus.userId?.username}</h4>
              <span>{new Date(currentStatus.createdAt).toLocaleTimeString()}{remainingTime ? ` • ${remainingTime}` : ''}</span>
            </div>
          </div>
          <div className="viewer-actions">
            {currentStatus.type === 'video' && (
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            )}
            <button onClick={onClose}><X size={24} /></button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="viewer-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {currentStatus.type === 'text' && (
          <div className="text-status-display" style={{ 
            backgroundColor: currentStatus.textStatus?.backgroundColor || '#128C7E',
            color: currentStatus.textStatus?.fontColor || '#FFFFFF'
          }}>
            <h1>{currentStatus.textStatus?.text}</h1>
          </div>
        )}

        {currentStatus.type === 'image' && (
          <img src={currentStatus.content} alt="status" className="status-media" />
        )}

        {currentStatus.type === 'video' && (
          <ReactPlayer
            url={currentStatus.content}
            playing={!isPaused}
            muted={isMuted}
            loop={false}
            width="100%"
            height="100%"
            onDuration={d => setDuration(d * 1000)}
            onEnded={goNext}
            style={{ objectFit: 'cover' }}
          />
        )}

        {/* Pause Indicator */}
        {isPaused && !showReply && !showViewers && (
          <div className="pause-indicator">
            <Pause size={48} />
          </div>
        )}

        {/* Navigation Areas */}
        <div className="nav-area left" onClick={goPrev} />
        <div className="nav-area right" onClick={goNext} />
      </div>

      {/* Bottom Actions */}
      <div className="viewer-bottom">
        {isOwner && (
          <button className="view-count-btn" onClick={fetchViewers}>
            <Eye size={18} />
            <span>{currentStatus.viewCount || 0}</span>
          </button>
        )}
        
        <div className="reply-input-container">
          <input
            type="text"
            placeholder="Reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <button onClick={handleSendReply} disabled={!replyText.trim()}>
            <Send size={20} />
          </button>
        </div>

        {isOwner && (
          <button className="delete-btn" onClick={() => {
            deleteStatus(currentStatus._id)
            onClose()
          }}>
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div className="viewers-modal" onClick={() => { setShowViewers(false); setIsPaused(false) }}>
          <div className="viewers-content" onClick={e => e.stopPropagation()}>
            <h3>Viewed by {viewers.length}</h3>
            {viewers.map((v, i) => (
              <div key={i} className="viewer-item">
                <img src={v.userId?.profilePicture || '/default-avatar.png'} alt="" />
                <span>{v.userId?.username}</span>
                <small>{new Date(v.viewedAt).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusViewer
