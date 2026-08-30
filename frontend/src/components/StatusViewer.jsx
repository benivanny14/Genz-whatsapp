import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { getSocket } from '../services/socket'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'
import { X, Volume2, VolumeX, Send, Eye, EyeOff, CheckCheck, Heart, Trash2, ChevronLeft, ChevronRight, Pause, Play, Forward, Download, Smile, Share2, Link2, Copy, Check, Music, Mic, BarChart3, QrCode, Clock, RotateCcw } from 'lucide-react'
import ReactPlayer from 'react-player'
import ForwardDialog from './ForwardDialog'
import StatusAnalytics from './StatusAnalytics'
import AddYoursChain from './AddYoursChain'
import CountdownOverlay from './CountdownOverlay'
import { LocationStickerOverlay } from './LocationSticker'
import QuizOverlay from './QuizOverlay'
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

const idOf = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || '')
  return String(value)
}

const StatusViewer = ({ user, initialIndex = 0, onClose, onReshare }) => {
  const { currentUser, viewStatus, deleteStatus, cacheStatusMedia, getCachedStatus } = useStatusContext()
  const socket = getSocket()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [ghostMode, setGhostMode] = useState(() => {
    try {
      return localStorage.getItem('ghost_mode') === 'true'
    } catch { return false }
  })
  const [markedSeen, setMarkedSeen] = useState(false)
  const [copyToast, setCopyToast] = useState('')
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState([])
  const [viewerSearchQuery, setViewerSearchQuery] = useState('')
  const [duration, setDuration] = useState(5000) // default 5s for images
  const [remainingTime, setRemainingTime] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const [showForward, setShowForward] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrData, setQrData] = useState('')
  const [pollVotes, setPollVotes] = useState({}) // { statusId: selectedOptionIds }
  const [showPollResults, setShowPollResults] = useState(false)
  const progressRef = useRef(null)
  const containerRef = useRef(null)
  const touchStartX = useRef(0)
  const voiceAudioRef = useRef(null)
  const touchStartY = useRef(0)
  const lastTapTime = useRef(0)
  const [scale, setScale] = useState(1)
  const [heartAnim, setHeartAnim] = useState(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false)

  // Close all overlay modals to prevent stacking
  const closeAllModals = useCallback(() => {
    setShowViewers(false)
    setShowSharePanel(false)
    setShowQRCode(false)
    setShowAnalytics(false)
    setShowForward(false)
    setShowReactions(false)
  }, [])

  const statuses = user?.statuses || []
  const currentStatus = statuses[currentIndex]
  const currentUserId = idOf(currentUser)
  const statusOwnerId = idOf(currentStatus?.userId || currentStatus?.user)
  const statusOwner = (currentStatus?.userId && typeof currentStatus.userId === 'object') ? currentStatus.userId : currentStatus?.user
  const isOwner = Boolean(currentUserId && statusOwnerId && currentUserId === statusOwnerId)

  // Update remaining time every 30 seconds
  useEffect(() => {
    if (!currentStatus?.expiresAt) return
    const update = () => setRemainingTime(formatRemainingTime(currentStatus.expiresAt))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [currentStatus?.expiresAt])

  // Mark as viewed (skip if Ghost Mode is active) & Auto-Save & Anti-Delete Cache
  useEffect(() => {
    if (currentStatus && !isOwner) {
      if (!currentStatus.isViewed && !ghostMode) {
        viewStatus(currentStatus._id)
      }
      // Anti-Delete: cache media so it survives server-side deletion
      const isMedia = currentStatus.type === 'image' || currentStatus.type === 'video'
      if (isMedia && currentStatus.content) {
        cacheStatusMedia(currentStatus)
      }
      const autoSave = localStorage.getItem('auto_save_status') === 'true'
      if (autoSave && isMedia && currentStatus.content) {
        handleSave()
        setCopyToast('Status media saved automatically 📥')
        setTimeout(() => setCopyToast(''), 3000)
      }
    }
  }, [currentStatus, isOwner, viewStatus, ghostMode, cacheStatusMedia])

  // Anti-delete: get cached status if the current one is deleted
  const cachedDeleted = (currentStatus?.isDeleted || currentStatus?.isRevoked)
    ? getCachedStatus(currentStatus?._id)
    : null

  // Effective status: use cached if deleted, otherwise live
  const effectiveStatus = cachedDeleted || currentStatus

  const handleManualMarkSeen = () => {
    if (currentStatus?._id && !isOwner) {
      viewStatus(currentStatus._id)
      setMarkedSeen(true)
      setCopyToast('Marked as seen ✔✔')
      setTimeout(() => setCopyToast(''), 2000)
    }
  }

  const handleCopyContent = async () => {
    const textToCopy = currentStatus?.caption || currentStatus?.content || currentStatus?.textStatus?.text || ''
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopyToast('Text copied to clipboard!')
      setTimeout(() => setCopyToast(''), 2000)
    } catch (err) {
      console.error('Copy error:', err)
    }
  }

  // Progress timer — syncs with actual content duration
  useEffect(() => {
    if (isPaused || showReply || showViewers) return

    // Determine actual duration based on status type
    const actualDuration = currentStatus?.type === 'video'
      ? (duration || 30000) // Video uses player duration or 30s fallback
      : currentStatus?.type === 'voice' || currentStatus?.type === 'audio'
      ? 10000 // Audio: 10 seconds
      : currentStatus?.type === 'text'
      ? 7000 // Text: 7 seconds
      : 5000 // Image: 5 seconds

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goNext()
          return 0
        }
        return prev + (100 / (actualDuration / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, duration, currentStatus?.type, showReply, showViewers])

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

  // Keyboard Shortcuts (ArrowRight, ArrowLeft, Space, Esc, M)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Close sub-modals first, then the viewer itself
        if (showViewers) { setShowViewers(false); setIsPaused(false); return }
        if (showSharePanel) { setShowSharePanel(false); return }
        if (showQRCode) { setShowQRCode(false); return }
        if (showAnalytics) { setShowAnalytics(false); return }
        if (showForward) { setShowForward(false); return }
        if (showReactions) { setShowReactions(false); return }
        if (showReply) { setShowReply(false); return }
        onClose()
        return
      }
      if (showReply || showViewers || showSharePanel || showQRCode || showAnalytics || showForward) return
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === ' ') { e.preventDefault(); setIsPaused(prev => !prev); }
      else if (e.key === 'm' || e.key === 'M') setIsMuted(prev => !prev)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onClose, showReply, showViewers, showSharePanel, showQRCode, showAnalytics, showForward, showReactions])




  // Replay: reset to first status of this user
  const handleReplay = useCallback(() => {
    setCurrentIndex(0)
    setProgress(0)
    setIsPaused(false)
  }, [])

  // One-Click & Batch Download
  const handleDownloadStatus = async (statusToDownload) => {
    const s = statusToDownload || currentStatus
    if (!s) return
    const url = s.content || s.mediaUrl || ''
    if (!url) return
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `genz-status-${s._id || Date.now()}.${s.type === 'video' ? 'mp4' : 'jpg'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setCopyToast('Status downloaded!')
      setTimeout(() => setCopyToast(''), 2500)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  const handleBatchDownloadAll = async () => {
    if (!statuses.length) return
    setCopyToast(`Downloading ${statuses.length} statuses...`)
    for (const s of statuses) {
      await handleDownloadStatus(s)
      await new Promise(r => setTimeout(r, 400))
    }
    setCopyToast('Batch download complete!')
    setTimeout(() => setCopyToast(''), 2500)
  }

  // Screenshot blocking (PrintScreen key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        setShowScreenshotWarning(true)
        fetch(`${resolveApiBase()}/status/${currentStatus?._id}/screenshot-attempt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
          }
        }).catch(() => {})
        setTimeout(() => setShowScreenshotWarning(false), 2000)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentStatus?._id])

  // Touch handlers for swipe (horizontal) + swipe down to close + double tap
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start - record distance
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      )
      touchStartY.current = dist
      return
    }
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsPaused(true)
  }

  const handleTouchMove = (e) => {
    // Pinch-to-zoom for images
    if (e.touches.length === 2 && (currentStatus?.type === 'image')) {
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      )
      const newScale = Math.min(Math.max(dist / (touchStartY.current || 200), 1), 3)
      setScale(newScale)
    }
  }

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const diffX = touchStartX.current - endX
    const diffY = touchStartY.current - endY
    setIsPaused(false)

    // Reset pinch zoom
    if (scale > 1) {
      setScale(1)
      return
    }

    // Swipe down to close (vertical swipe > 100px)
    if (diffY < -100 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose()
      return
    }

    // Horizontal swipe
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) goNext()
      else goPrev()
    }
  }

  // Double-tap to like with heart animation
  const handleDoubleTap = (e) => {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      handleReaction('❤️')
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX || e.touches?.[0]?.clientX || rect.width / 2) - rect.left
      const y = (e.clientY || e.touches?.[0]?.clientY || rect.height / 2) - rect.top
      setHeartAnim({ x, y, id: Date.now() })
      setTimeout(() => setHeartAnim(null), 1000)
    }
    lastTapTime.current = now
  }

  const handleSendReply = async () => {
    const message = replyText.trim()
    if (!message || !currentStatus?._id) return
    setIsPaused(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/${currentStatus._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reply')
      }
      setReplyText('')
      setShowReply(false)
    } catch (err) {
      console.error('Status reply error:', err)
      if (socket) {
        socket.emit('reply_to_status', {
          statusId: currentStatus._id,
          ownerId: statusOwnerId,
          senderId: currentUserId,
          message
        })
        setReplyText('')
        setShowReply(false)
      }
    } finally {
      setIsPaused(false)
    }
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
    closeAllModals()
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

  const handleShowQR = async () => {
    if (!currentStatus?._id) return
    closeAllModals()
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/${currentStatus._id}/qr`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      const data = await res.json()
      if (data.success && data.shareUrl) {
        setQrData(data.shareUrl)
        setShowQRCode(true)
      }
    } catch (err) {
      console.error('QR error:', err)
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
          title: `${statusOwner?.username || currentStatus.username || 'Someone'}'s Status`,
          text: currentStatus.textStatus?.text || 'Check out this status',
          url: shareLink
        })
      } catch (err) {
        // User cancelled
      }
    }
  }

  // Poll vote handler
  const handlePollVote = async (optionId) => {
    if (!currentStatus?._id || !currentStatus.poll) return
    const alreadyVoted = pollVotes[currentStatus._id]
    if (alreadyVoted) return // already voted
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/${currentStatus._id}/poll/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ optionIds: [optionId] })
      })
      const data = await res.json()
      if (data.success) {
        setPollVotes(prev => ({ ...prev, [currentStatus._id]: [optionId] }))
      }
    } catch (err) {
      console.error('Poll vote error:', err)
    }
  }

  const QUICK_REACTIONS = ['❤️', '🙏', '😂', '😮', '😢', '👍', '👎', '🔥']

  const fetchViewers = async () => {
    if (!isOwner) return
    closeAllModals()
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

  const isMentioned = Boolean(
    currentUser?.username && (
      currentStatus?.collabUsername === currentUser.username ||
      currentStatus?.caption?.includes(`@${currentUser.username}`) ||
      currentStatus?.content?.includes(`@${currentUser.username}`)
    )
  )

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
            <img src={statusOwner?.profilePicture || '/default-avatar.png'} alt="" />
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                {statusOwner?.username || currentStatus.username || 'Status'}
                {currentStatus.collabUsername && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>
                    @{currentStatus.collabUsername}
                  </span>
                )}
              </h4>
              <span>{new Date(currentStatus.createdAt).toLocaleTimeString()}{remainingTime ? ` • ${remainingTime}` : ''}</span>
            </div>
          </div>
          <div className="viewer-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {copyToast && (
              <span style={{ background: '#00a884', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {copyToast}
              </span>
            )}
            <button onClick={handleCopyContent} title="Copy Text / Caption">
              <Copy size={20} />
            </button>
            <button onClick={() => {
              const next = !ghostMode
              setGhostMode(next)
              try { localStorage.setItem('ghost_mode', String(next)) } catch {}
            }} title={ghostMode ? 'Ghost View Mode Active' : 'Enable Ghost View'}>
              {ghostMode ? <EyeOff size={20} color="#00a884" /> : <Eye size={20} />}
            </button>
            {!isOwner && (
              <button onClick={handleManualMarkSeen} title="Mark as Seen ✔✔" style={{ color: markedSeen ? '#00a884' : '#ffffff' }}>
                <CheckCheck size={22} />
              </button>
            )}
            {(currentStatus.type === 'video' || currentStatus.type === 'voice' || currentStatus.type === 'audio') && (
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            )}
            <button onClick={onClose}><X size={24} /></button>
          </div>
        </div>
      </div>

      {/* Screenshot Warning — full-screen overlay that appears on screenshot attempt */}
      {showScreenshotWarning && (
        <div style={{
          position: 'absolute', inset: 0, background: '#000', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, animation: 'screenshotFlash 2s ease forwards'
        }}>
          <div style={{ fontSize: 48 }}>🚫</div>
          <div style={{ color: '#ff4444', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>
            Screenshots are blocked
          </div>
          <div style={{ color: '#8696a0', fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
            This status owner has disabled screenshots for privacy protection.
          </div>
        </div>
      )}
      <style>{`@keyframes screenshotFlash { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }`}</style>

      {/* Double-tap Heart Animation */}
      {heartAnim && (
        <div key={heartAnim.id} style={{
          position: 'absolute', left: heartAnim.x - 24, top: heartAnim.y - 24,
          zIndex: 99, pointerEvents: 'none',
          animation: 'heartBurst 1s ease-out forwards'
        }}>
          <Heart size={48} color="#ff0000" fill="#ff0000" />
        </div>
      )}

      {/* Content Area */}
      <div
        className="viewer-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Anti-Delete overlay */}
        {cachedDeleted && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)', color: '#ff6b6b', padding: '8px 16px',
            borderRadius: '20px', fontSize: '12px', fontWeight: 600, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
          }}>
            🚫 Hii status imefutwa (Anti-Delete)
          </div>
        )}

        {currentStatus.type === 'text' && (
          <div className="text-status-display" style={{ 
            backgroundColor: currentStatus.textStatus?.backgroundColor || '#128C7E',
            color: currentStatus.textStatus?.fontColor || '#FFFFFF'
          }}>
            <h1>{currentStatus.textStatus?.text}</h1>
          </div>
        )}

        {currentStatus.type === 'image' && (
          <img
            src={currentStatus.content}
            alt="status"
            className="status-media"
            style={{ transform: `scale(${scale})`, transition: scale !== 1 ? 'transform 0.1s' : 'none', touchAction: 'none' }}
          />
        )}

        {currentStatus.type === 'video' && (
          <>
            <ReactPlayer
              url={currentStatus.content}
              playing={!isPaused}
              muted={isMuted}
              loop={false}
              width="100%"
              height="100%"
              onDuration={d => setDuration(d * 1000)}
              onEnded={goNext}
              onError={(e) => { if (e?.type !== 'AbortError') console.warn('Video error:', e) }}
              style={{ objectFit: 'cover' }}
            />
            {/* Background music player */}
            {currentStatus.music?.file && (
              <audio
                src={currentStatus.music.file}
                autoPlay={!isPaused}
                loop={false}
                muted={isMuted}
                onEnded={goNext}
                onError={(e) => { if (e?.type !== 'AbortError') console.warn('Music error:', e) }}
              />
            )}
          </>
        )}

        {/* Voice / Audio Status */}
        {(currentStatus.type === 'voice' || currentStatus.type === 'audio') && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d1f35 0%, #1a1a2e 50%, #16213e 100%)',
            padding: '32px'
          }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'rgba(0,168,132,0.15)', border: '3px solid rgba(0,168,132,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
            }}>
              <Mic size={48} color="#00a884" />
            </div>
            <p style={{ color: '#8696a0', fontSize: '14px', marginBottom: '16px' }}>Voice Status</p>
            <audio
              ref={voiceAudioRef}
              src={currentStatus.content}
              controls
              autoPlay={!isPaused}
              onEnded={goNext}
              onError={(e) => { if (e?.type !== 'AbortError') console.warn('Voice error:', e) }}
              style={{ width: '85%', maxWidth: '340px', borderRadius: '24px', height: '40px' }}
            />
            {currentStatus.caption && (
              <p style={{ color: '#fff', fontSize: '13px', marginTop: '16px', textAlign: 'center', opacity: 0.8 }}>
                {currentStatus.caption}
              </p>
            )}
          </div>
        )}

        {/* Music Tag */}
        {currentStatus.music && (
          <div className="music-tag">
            <Music size={14} />
            <span>{currentStatus.music.title || 'Music'}</span>
          </div>
        )}

        {/* Poll Display */}
        {currentStatus.poll && currentStatus.poll.question && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            borderRadius: '16px', padding: '16px', width: '85%', maxWidth: '340px',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <BarChart3 size={16} color="#00a884" />
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{currentStatus.poll.question}</span>
            </div>
            {(currentStatus.poll.options || []).map((opt) => {
              const totalVotes = currentStatus.poll.totalVotes || 1
              const pct = Math.round(((opt.votes || 0) / totalVotes) * 100)
              const voted = pollVotes[currentStatus._id]?.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => handlePollVote(opt.id)}
                  disabled={!isOwner && voted !== undefined}
                  style={{
                    display: 'block', width: '100%', marginBottom: '6px',
                    background: voted ? 'rgba(0,168,132,0.25)' : 'rgba(255,255,255,0.08)',
                    border: voted ? '1px solid #00a884' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px',
                    cursor: voted ? 'default' : 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {voted && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`,
                      background: 'rgba(0,168,132,0.15)', borderRadius: '10px'
                    }} />
                  )}
                  <span style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{opt.text}</span>
                    {voted && <span style={{ color: '#00a884', fontWeight: '600' }}>{pct}%</span>}
                  </span>
                </button>
              )
            })}
            <div style={{ color: '#8696a0', fontSize: '11px', marginTop: '4px' }}>
              {currentStatus.poll.totalVotes || 0} vote{(currentStatus.poll.totalVotes || 0) !== 1 ? 's' : ''}
              {currentStatus.poll.allowMultiple && ' • Multiple selections allowed'}
            </div>
          </div>
        )}

        {/* Add Yours Chain Overlay */}
        {effectiveStatus?.addYoursPrompt && (
          <AddYoursChain
            status={effectiveStatus}
            onAddYours={(s) => {
              // Navigate to create status with Add Yours prompt
              setCopyToast('Create your own status with this prompt!')
              setTimeout(() => setCopyToast(''), 2000)
            }}
          />
        )}

        {/* Countdown Overlay */}
        {effectiveStatus?.countdownDate && (
          <CountdownOverlay
            targetDate={effectiveStatus.countdownDate}
            targetTime={effectiveStatus.countdownTime}
            label={effectiveStatus.countdownLabel || 'Event starts in'}
          />
        )}

        {/* Location Sticker Overlay */}
        {effectiveStatus?.location && (
          <LocationStickerOverlay location={effectiveStatus.location} />
        )}

        {/* Quiz / Poll Overlay */}
        {effectiveStatus?.poll && (
          <QuizOverlay
            status={effectiveStatus}
            onVote={(updatedPoll) => {
              // Update local poll state
              if (updatedPoll) {
                const updated = { ...effectiveStatus, poll: updatedPoll }
                const idx = statuses.findIndex(s => s._id === effectiveStatus._id)
                if (idx >= 0) {
                  const newStatuses = [...statuses]
                  newStatuses[idx] = updated
                  // No setter for statuses directly in viewer — just update view
                }
              }
            }}
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
          <div style={{ display: 'flex', gap: '3px' }}>
            <button className="view-count-btn" onClick={fetchViewers}>
              <Eye size={14} />
              <span>{currentStatus.viewCount || 0}</span>
            </button>
            <button
              className="view-count-btn"
              onClick={() => { closeAllModals(); setShowAnalytics(true); }}
              title="View Analytics"
              style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: 'none', color: '#fff', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <BarChart3 size={16} />
            </button>
          </div>
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
            <Send size={16} />
          </button>
        </div>

        <button
          className="action-btn"
          onClick={handleSave}
          title={isOwner ? 'Save My Status' : 'Save Status'}
        >
          <Download size={16} />
        </button>

        {/* Forward button — available to everyone */}
        <button className="action-btn" onClick={() => { closeAllModals(); setShowForward(true); }} title="Forward">
          <Forward size={16} />
        </button>

        {/* Share link button — owner only */}
        {isOwner && (
          <button className="action-btn" onClick={handleShare} title="Share link" disabled={shareLoading}>
            <Share2 size={16} />
          </button>
        )}

        {/* QR Code button — owner only */}
        {isOwner && (
          <button className="action-btn" onClick={handleShowQR} title="Show QR Code">
            <QrCode size={16} />
          </button>
        )}

        <button className="action-btn" onClick={() => handleReaction('❤️')} title="Like Status (1-Tap)" style={{ color: '#00a884' }}>
          <Heart size={16} fill="#00a884" />
        </button>

        <button
          className="action-btn"
          onClick={() => { if (!showMoreMenu) closeAllModals(); setShowMoreMenu(!showMoreMenu); }}
          title="More"
        >
          <Smile size={16} />
        </button>

        {isOwner && (
          <button className="delete-btn" onClick={() => {
            deleteStatus(currentStatus._id)
            onClose()
          }}>
            <Trash2 size={16} />
          </button>
        )}

        {/* Replay button */}
        {currentIndex === statuses.length - 1 && (
          <button
            className="action-btn"
            onClick={handleReplay}
            title="Replay from start"
            style={{ color: '#00a884' }}
          >
            <RotateCcw size={16} />
          </button>
        )}

        {/* Expanded More Menu */}
        {showMoreMenu && (
          <div className="more-menu" style={{
            position: 'absolute', bottom: '60px', right: '8px',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            borderRadius: '16px', padding: '8px', minWidth: '160px',
            border: '1px solid rgba(255,255,255,0.15)', zIndex: 50
          }}>
            <button onClick={() => { handleSave(); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
              <Download size={16} /> Save
            </button>
            <button onClick={() => { closeAllModals(); setShowForward(true); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
              <Forward size={16} /> Forward
            </button>
            {isOwner && (
              <button onClick={() => { handleShare(); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
                <Share2 size={16} /> Share Link
              </button>
            )}
            {isOwner && (
              <button onClick={() => { handleShowQR(); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
                <QrCode size={16} /> QR Code
              </button>
            )}
            <button onClick={() => { if (!showReactions) closeAllModals(); setShowReactions(!showReactions); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '8px' }}>
              <Smile size={16} /> React
            </button>
            {isMentioned && typeof onReshare === 'function' && (
              <button onClick={() => { onReshare(currentStatus); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'rgba(0,168,132,0.3)', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: '13px', fontWeight: 600, borderRadius: '8px' }}>
                🔄 Reshare to My Status
              </button>
            )}
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Viewed by {viewers.length}</h3>
              <input 
                type="text" 
                placeholder="Search viewer..." 
                value={viewerSearchQuery}
                onChange={(e) => setViewerSearchQuery(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '14px', padding: '4px 10px', color: '#fff', fontSize: '12px', width: '130px' }}
              />
            </div>
            {viewers
              .filter(v => (v.userId?.username || '').toLowerCase().includes(viewerSearchQuery.toLowerCase()))
              .map((v, i) => (
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

      {/* QR Code Modal */}
      {showQRCode && qrData && (
        <div className="viewers-modal" onClick={() => setShowQRCode(false)}>
          <div className="viewers-content" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>Scan to View Status</h3>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=00a884`}
                alt="QR Code"
                style={{ width: '200px', height: '200px', borderRadius: '8px' }}
              />
            </div>
            <p style={{ color: '#8696a0', fontSize: '12px', textAlign: 'center', maxWidth: '280px' }}>
              Anyone with this QR code can view this status until it expires.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=00a884`)
                    const blob = await response.blob()
                    const blobUrl = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = blobUrl
                    link.download = `status-qr-${currentStatus._id}.png`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  } catch (err) { console.error(err) }
                }}
                style={{ background: '#00a884', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Download QR
              </button>
              <button
                onClick={() => setShowQRCode(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && currentStatus && (
        <StatusAnalytics statusId={currentStatus._id} onClose={() => setShowAnalytics(false)} />
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
