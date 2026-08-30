import React from 'react'
import { Plus } from 'lucide-react'

const idOf = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || '')
  return String(value)
}

const StatusTray = ({ statuses = [], currentUser, onCreateStatus, onViewStatus }) => {
  if (!currentUser) return null

  // Get users with unviewed statuses (excluding own)
  const usersWithStatus = []
  const seen = new Set()

  for (const s of statuses) {
    const uid = idOf(s.userId || s.user)
    if (!uid || uid === idOf(currentUser)) continue
    if (seen.has(uid)) continue
    seen.add(uid)

    const user = (s.userId && typeof s.userId === 'object') ? s.userId : (s.user && typeof s.user === 'object') ? s.user : null
    usersWithStatus.push({
      ...s,
      _trayUser: user || { _id: uid, username: 'Unknown', profilePicture: '' },
      hasUnviewed: !s.isViewed
    })
  }

  // Sort: unviewed first
  usersWithStatus.sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0))

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px 16px',
      overflowX: 'auto',
      borderBottom: '1px solid #2a3942',
      background: '#111b21',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* My Status */}
      <div
        onClick={onCreateStatus}
        style={{
          flexShrink: 0,
          textAlign: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto' }}>
          <img
            src={currentUser.profilePicture || '/default-avatar.png'}
            alt=""
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #2a3942'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: '#00a884',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #111b21'
          }}>
            <Plus size={14} color="#fff" />
          </div>
        </div>
        <span style={{
          fontSize: 11,
          color: '#8696a0',
          display: 'block',
          marginTop: 4,
          maxWidth: 64,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          My Status
        </span>
      </div>

      {/* Other users with statuses */}
      {usersWithStatus.map((status) => {
        const user = status._trayUser
        return (
          <div
            key={idOf(status.userId || status.user)}
            onClick={() => onViewStatus && onViewStatus(status)}
            style={{
              flexShrink: 0,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              padding: 3,
              background: status.hasUnviewed
                ? 'conic-gradient(#00a884 0deg, #00a884 360deg)'
                : '2px solid #2a3942'
            }}>
              <img
                src={user.profilePicture || '/default-avatar.png'}
                alt=""
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid #111b21'
                }}
              />
            </div>
            <span style={{
              fontSize: 11,
              color: status.hasUnviewed ? '#e9edef' : '#8696a0',
              display: 'block',
              marginTop: 4,
              maxWidth: 64,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user.username || 'Unknown'}
            </span>
          </div>
        )
      })}

      {/* Empty state when no other statuses */}
      {usersWithStatus.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          color: '#8696a0',
          fontSize: 13
        }}>
          No status updates from your contacts
        </div>
      )}
    </div>
  )
}

export default StatusTray
