import React, { useState, useEffect } from 'react'
import { X, Check, Users, UserX, UserCheck, Search } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'
import './StatusPrivacy.css'

const StatusPrivacy = ({ onClose }) => {
  const [privacyType, setPrivacyType] = useState('contacts')
  const [contacts, setContacts] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [contactSearchQuery, setContactSearchQuery] = useState('')

  const API_BASE = resolveApiBase()
  const authHeaders = () => {
    const token = getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }

  const fetchPrivacy = async () => {
    try {
      const res = await fetch(`${API_BASE}/status/privacy`, { headers: authHeaders() })
      const data = await res.json()
      if (data.success) {
        setPrivacyType(data.type || 'contacts')
        setSelectedUsers([
          ...(data.allowedUsers || []),
          ...(data.exceptUsers || [])
        ].map(u => u._id || u))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
      const data = await res.json()
      setContacts(data.user?.contacts || [])
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrivacy()
    fetchContacts()
  }, [])

  const [replySettings, setReplySettings] = useState('everyone')
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [statusDuration, setStatusDuration] = useState(24)

  const savePrivacy = async () => {
    const payload = {
      type: privacyType,
      replySettings,
      isGhostMode,
      statusDuration
    }
    
    if (privacyType === 'only_share_with') {
      payload.allowedUsers = selectedUsers
      payload.exceptUsers = []
    } else if (privacyType === 'contacts_except') {
      payload.exceptUsers = selectedUsers
      payload.allowedUsers = []
    } else {
      payload.allowedUsers = []
      payload.exceptUsers = []
    }

    try {
      await fetch(`${API_BASE}/status/privacy`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="privacy-overlay">
      <div className="privacy-container">
        <div className="privacy-header">
          <button onClick={onClose}><X size={24} /></button>
          <h3>Status Privacy</h3>
          <button onClick={savePrivacy} className="save-btn">Done</button>
        </div>

        <div className="privacy-options">
          <label className={`privacy-option ${privacyType === 'contacts' ? 'selected' : ''}`}>
            <Users size={20} />
            <div>
              <span>My contacts</span>
              <small>Share with all your contacts</small>
            </div>
            <input 
              type="radio" 
              name="privacy" 
              checked={privacyType === 'contacts'} 
              onChange={() => setPrivacyType('contacts')}
            />
          </label>

          <label className={`privacy-option ${privacyType === 'contacts_except' ? 'selected' : ''}`}>
            <UserX size={20} />
            <div>
              <span>My contacts except...</span>
              <small>Share with all contacts except selected</small>
            </div>
            <input 
              type="radio" 
              name="privacy" 
              checked={privacyType === 'contacts_except'} 
              onChange={() => setPrivacyType('contacts_except')}
            />
          </label>

          <label className={`privacy-option ${privacyType === 'only_share_with' ? 'selected' : ''}`}>
            <UserCheck size={20} />
            <div>
              <span>Only share with...</span>
              <small>Only share with selected contacts</small>
            </div>
            <input 
              type="radio" 
              name="privacy" 
              checked={privacyType === 'only_share_with'} 
              onChange={() => setPrivacyType('only_share_with')}
            />
          </label>
        </div>

        {(privacyType === 'contacts_except' || privacyType === 'only_share_with') && (
          <div className="contacts-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <h4 style={{ padding: '12px 16px', color: '#8696a0', fontSize: '13px' }}>
              {privacyType === 'contacts_except' ? 'Hide status from' : 'Share status with'}
            </h4>
            
            {/* Search input */}
            <div style={{ padding: '0 16px 12px', position: 'sticky', top: 0, background: '#111b21', zIndex: 1 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0' }} />
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            {loading ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#8696a0' }}>Loading contacts...</p>
            ) : (
              contacts
                .filter(contact => {
                  const name = (contact.savedName || contact.username || '').toLowerCase()
                  return name.includes(contactSearchQuery.toLowerCase())
                })
                .map(contact => (
                <div 
                  key={contact._id || contact.user} 
                  className="contact-item"
                  onClick={() => toggleUser(contact.user || contact._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', minHeight: '48px' }}
                >
                  <img src={contact.profilePicture || '/default-avatar.png'} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} loading="lazy" />
                  <span style={{ flex: 1, color: '#e9edef' }}>{contact.savedName || contact.username}</span>
                  {selectedUsers.includes(contact.user || contact._id) && <Check size={18} color="#00a884" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusPrivacy
