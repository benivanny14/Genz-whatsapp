import React, { useState, useEffect } from 'react'

/**
 * Live countdown overlay — displays days:hours:minutes:seconds
 * counting down to a target date/time.
 */
const CountdownOverlay = ({ targetDate, targetTime, label }) => {
  const calculateTimeLeft = () => {
    try {
      const target = new Date(`${targetDate}T${targetTime || '23:59:59'}`)
      const diff = target - new Date()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false
      }
    } catch {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    }
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft)

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [targetDate, targetTime])

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      color: '#fff',
      textShadow: '0 2px 20px rgba(0,0,0,0.6)',
      zIndex: 12,
      pointerEvents: 'none'
    }}>
      {timeLeft.expired ? (
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          background: 'rgba(0,0,0,0.5)',
          padding: '12px 24px',
          borderRadius: 16,
          backdropFilter: 'blur(8px)'
        }}>
          ⏰ Time's up!
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 8
          }}>
            {[
              { val: timeLeft.days, lbl: 'D' },
              { val: timeLeft.hours, lbl: 'H' },
              { val: timeLeft.minutes, lbl: 'M' },
              { val: timeLeft.seconds, lbl: 'S' }
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: '8px 12px',
                minWidth: 48,
                border: '1px solid rgba(255,255,255,0.15)'
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1
                }}>
                  {pad(val)}
                </div>
                <div style={{
                  fontSize: 10,
                  opacity: 0.7,
                  marginTop: 2,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  {lbl}
                </div>
              </div>
            ))}
          </div>
          {label && (
            <div style={{
              fontSize: 14,
              opacity: 0.8,
              fontWeight: 500
            }}>
              {label}
            </div>
          )}
          <div style={{
            fontSize: 11,
            opacity: 0.5,
            marginTop: 4
          }}>
            Countdown
          </div>
        </>
      )}
    </div>
  )
}

export default CountdownOverlay
