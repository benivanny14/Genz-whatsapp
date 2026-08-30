import React, { useState, useEffect } from 'react'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'

/**
 * "Add Yours" chain overlay — shows a prompt card on a status
 * with a count of participants and a button to add your own.
 */
const AddYoursChain = ({ status, onAddYours }) => {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!status?.addYoursPrompt || !status?._id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const token = getAuthToken()
        const res = await fetch(`${resolveApiBase()}/status/${status._id}/add-yours-responses`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        })
        const data = await res.json()
        if (!cancelled && data.success) {
          setResponses(data.responses || [])
        }
      } catch (err) {
        // Silently handle — endpoint may not exist yet
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [status?.addYoursPrompt, status?._id])

  if (!status?.addYoursPrompt) return null

  const count = responses.length || status.addYoursCount || 0

  return (
    <div style={{
      position: 'absolute',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 16,
      padding: '14px 22px',
      textAlign: 'center',
      color: '#fff',
      zIndex: 12,
      maxWidth: '85%',
      boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9, marginBottom: 4 }}>
        📝 Add Yours
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
        {status.addYoursPrompt}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
        {count} {count === 1 ? 'person' : 'people'} added theirs
      </div>

      {/* Participant avatars */}
      {responses.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, gap: -4 }}>
          {responses.slice(0, 6).map((r, i) => (
            <img
              key={r._id || i}
              src={r.userId?.profilePicture || '/default-avatar.png'}
              alt=""
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.8)',
                marginLeft: i > 0 ? -6 : 0,
                objectFit: 'cover'
              }}
            />
          ))}
          {responses.length > 6 && (
            <span style={{
              fontSize: 10,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: -6,
              fontWeight: 600
            }}>
              +{responses.length - 6}
            </span>
          )}
        </div>
      )}

      <button
        onClick={() => onAddYours?.(status)}
        style={{
          background: '#fff',
          color: '#764ba2',
          border: 'none',
          borderRadius: 20,
          padding: '8px 20px',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          transition: 'transform 0.15s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {loading ? '...' : 'Add Yours'}
      </button>
    </div>
  )
}

export default AddYoursChain
