import React, { useState, useRef, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { X, Type, Image, Video, Music, Scissors, Send, Volume2, Users, Check, UserX, UserCheck, Lock, Plus, Trash2 } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import './CreateStatus.css'

const TEXT_COLORS = [
  { bg: '#128C7E', font: '#FFFFFF' },
  { bg: '#FF6B6B', font: '#FFFFFF' },
  { bg: '#4ECDC4', font: '#FFFFFF' },
  { bg: '#45B7D1', font: '#FFFFFF' },
  { bg: '#96CEB4', font: '#FFFFFF' },
  { bg: '#FFEAA7', font: '#2D3436' },
  { bg: '#DDA0DD', font: '#FFFFFF' },
  { bg: '#2D3436', font: '#FFFFFF' }
]

const FONT_STYLES = [
  { id: 'sans', name: 'Sans-Serif', family: 'sans-serif' },
  { id: 'serif', name: 'Serif', family: 'serif' },
  { id: 'monospace', name: 'Monospace', family: 'monospace' },
  { id: 'cursive', name: 'cursive' },
  { id: 'gothic', name: 'Impact, sans-serif' }
]

const CreateStatus = ({ onClose }) => {
  const { createTextStatus, createMediaStatus } = useStatusContext()
  const [mode, setMode] = useState('select') // select | text | image | video | preview
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(TEXT_COLORS[0])
  const [fontIndex, setFontIndex] = useState(0)
  const [taggedContact, setTaggedContact] = useState('')
  const [isHd, setIsHd] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState('')
  
  // Multi-media queue & audience states
  const [mediaItems, setMediaItems] = useState([]) // [{ file, preview, type, caption, trimStart, trimEnd }]
  const [activeIndex, setActiveIndex] = useState(0)
  const [privacy, setPrivacy] = useState('contacts') // contacts | contacts_except | only_share_with | only_me
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showAudienceModal, setShowAudienceModal] = useState(false)
  const [contacts, setContacts] = useState([])

  const [caption, setCaption] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(30)
  const [musicFile, setMusicFile] = useState(null)
  const [musicStart, setMusicStart] = useState(0)
  const [musicEnd, setMusicEnd] = useState(15)
  const [musicVolume, setMusicVolume] = useState(0.5)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef(null)
  const ffmpegRef = useRef(null)

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = getAuthToken()
        const res = await fetch(`${resolveApiBase()}/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
        const data = await res.json()
        setContacts(data.user?.contacts || [])
      } catch (err) {
        console.error('Fetch contacts error:', err)
      }
    }
    fetchContacts()
  }, [])

  // Initialize FFmpeg
  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load()
      ffmpegRef.current = ffmpeg
    }
    return ffmpegRef.current
  }

  // Handle file selection (multiple)
  const handleFileSelect = (e, fallbackType) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newItems = files.map(file => {
      const isVideo = file.type.startsWith('video/') || fallbackType === 'video'
      return {
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        caption: '',
        trimStart: 0,
        trimEnd: isVideo ? 30 : 0
      }
    })

    setMediaItems(prev => {
      const updated = [...prev, ...newItems]
      const newActiveIdx = prev.length
      setActiveIndex(newActiveIdx)
      setMode(updated[newActiveIdx].type)
      return updated
    })
  }

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Trim video using FFmpeg.wasm
  const trimVideo = async () => {
    if (!mediaFile || trimEnd <= trimStart) return mediaFile
    
    setIsProcessing(true)
    try {
      const ffmpeg = await loadFFmpeg()
      const inputName = 'input' + mediaFile.name.substring(mediaFile.name.lastIndexOf('.'))
      const outputName = 'trimmed.mp4'
      
      await ffmpeg.writeFile(inputName, await fetchFile(mediaFile))
      
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', `${trimStart}`,
        '-t', `${trimEnd - trimStart}`,
        '-c', 'copy',
        outputName
      ])
      
      const data = await ffmpeg.readFile(outputName)
      const trimmedBlob = new Blob([data.buffer], { type: 'video/mp4' })
      const trimmedFile = new File([trimmedBlob], 'trimmed-status.mp4', { type: 'video/mp4' })
      
      setIsProcessing(false)
      return trimmedFile
    } catch (err) {
      console.error('Trim error:', err)
      setIsProcessing(false)
      return mediaFile
    }
  }

  // Mix audio with video
  const mixAudioWithVideo = async (videoFile, audioFile) => {
    if (!audioFile) return videoFile
    
    setIsProcessing(true)
    try {
      const ffmpeg = await loadFFmpeg()
      
      await ffmpeg.writeFile('video.mp4', await fetchFile(videoFile))
      await ffmpeg.writeFile('audio.mp3', await fetchFile(audioFile))
      
      await ffmpeg.exec([
        '-i', 'video.mp4',
        '-i', 'audio.mp3',
        '-ss', `${musicStart}`,
        '-t', `${musicEnd - musicStart}`,
        '-filter_complex',
        `[1:a]volume=${musicVolume}[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=3[outa]`,
        '-map', '0:v',
        '-map', '[outa]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'mixed.mp4'
      ])
      
      const data = await ffmpeg.readFile('mixed.mp4')
      const mixedBlob = new Blob([data.buffer], { type: 'video/mp4' })
      const mixedFile = new File([mixedBlob], 'status-with-music.mp4', { type: 'video/mp4' })
      
      setIsProcessing(false)
      return mixedFile
    } catch (err) {
      console.error('Mix error:', err)
      setIsProcessing(false)
      return videoFile
    }
  }

  const trimVideoForItem = async (item) => {
    if (!item.file || (item.trimEnd || 30) <= (item.trimStart || 0)) return item.file
    try {
      const ffmpeg = await loadFFmpeg()
      const ext = item.file.name.substring(item.file.name.lastIndexOf('.')) || '.mp4'
      const inputName = `input-${Date.now()}${ext}`
      const outputName = `trimmed-${Date.now()}.mp4`
      await ffmpeg.writeFile(inputName, await fetchFile(item.file))
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', `${item.trimStart || 0}`,
        '-t', `${(item.trimEnd || 30) - (item.trimStart || 0)}`,
        '-c', 'copy',
        outputName
      ])
      const data = await ffmpeg.readFile(outputName)
      const trimmedBlob = new Blob([data.buffer], { type: 'video/mp4' })
      return new File([trimmedBlob], `trimmed-${item.file.name}`, { type: 'video/mp4' })
    } catch (err) {
      console.error('Trim video item error:', err)
      return item.file
    }
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      const currentFont = FONT_STYLES[fontIndex]?.id || 'sans'
      const excludedUsers = privacy === 'contacts_except' ? selectedUsers : undefined
      const includedUsers = privacy === 'only_share_with' ? selectedUsers : undefined

      if (mode === 'text') {
        await createTextStatus({
          text,
          backgroundColor: selectedColor.bg,
          fontColor: selectedColor.font,
          fontStyle: currentFont,
          collabUsername: taggedContact.trim(),
          privacy,
          excludedUsers,
          includedUsers
        })
        onClose()
        return
      }

      const itemsToUpload = mediaItems.length > 0 ? mediaItems : (mediaFile ? [{ file: mediaFile, preview: mediaPreview, type: mode, caption, trimStart, trimEnd }] : [])
      if (itemsToUpload.length === 0) return

      for (let i = 0; i < itemsToUpload.length; i++) {
        const item = itemsToUpload[i]
        let finalFile = item.file

        if (item.type === 'video') {
          finalFile = await trimVideoForItem(item)
          if (musicFile && i === activeIndex) {
            finalFile = await mixAudioWithVideo(finalFile, musicFile)
          }
        }

        const formData = new FormData()
        formData.append('file', finalFile)
        formData.append('caption', item.caption || caption || '')
        formData.append('fontStyle', currentFont)
        if (taggedContact.trim()) formData.append('collabUsername', taggedContact.trim())
        formData.append('duration', (item.trimEnd || 30) - (item.trimStart || 0))
        formData.append('privacy', privacy)
        if (excludedUsers?.length) formData.append('excludedUsers', JSON.stringify(excludedUsers))
        if (includedUsers?.length) formData.append('includedUsers', JSON.stringify(includedUsers))

        if (musicFile && i === activeIndex) {
          formData.append('music', JSON.stringify({
            title: musicFile.name,
            startTime: musicStart,
            endTime: musicEnd,
            volume: musicVolume
          }))
        }

        await createMediaStatus(formData)
        if (i < itemsToUpload.length - 1) {
          await new Promise(r => setTimeout(r, 200))
        }
      }
      onClose()
    } catch (err) {
      console.error('Submit status error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (mode === 'select') {
    return (
      <div className="create-status-overlay">
        <div className="create-status-modal">
          <div className="create-header">
            <h3>Create Status</h3>
            <button onClick={onClose}><X size={24} /></button>
          </div>
          
          <div className="create-options">
            <button onClick={() => setMode('text')} className="create-option">
              <Type size={28} color="#00a884" />
              <span>Text</span>
            </button>
            
            <label className="create-option">
              <Image size={28} color="#00a884" />
              <span>Photo</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple
                hidden 
                onChange={(e) => handleFileSelect(e, 'image')} 
              />
            </label>
            
            <label className="create-option">
              <Video size={28} color="#00a884" />
              <span>Video</span>
              <input 
                type="file" 
                accept="video/*" 
                multiple
                hidden 
                onChange={(e) => handleFileSelect(e, 'video')} 
              />
            </label>
          </div>
        </div>
      </div>
    )
  }

  // Text Mode
  if (mode === 'text') {
    return (
      <div className="create-status-overlay" style={{ background: selectedColor.bg }}>
        <div className="text-create-container">
          <div className="create-toolbar top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <button onClick={() => setMode('select')}><X color={selectedColor.font} /></button>
            
            <button 
              type="button"
              className="font-selector-btn"
              onClick={() => setFontIndex((prev) => (prev + 1) % FONT_STYLES.length)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: selectedColor.font,
                border: 'none',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: FONT_STYLES[fontIndex].family
              }}
              title="Change Font Style"
            >
              Font: {FONT_STYLES[fontIndex].name}
            </button>

            <div className="color-picker">
              {TEXT_COLORS.map((c, i) => (
                <button 
                  key={i} 
                  className="color-dot" 
                  style={{ background: c.bg, border: selectedColor.bg === c.bg ? '2px solid white' : 'none' }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status..."
            style={{ color: selectedColor.font, fontFamily: FONT_STYLES[fontIndex].family }}
            maxLength={700}
          />

          <div style={{ padding: '0 16px 8px', width: '100%', maxWidth: '500px' }}>
            <input 
              type="text"
              placeholder="Tag contact (e.g. @username)"
              value={taggedContact}
              onChange={(e) => setTaggedContact(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: selectedColor.font,
                fontSize: '13px'
              }}
            />
          </div>
          
          <button 
            className="send-status-btn" 
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    )
  }

  // Image/Video Mode with editing
  return (
    <div className="create-status-overlay">
      <div className="media-create-container">
        <div className="create-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
          <button onClick={() => setMode('select')}><X /></button>
          
          <button
            type="button"
            onClick={() => setShowAudienceModal(true)}
            style={{
              background: 'rgba(0,168,132,0.2)',
              border: '1px solid #00a884',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '11px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title="Choose per-status audience"
          >
            <Users size={14} color="#00a884" />
            <span>
              {privacy === 'contacts' && 'My contacts'}
              {privacy === 'contacts_except' && 'Contacts except...'}
              {privacy === 'only_share_with' && 'Only share...'}
              {privacy === 'only_me' && 'Only me'}
            </span>
          </button>

          <button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : <Send size={20} />}
          </button>
        </div>

        <div className="media-preview" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selectedSticker && (
            <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '56px', zIndex: 10, pointerEvents: 'none' }}>
              {selectedSticker}
            </div>
          )}
          {((mediaItems[activeIndex]?.type || mode) === 'image') ? (
            <img src={mediaItems[activeIndex]?.preview || mediaPreview} alt="preview" />
          ) : (
            <video ref={videoRef} src={mediaItems[activeIndex]?.preview || mediaPreview} controls muted loop />
          )}
        </div>

        {/* Multi-Media Queue Carousel */}
        {mediaItems.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '8px 12px', background: 'rgba(0,0,0,0.6)', width: '100%' }}>
            {mediaItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => { setActiveIndex(idx); setMode(item.type); }}
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '52px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: activeIndex === idx ? '2px solid #00a884' : '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {item.type === 'image' ? (
                  <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <video src={item.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {mediaItems.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMediaItems(prev => {
                        const filtered = prev.filter((_, i) => i !== idx)
                        if (filtered.length === 0) setMode('select')
                        else setActiveIndex(Math.min(activeIndex, filtered.length - 1))
                        return filtered
                      })
                    }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <label
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                border: '1px dashed #00a884',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                color: '#00a884'
              }}
              title="Add more photos/videos"
            >
              <Plus size={20} />
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => handleFileSelect(e, 'image')}
              />
            </label>
          </div>
        )}

        {/* Caption */}
        <div className="caption-input">
          <input 
            type="text" 
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        {/* Video Trimming */}
        {mode === 'video' && (
          <div className="trim-section">
            <div className="trim-header">
              <Scissors size={18} />
              <span>Trim Video</span>
            </div>
            <div className="trim-controls">
              <div className="trim-row">
                <label>Start: {trimStart}s</label>
                <input 
                  type="range" 
                  min={0} 
                  max={Math.max(0, (videoRef.current?.duration || 60) - 5)}
                  value={trimStart}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setTrimStart(val)
                    if (val >= trimEnd) setTrimEnd(val + 5)
                  }}
                />
              </div>
              <div className="trim-row">
                <label>End: {trimEnd}s</label>
                <input 
                  type="range" 
                  min={trimStart + 1} 
                  max={videoRef.current?.duration || 60}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                />
              </div>
              <small>Duration: {trimEnd - trimStart}s (Max 30s for status)</small>
            </div>
          </div>
        )}

        {/* Music Section */}
        <div className="music-section">
          <div className="music-header">
            <Music size={18} />
            <span>Add Music</span>
          </div>
          
          {!musicFile ? (
            <label className="music-upload">
              <Volume2 size={20} />
              <span>Choose from device</span>
              <input 
                type="file" 
                accept="audio/*" 
                hidden 
                onChange={(e) => {
                  if (e.target.files[0]) {
                    setMusicFile(e.target.files[0])
                    setMusicEnd(15)
                  }
                }}
              />
            </label>
          ) : (
            <div className="music-editor">
              <div className="music-file-name">{musicFile.name}</div>
              <div className="trim-row">
                <label>Start: {musicStart}s</label>
                <input 
                  type="range" 
                  min={0} 
                  max={30}
                  value={musicStart}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setMusicStart(val)
                    if (val >= musicEnd) setMusicEnd(val + 5)
                  }}
                />
              </div>
              <div className="trim-row">
                <label>End: {musicEnd}s</label>
                <input 
                  type="range" 
                  min={musicStart + 1} 
                  max={60}
                  value={musicEnd}
                  onChange={(e) => setMusicEnd(Number(e.target.value))}
                />
              </div>
              <div className="trim-row">
                <label>Volume: {Math.round(musicVolume * 100)}%</label>
                <input 
                  type="range" 
                  min={0} 
                  max={1} 
                  step={0.1}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                />
              </div>
              <button className="remove-music" onClick={() => setMusicFile(null)}>
                Remove Music
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Per-Status Audience Selection Modal */}
      {showAudienceModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '360px' }}>
            <div className="privacy-header">
              <button type="button" onClick={() => setShowAudienceModal(false)}><X size={20} /></button>
              <h3>Status Audience</h3>
              <button type="button" onClick={() => setShowAudienceModal(false)} className="save-btn">Done</button>
            </div>
            <div className="privacy-options">
              <label className={`privacy-option ${privacy === 'contacts' ? 'selected' : ''}`}>
                <Users size={18} />
                <div>
                  <span>My contacts</span>
                  <small>Share with all contacts</small>
                </div>
                <input type="radio" name="per_status_privacy" checked={privacy === 'contacts'} onChange={() => setPrivacy('contacts')} />
              </label>

              <label className={`privacy-option ${privacy === 'contacts_except' ? 'selected' : ''}`}>
                <UserX size={18} />
                <div>
                  <span>My contacts except...</span>
                  <small>Hide from selected contacts</small>
                </div>
                <input type="radio" name="per_status_privacy" checked={privacy === 'contacts_except'} onChange={() => setPrivacy('contacts_except')} />
              </label>

              <label className={`privacy-option ${privacy === 'only_share_with' ? 'selected' : ''}`}>
                <UserCheck size={18} />
                <div>
                  <span>Only share with...</span>
                  <small>Share only with selected contacts</small>
                </div>
                <input type="radio" name="per_status_privacy" checked={privacy === 'only_share_with'} onChange={() => setPrivacy('only_share_with')} />
              </label>

              <label className={`privacy-option ${privacy === 'only_me' ? 'selected' : ''}`}>
                <Lock size={18} />
                <div>
                  <span>Only me</span>
                  <small>Private to you only</small>
                </div>
                <input type="radio" name="per_status_privacy" checked={privacy === 'only_me'} onChange={() => setPrivacy('only_me')} />
              </label>
            </div>

            {(privacy === 'contacts_except' || privacy === 'only_share_with') && (
              <div className="contacts-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <h4>{privacy === 'contacts_except' ? 'Hide status from' : 'Share status with'}</h4>
                {contacts.map(c => {
                  const cId = String(c.user?._id || c.user || c._id || '');
                  return (
                    <div key={cId} className="contact-item" onClick={() => toggleUser(cId)}>
                      <img src={c.profilePicture || '/default-avatar.png'} alt="" />
                      <span>{c.savedName || c.username}</span>
                      {selectedUsers.includes(cId) && <Check size={18} color="#00a884" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateStatus
