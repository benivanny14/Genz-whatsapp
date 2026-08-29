import React, { useState, useEffect } from 'react'
import { X, Eye, Heart, MessageCircle, Camera, Share2, Clock, TrendingUp, BarChart3 } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'

const HOURS_LABELS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px',
    border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color }}>
      {icon}
      <span style={{ color: '#8696a0', fontSize: '11px' }}>{label}</span>
    </div>
    <span style={{ color: '#e9edef', fontSize: '24px', fontWeight: 'bold' }}>{value}</span>
  </div>
)

const StatusAnalytics = ({ statusId, onClose }) => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const token = getAuthToken()
      const res = await fetch(`${resolveApiBase()}/status/analytics/${statusId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      const data = await res.json()
      if (data.success) setAnalytics(data.analytics)
    } catch (err) {
      console.error('Fetch analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!statusId) return
    fetchAnalytics()
  }, [statusId])

  const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}${ampm}`
  }

  const maxBarHeight = analytics ? Math.max(...Object.values(analytics.hourDistribution || {}), 1) : 1

  return (
    <div className="privacy-overlay" style={{ zIndex: 30 }}>
      <div className="privacy-container" style={{ maxWidth: '420px', maxHeight: '85vh' }}>
        <div className="privacy-header">
          <button onClick={onClose}><X size={20} /></button>
          <h3><BarChart3 size={18} /> Status Insights</h3>
          <div />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8696a0' }}>Loading analytics...</div>
        ) : !analytics ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8696a0' }}>No analytics data available</div>
        ) : (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 60px)', padding: '16px' }}>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <StatCard icon={<Eye size={20} />} label="Views" value={analytics.views} color="#00a884" />
              <StatCard icon={<Eye size={20} />} label="Unique" value={analytics.uniqueViews} color="#53bdeb" />
              <StatCard icon={<Heart size={20} />} label="Reactions" value={analytics.reactions} color="#ef4444" />
              <StatCard icon={<MessageCircle size={20} />} label="Replies" value={analytics.replies} color="#f59e0b" />
              <StatCard icon={<Camera size={20} />} label="Screenshots" value={analytics.screenshots} color="#a855f7" />
              <StatCard icon={<Share2 size={20} />} label="Forwards" value={analytics.forwards} color="#22c55e" />
            </div>

            {/* Peak Time */}
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px',
              marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={16} color="#00a884" />
                <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: 600 }}>Peak Viewing Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ color: '#00a884', fontSize: '28px', fontWeight: 'bold' }}>
                  {formatHour(analytics.peakHour)}
                </span>
                <span style={{ color: '#8696a0', fontSize: '13px' }}>
                  ({analytics.peakCount} views)
                </span>
              </div>
            </div>

            {/* Hour Distribution Chart */}
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px',
              marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock size={16} color="#53bdeb" />
                <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: 600 }}>Views by Hour</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px' }}>
                {HOURS_LABELS.map((label, i) => {
                  const count = analytics.hourDistribution?.[i] || 0
                  const height = Math.max((count / maxBarHeight) * 100, count > 0 ? 4 : 0)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        title={`${label}: ${count} views`}
                        style={{
                          width: '100%', height: `${height}px`, minHeight: count > 0 ? '4px' : '0',
                          background: count > 0
                            ? `linear-gradient(to top, #00a884, ${i === analytics.peakHour ? '#53bdeb' : '#00a884'})`
                            : 'rgba(255,255,255,0.08)',
                          borderRadius: '2px 2px 0 0', transition: 'height 0.3s'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: '#667781', fontSize: '9px' }}>0:00</span>
                <span style={{ color: '#667781', fontSize: '9px' }}>6:00</span>
                <span style={{ color: '#667781', fontSize: '9px' }}>12:00</span>
                <span style={{ color: '#667781', fontSize: '9px' }}>18:00</span>
                <span style={{ color: '#667781', fontSize: '9px' }}>23:00</span>
              </div>
            </div>

            {/* Reaction Breakdown */}
            {Object.keys(analytics.reactionBreakdown || {}).length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Heart size={16} color="#ef4444" />
                  <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: 600 }}>Reactions</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {Object.entries(analytics.reactionBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([emoji, count]) => (
                      <div key={emoji} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '6px 12px'
                      }}>
                        <span style={{ fontSize: '18px' }}>{emoji}</span>
                        <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: 600 }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusAnalytics
