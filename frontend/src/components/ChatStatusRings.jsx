import React from 'react'
import { useStatusContext } from '../context/StatusContext'

const idOf = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || '')
  return String(value)
}

/**
 * Wraps children (typically an avatar image) with a green status ring
 * if the given userId has unviewed statuses.
 */
const ChatStatusRings = ({ userId, children }) => {
  const { statuses } = useStatusContext()

  if (!userId) return children

  const userStatuses = statuses.filter(s => {
    const sid = idOf(s.userId || s.user)
    return sid === String(userId)
  })

  const hasUnviewed = userStatuses.some(s => !s.isViewed)

  if (!hasUnviewed) return children

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      borderRadius: '50%',
      background: 'conic-gradient(#00a884 0deg, #00a884 360deg)',
      flexShrink: 0
    }}>
      <div style={{
        borderRadius: '50%',
        border: '2.5px solid #111b21',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {children}
      </div>
    </div>
  )
}

export default ChatStatusRings
