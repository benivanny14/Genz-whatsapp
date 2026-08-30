import React, { useState, useEffect } from 'react'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'

/**
 * Interactive poll / quiz overlay for statuses.
 * Renders poll question + options, allows voting, shows results with animated bars.
 */
const QuizOverlay = ({ status, onVote }) => {
  const [selected, setSelected] = useState([])
  const [hasVoted, setHasVoted] = useState(false)
  const [localPoll, setLocalPoll] = useState(null)

  const poll = localPoll || status?.poll
  if (!poll) return null

  const total = poll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 1

  // Check if user already voted (their option has votes)
  useEffect(() => {
    if (poll?.viewerHasVoted) {
      setHasVoted(true)
    }
  }, [poll?.viewerHasVoted])

  const handleVote = async () => {
    if (selected.length === 0 || hasVoted) return
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/${status._id}/poll/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ optionIds: selected })
      })
      const data = await res.json()
      if (data.success && data.poll) {
        setLocalPoll(data.poll)
        setHasVoted(true)
        onVote?.(data.poll)
      }
    } catch (err) {
      console.error('Poll vote error:', err)
    }
  }

  const toggleOption = (optId) => {
    if (hasVoted) return
    if (poll.allowMultiple) {
      setSelected(prev => prev.includes(optId) ? prev.filter(i => i !== optId) : [...prev, optId])
    } else {
      setSelected([optId])
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 140,
      left: 16,
      right: 16,
      background: 'rgba(17, 27, 33, 0.95)',
      borderRadius: 16,
      padding: 16,
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      zIndex: 12
    }}>
      <h4 style={{ color: '#fff', marginBottom: 12, fontSize: 15, fontWeight: 600 }}>
        {poll.question || poll.quizQuestion}
      </h4>

      {(poll.options || poll.quizOptions || []).map((opt) => {
        const percent = total > 0 ? Math.round(((opt.votes || 0) / total) * 100) : 0
        const isSelected = selected.includes(opt.id || opt._id)
        const optId = opt.id || opt._id

        return (
          <button
            key={optId}
            onClick={() => toggleOption(optId)}
            style={{
              width: '100%',
              marginBottom: 8,
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              background: isSelected && !hasVoted
                ? 'rgba(0, 168, 132, 0.25)'
                : 'rgba(255,255,255,0.05)',
              color: '#fff',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              cursor: hasVoted ? 'default' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Animated progress bar */}
            {hasVoted && (
              <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: `${percent}%`,
                background: isSelected
                  ? 'rgba(0, 168, 132, 0.3)'
                  : 'rgba(0, 168, 132, 0.12)',
                transition: 'width 0.6s ease',
                borderRadius: 10
              }} />
            )}
            <span style={{
              position: 'relative', zIndex: 1,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 14 }}>{opt.text}</span>
              {hasVoted && (
                <span style={{
                  color: '#00a884', fontWeight: 700, fontSize: 13,
                  minWidth: 40, textAlign: 'right'
                }}>
                  {percent}%
                </span>
              )}
            </span>
          </button>
        )
      })}

      {!hasVoted && selected.length > 0 && (
        <button
          onClick={handleVote}
          style={{
            width: '100%',
            padding: 12,
            background: '#00a884',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            marginTop: 4,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          Vote
        </button>
      )}

      {hasVoted && (
        <div style={{ textAlign: 'center', color: '#8696a0', fontSize: 12, marginTop: 4 }}>
          {total} vote{total !== 1 ? 's' : ''} • {poll.allowMultiple ? 'Multiple choice' : 'Single choice'}
        </div>
      )}
    </div>
  )
}

export default QuizOverlay
