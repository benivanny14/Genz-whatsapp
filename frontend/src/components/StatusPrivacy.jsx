import React, { useState, useEffect } from 'react'
import { X, Check, Users, UserX, UserCheck, Download } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'
import './StatusPrivacy.css'

const StatusPrivacy = ({ onClose }) => {
  const [privacyType, setPrivacyType] = useState('contacts')
  const [contacts, setContacts] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoSaveStatus, setAutoSaveStatus] = useState(() => {
    return localStorage.getItem('auto_save_status') === 'true'
  })

  const toggleAutoSave = () => {
    const val = !autoSaveStatus
    setAutoSaveStatus(val)
    localStorage.setItem('auto_save_status', String(val))
  }

  const API_BASE = resolveApiBase()
  const authHeaders = () => {
    const token = getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }

  useEffect(() => {
    fetchPrivacy()
    fetchContacts()
  }, [])

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

  const savePrivacy = async () => {
    const payload = { type: privacyType }
    
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

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Download size={20} color="#00a884" />
              <div>
                <span style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '500' }}>Auto-Save Incoming Statuses</span>
                <small style={{ color: '#8696a0', fontSize: '12px' }}>Automatically save status photos/videos to device</small>
              </div>
            </div>
            <input 
              type="checkbox"
              checked={autoSaveStatus}
              onChange={toggleAutoSave}
              style={{ accentColor: '#00a884', width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {(privacyType === 'contacts_except' || privacyType === 'only_share_with') && (
          <div className="contacts-list">
            <h4>{privacyType === 'contacts_except' ? 'Hide status from' : 'Share status with'}</h4>
            {loading ? (
              <p>Loading contacts...</p>
            ) : (
              contacts.map(contact => (
                <div 
                  key={contact._id || contact.user} 
                  className="contact-item"
                  onClick={() => toggleUser(contact.user || contact._id)}
                >
                  <img src={contact.profilePicture || '/default-avatar.png'} alt="" />
                  <span>{contact.savedName || contact.username}</span>
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
