import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { getSocket } from '../services/socket'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'
import { X, Volume2, VolumeX, Send, Eye, Trash2, ChevronLeft, ChevronRight, Pause, Play, Forward, Download, Smile, Share2, Link2, Copy, Check } from 'lucide-react'
import ReactPlayer from 'react-player'
import ForwardDialog from './ForwardDialog'
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
  const { currentUser, viewStatus, deleteStatus } = useStatusContext()
  const socket = getSocket()
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
  const [showReactions, setShowReactions] = useState(false)
  const [showForward, setShowForward] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
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

  // Save/Download status
  const handleSave = async () => {
    if (!currentStatus?.content) return
    try {
      const link = document.createElement('a')
      link.href = currentStatus.content
      link.download = `status-${currentStatus._id}`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  // React with emoji
  const handleReaction = async (emoji) => {
    if (!currentStatus?._id) return
    try {
      const token = getAuthToken()
      await fetch(`${resolveApiBase()}/status/${currentStatus._id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ emoji })
      })
    } catch (err) {
      console.error('React error:', err)
    }
    setShowReactions(false)
  }

  // Generate share token/link
  const handleShare = async () => {
    if (!isOwner || !currentStatus?._id) return
    setShareLoading(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/${currentStatus._id}/share-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      const data = await res.json()
      if (data.shareUrl) {
        setShareLink(data.shareUrl)
        setShowSharePanel(true)
      }
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback
      const input = document.createElement('input')
      input.value = shareLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentStatus.userId?.username}'s Status`,
          text: currentStatus.textStatus?.text || 'Check out this status',
          url: shareLink
        })
      } catch (err) {
        // User cancelled
      }
    }
  }

  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '🔥']

  const fetchViewers = async () => {
    if (!isOwner) return
    try {
      const res = await fetch(`${resolveApiBase()}/status/viewers/${currentStatus._id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
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

        {!isOwner && (
          <button className="action-btn" onClick={handleSave} title="Save status">
            <Download size={20} />
          </button>
        )}

        {/* Forward button — available to everyone */}
        <button className="action-btn" onClick={() => setShowForward(true)} title="Forward">
          <Forward size={20} />
        </button>

        {/* Share link button — owner only */}
        {isOwner && (
          <button className="action-btn" onClick={handleShare} title="Share link" disabled={shareLoading}>
            <Share2 size={20} />
          </button>
        )}

        <button className="action-btn" onClick={() => setShowReactions(!showReactions)} title="React">
          <Smile size={20} />
        </button>

        {isOwner && (
          <button className="delete-btn" onClick={() => {
            deleteStatus(currentStatus._id)
            onClose()
          }}>
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Quick Reaction Bar */}
      {showReactions && (
        <div className="reaction-bar">
          {QUICK_REACTIONS.map((emoji) => (
            <button key={emoji} className="reaction-emoji" onClick={() => handleReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}

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

      {/* Share Link Panel */}
      {showSharePanel && (
        <div className="share-panel" onClick={() => setShowSharePanel(false)}>
          <div className="share-panel-content" onClick={e => e.stopPropagation()}>
            <h3>Share Status Link</h3>
            <p className="share-panel-desc">Anyone with this link can view this status for 24 hours.</p>
            <div className="share-link-row">
              <input type="text" readOnly value={shareLink} className="share-link-input" />
              <button className="share-copy-btn" onClick={handleCopyLink}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div className="share-actions">
              {navigator.share && (
                <button className="share-native-btn" onClick={handleNativeShare}>
                  Share via...
                </button>
              )}
              <button className="share-close-btn" onClick={() => setShowSharePanel(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Dialog */}
      {showForward && (
        <ForwardDialog
          messageId={currentStatus._id}
          messageContent={currentStatus.textStatus?.text || currentStatus.caption || '[Status]'}
          conversationId={null}
          isStatusForward={true}
          statusData={currentStatus}
          onClose={() => setShowForward(false)}
        />
      )}
    </div>
  )
}

export default StatusViewer
