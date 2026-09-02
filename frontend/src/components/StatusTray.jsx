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

    const userObj = (s.userId && typeof s.userId === 'object') ? s.userId : (s.user && typeof s.user === 'object') ? s.user : null
    // Use username/profilePicture from status directly (API returns them as top-level fields)
    const trayUser = userObj || {
      _id: uid,
      username: s.username || userObj?.username || 'Unknown',
      profilePicture: s.profilePicture || userObj?.profilePicture || ''
    }
    usersWithStatus.push({
      ...s,
      _trayUser: trayUser,
      hasUnviewed: !s.isViewed
    })
  }

  // Sort: unviewed first
  usersWithStatus.sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0))

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '6px 12px',
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
        <div style={{ position: 'relative', width: 52, height: 52, margin: '0 auto' }}>
          <img
            src={currentUser.profilePicture || '/default-avatar.svg'}
            alt=""
            style={{
              width: 46,
              height: 46,
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
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #111b21'
          }}>
            <Plus size={12} color="#fff" />
          </div>
        </div>
        <span style={{
          fontSize: 10,
          color: '#8696a0',
          display: 'block',
          marginTop: 2,
          maxWidth: 52,
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
              width: 52,
              height: 52,
              borderRadius: '50%',
              padding: 2,
              background: status.hasUnviewed
                ? 'conic-gradient(#00a884 0deg, #00a884 360deg)'
                : '2px solid #2a3942'
            }}>
              <img
                src={user.profilePicture || '/default-avatar.svg'}
                alt=""
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #111b21'
                }}
              />
            </div>
            <span style={{
              fontSize: 10,
              color: status.hasUnviewed ? '#e9edef' : '#8696a0',
              display: 'block',
              marginTop: 2,
              maxWidth: 52,
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
