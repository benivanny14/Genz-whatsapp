import React, { useState, useMemo, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { Plus, Camera, RefreshCw, Volume2, VolumeX, Clock, Archive, Eye, ChevronRight, Lock } from 'lucide-react'
import StatusViewer from './StatusViewer'
import StatusArchive from './StatusArchive'
import StatusPrivacy from './StatusPrivacy'
import CreateStatus from './CreateStatus'
import './StatusList.css'

const idOf = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || '')
  return String(value)
}

// Format remaining time as "Xh Ym" or "Ym" or "<1m"
const formatRemainingTime = (expiresAt) => {
  if (!expiresAt) return ''
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return '<1m'
}

// Get conic gradient for status ring segments (WhatsApp-style)
const getStatusRingSegments = (statuses) => {
  if (!statuses || statuses.length === 0) return 'conic-gradient(#8696a0 0deg, #8696a0 100%)'
  const total = statuses.length
  const segmentSize = 360 / total
  const colors = statuses.map((s, i) => {
    const color = s.isViewed ? '#8696a0' : '#00a884'
    return `${color} ${i * segmentSize}deg ${(i + 1) * segmentSize}deg`
  })
  return `conic-gradient(${colors.join(', ')})`
}

const StatusList = ({ onViewArchive }) => {
  const { statuses, currentUser, loading, fetchStatuses } = useStatusContext()
  const [showCreate, setShowCreate] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [viewerUser, setViewerUser] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Group statuses by user (WhatsApp-style)
  const groupedStatuses = useMemo(() => {
    const groups = new Map()

    for (const status of statuses || []) {
      const statusUser = (status.userId && typeof status.userId === 'object') ? status.userId : status.user
      const userId = idOf(status.userId || status.user)
      if (!userId) continue

      if (!groups.has(userId)) {
        groups.set(userId, {
          userId,
          username: statusUser?.username || status.username || 'Unknown',
          profilePicture: statusUser?.profilePicture || '',
          isMuted: status.isMuted || false,
          statuses: [],
          totalViews: 0
        })
      }

      const group = groups.get(userId)
      group.isMuted = group.isMuted || status.isMuted
      group.statuses.push(status)
      group.totalViews += status.viewCount || status.views?.length || 0
    }

    // Separate own status from others
    const myStatus = []
    const recentUpdates = [] // unviewed
    const viewedUpdates = [] // viewed

    groups.forEach((group) => {
      if (group.userId === idOf(currentUser)) {
        myStatus.push(group)
      } else {
        const hasUnviewed = group.statuses.some(s => !s.isViewed)
        if (hasUnviewed) {
          recentUpdates.push(group)
        } else {
          viewedUpdates.push(group)
        }
      }
    })

    // Sort: unmuted first, then by most recent
    const sortByRecent = (a, b) => {
      if (a.isMuted !== b.isMuted) return a.isMuted ? 1 : -1
      const ta = new Date(a.statuses[0]?.createdAt || 0)
      const tb = new Date(b.statuses[0]?.createdAt || 0)
      return tb - ta
    }

    recentUpdates.sort(sortByRecent)
    viewedUpdates.sort(sortByRecent)

    return { myStatus, recentUpdates, viewedUpdates }
  }, [statuses, currentUser])

  const handleViewStatus = useCallback((group) => {
    setViewerUser(group)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatuses()
    setRefreshing(false)
  }, [fetchStatuses])

  const getUnviewedCount = useCallback((group) => {
    return group.statuses.filter(s => !s.isViewed).length
  }, [])

  if (loading) {
    return (
      <div className="status-list-loading">
        <RefreshCw size={24} className="animate-spin" />
        <p>Loading statuses...</p>
      </div>
    )
  }

  return (
    <div className="status-list">
      {/* Header */}
      <div className="status-list-header">
        <h2>Status</h2>
        <div className="header-actions">
          <button className="archive-link" onClick={() => setShowArchive(true)} title="Archived Status">
            <Archive size={20} />
          </button>
          <button className="privacy-link" onClick={() => setShowPrivacy(true)} title="Status Privacy">
            <Lock size={20} />
          </button>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* My Status */}
      <div className="my-status-section">
        <div className="my-status-item" onClick={() => groupedStatuses.myStatus.length > 0
          ? handleViewStatus({
              userId: currentUser?.id || currentUser?._id,
              username: currentUser?.username || 'My Status',
              profilePicture: currentUser?.profilePicture || '',
              statuses: groupedStatuses.myStatus[0]?.statuses || []
            })
          : setShowCreate(true)
        }>
          <div className="my-status-avatar">
            {groupedStatuses.myStatus.length > 0 && groupedStatuses.myStatus[0].statuses[0] ? (
              <>
                {groupedStatuses.myStatus[0].statuses[0].type === 'image' && (
                  <img src={groupedStatuses.myStatus[0].statuses[0].content} alt="My status" className="status-thumbnail" />
                )}
                {groupedStatuses.myStatus[0].statuses[0].type === 'video' && (
                  <video src={groupedStatuses.myStatus[0].statuses[0].content} className="status-thumbnail" muted />
                )}
                {groupedStatuses.myStatus[0].statuses[0].type === 'text' && (
                  <div className="status-thumbnail text-thumbnail" style={{ 
                    background: groupedStatuses.myStatus[0].statuses[0].textStatus?.backgroundColor || '#128C7E' 
                  }}>
                    <span>{groupedStatuses.myStatus[0].statuses[0].textStatus?.text?.substring(0, 20)}...</span>
                  </div>
                )}
              </>
            ) : (
              <img src={currentUser?.profilePicture || '/default-avatar.png'} alt="" />
            )}
            <div className="add-status-badge" onClick={(e) => { e.stopPropagation(); setShowCreate(true) }}>
              <Plus size={14} />
            </div>
          </div>
          <div className="my-status-info">
            <h4>My Status</h4>
            <p>
              {groupedStatuses.myStatus.length > 0
                ? `${groupedStatuses.myStatus[0].statuses.length} status${groupedStatuses.myStatus[0].statuses.length > 1 ? 'es' : ''}`
                : 'Tap to add status update'}
            </p>
          </div>
          {groupedStatuses.myStatus.length > 0 && (
            <div className="view-count">
              <Eye size={16} />
              <span>{groupedStatuses.myStatus[0].totalViews}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Updates (unviewed) */}
      {groupedStatuses.recentUpdates.length > 0 && (
        <div className="status-section">
          <h3 className="section-title">Recent updates</h3>
          {groupedStatuses.recentUpdates.map((group) => {
            const unviewed = getUnviewedCount(group)
            const hasUnviewed = unviewed > 0
            const firstStatus = group.statuses[0]

            return (
              <div
                key={group.userId}
                className="status-user-item"
                onClick={() => handleViewStatus(group)}
              >
                <div className={`status-ring ${hasUnviewed ? 'unviewed' : 'viewed'}`}
                  style={{ background: getStatusRingSegments(group.statuses) }}>
                  <img src={group.profilePicture || '/default-avatar.png'} alt="" className="status-avatar-inner" />
                </div>
                <div className="status-user-info">
                  <h4>{group.username}</h4>
                  <p>
                    {new Date(firstStatus?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {firstStatus?.expiresAt && (
                      <span className="status-remaining-time">
                        <Clock size={12} /> {formatRemainingTime(firstStatus.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
                {hasUnviewed && <div className="unviewed-badge">{unviewed}</div>}
                <ChevronRight size={20} color="#8696a0" />
              </div>
            )
          })}
        </div>
      )}

      {/* Viewed Updates */}
      {groupedStatuses.viewedUpdates.length > 0 && (
        <div className="status-section">
          <h3 className="section-title">Viewed updates</h3>
          {groupedStatuses.viewedUpdates.map((group) => {
            const firstStatus = group.statuses[0]

            return (
              <div
                key={group.userId}
                className="status-user-item viewed"
                onClick={() => handleViewStatus(group)}
              >
                <div className="status-ring viewed"
                  style={{ background: getStatusRingSegments(group.statuses) }}>
                  <img src={group.profilePicture || '/default-avatar.png'} alt="" className="status-avatar-inner" />
                </div>
                <div className="status-user-info">
                  <h4>{group.username}</h4>
                  <p>
                    {new Date(firstStatus?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {firstStatus?.expiresAt && (
                      <span className="status-remaining-time">
                        <Clock size={12} /> {formatRemainingTime(firstStatus.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Muted Section */}
      {groupedStatuses.recentUpdates.some(g => g.isMuted) || groupedStatuses.viewedUpdates.some(g => g.isMuted) ? (
        <div className="status-section muted-section">
          <h3 className="section-title">Muted</h3>
          {[...groupedStatuses.recentUpdates, ...groupedStatuses.viewedUpdates]
            .filter(g => g.isMuted)
            .map((group) => (
              <div
                key={group.userId}
                className="status-user-item"
                onClick={() => handleViewStatus(group)}
              >
                <div className="status-ring viewed"
                  style={{ background: getStatusRingSegments(group.statuses) }}>
                  <img src={group.profilePicture || '/default-avatar.png'} alt="" className="status-avatar-inner" />
                </div>
                <div className="status-user-info">
                  <h4>{group.username}</h4>
                  <p>
                    {group.statuses.length} status{group.statuses.length > 1 ? 'es' : ''}
                  </p>
                </div>
                <VolumeX size={16} className="muted-icon" />
              </div>
            ))
          }
        </div>
      ) : null}

      {/* Empty State */}
      {groupedStatuses.recentUpdates.length === 0 &&
        groupedStatuses.viewedUpdates.length === 0 &&
        groupedStatuses.myStatus.length === 0 && (
        <div className="status-empty">
          <Camera size={48} className="text-gray-500" />
          <p>No status updates yet</p>
          <span>Tap + to share a status</span>
        </div>
      )}

      {/* Floating Create Button */}
      <button className="fab-create-status" onClick={() => setShowCreate(true)}>
        <Camera size={24} />
      </button>

      {/* Modals */}
      {showCreate && <CreateStatus onClose={() => setShowCreate(false)} />}
      {showArchive && <StatusArchive onClose={() => setShowArchive(false)} onViewStatus={handleViewStatus} />}
      {showPrivacy && <StatusPrivacy onClose={() => setShowPrivacy(false)} />}
      {viewerUser && (
        <StatusViewer
          user={viewerUser}
          initialIndex={0}
          onClose={() => setViewerUser(null)}
        />
      )}
    </div>
  )
}

export default StatusList
