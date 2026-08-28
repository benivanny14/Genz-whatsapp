import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { X, Type, Image, Video, Music, Scissors, Send, Volume2, Users, Check, UserX, UserCheck, Lock, Plus, Trash2, AtSign, Smile, Mic, MicOff, Clock, ShieldAlert, Award, ChevronDown, List, BarChart3 } from 'lucide-react'
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

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 36, label: '36 hours (TM)' },
  { value: 48, label: '48 hours (Premium)' },
  { value: 72, label: '72 hours (TM Max)' }
]

// Shared button styles
const advancedBtnStyle = (color) => ({
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '12px',
  color: color || '#fff',
  fontSize: '11px',
  padding: '4px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
})

const mediaAdvancedBtnStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '11px',
  padding: '4px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
}

// Image filter presets
const IMAGE_FILTERS = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'cool', name: 'Cool', css: 'saturate(0.9) hue-rotate(15deg) brightness(1.05)' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.5) contrast(0.9) brightness(0.95) saturate(1.2)' },
  { id: 'bright', name: 'Bright', css: 'brightness(1.2) saturate(1.1)' },
  { id: 'contrast', name: 'Contrast', css: 'contrast(1.4) saturate(1.1)' },
  { id: 'fade', name: 'Fade', css: 'contrast(0.85) brightness(1.1) saturate(0.8)' },
]

// ── Bottom Toolbar Icon Button ──
const BottomToolBtn = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
      color: active ? '#00a884' : '#8696a0',
      transition: 'color 0.15s'
    }}
  >
    {icon}
    <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{label}</span>
  </button>
)

const sheetMenuBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px', width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', cursor: 'pointer',
  color: '#e9edef', textAlign: 'left', fontSize: '14px'
}

const CreateStatus = ({ onClose }) => {
  const { createTextStatus, createMediaStatus, createCustomStatus } = useStatusContext()
  const [mode, setMode] = useState('select') // select | text | image | video | voice | preview
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(TEXT_COLORS[0])
  const [fontIndex, setFontIndex] = useState(0)
  const [taggedContact, setTaggedContact] = useState('')
  const [selectedSticker, setSelectedSticker] = useState('')
  
  // Multi-media queue & audience states
  const [mediaItems, setMediaItems] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [privacy, setPrivacy] = useState('contacts')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showAudienceModal, setShowAudienceModal] = useState(false)
  const [contacts, setContacts] = useState([])

  const [caption, setCaption] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(60)
  const [musicFile, setMusicFile] = useState(null)

  // WhatsApp 2026 & TM Features State
  const [replySettings, setReplySettings] = useState('everyone')
  const [quality, setQuality] = useState('standard')
  const [statusDuration, setStatusDuration] = useState(24)
  const [addYoursPrompt, setAddYoursPrompt] = useState('')
  const [showAddYoursModal, setShowAddYoursModal] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [showFilterPicker, setShowFilterPicker] = useState(false)
  const [imageFilter, setImageFilter] = useState('none')
  const [activeBottomSheet, setActiveBottomSheet] = useState(null) // null | 'caption' | 'trim' | 'music' | 'draw' | 'filter' | 'privacy'
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showReplySettingsModal, setShowReplySettingsModal] = useState(false)
  const [showQualityModal, setShowQualityModal] = useState(false)
  const [musicStart, setMusicStart] = useState(0)
  const [musicEnd, setMusicEnd] = useState(15)
  const [musicVolume, setMusicVolume] = useState(0.5)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef(null)
  const ffmpegRef = useRef(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  const recordingIntervalRef = useRef(null)
  const audioChunksRef = useRef([])

  // Poll creation state
  const [showPollModal, setShowPollModal] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false)

  // Drawing/Pen tool state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#FF0000')
  const [drawBrushSize, setDrawBrushSize] = useState(4)
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

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

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    }
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

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
  }

  const discardRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
  }

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Trim video using FFmpeg.wasm
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
      setIsProcessing(false)
      return new File([mixedBlob], 'status-with-music.mp4', { type: 'video/mp4' })
    } catch (err) {
      console.error('Mix error:', err)
      setIsProcessing(false)
      return videoFile
    }
  }

  // Poll helpers
  const updatePollOption = (index, value) => {
    setPollOptions(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }
  const addPollOption = () => {
    if (pollOptions.length < 6) setPollOptions(prev => [...prev, ''])
  }
  const removePollOption = (index) => {
    if (pollOptions.length > 2) setPollOptions(prev => prev.filter((_, i) => i !== index))
  }

  // ── Drawing/Pen Tool Functions ──
  const initCanvas = (imgSrc) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    }
    img.src = imgSrc
  }

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    if (!isDrawing) return
    isDrawingRef.current = true
    const pos = getCanvasPos(e)
    lastPosRef.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getCanvasPos(e)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawBrushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    const currentPreview = mediaItems[activeIndex]?.preview
    if (currentPreview) initCanvas(currentPreview)
  }

  const applyDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    // Update the current media item's preview with the drawn overlay
    setMediaItems(prev => {
      const updated = [...prev]
      if (updated[activeIndex]) {
        updated[activeIndex] = { ...updated[activeIndex], drawnPreview: dataUrl }
      }
      return updated
    })
    setIsDrawing(false)
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      const currentFont = FONT_STYLES[fontIndex]?.id || 'sans'
      const excludedUsers = privacy === 'contacts_except' ? selectedUsers : undefined
      const includedUsers = privacy === 'only_share_with' ? selectedUsers : undefined

      // Voice status submission
      if (mode === 'voice' && audioBlob) {
        const formData = new FormData()
        formData.append('file', audioBlob, `voice-status-${Date.now()}.webm`)
        formData.append('caption', caption || '')
        formData.append('privacy', privacy)
        if (excludedUsers?.length) formData.append('excludedUsers', JSON.stringify(excludedUsers))
        if (includedUsers?.length) formData.append('includedUsers', JSON.stringify(includedUsers))
        formData.append('replySettings', replySettings)
        formData.append('quality', quality)
        formData.append('statusDuration', String(statusDuration))

        // Upload audio first
        const token = getAuthToken()
        const uploadRes = await fetch(`${resolveApiBase()}/status/upload`, {
          method: 'POST',
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          body: formData
        })
        const uploadData = await uploadRes.json()
        if (!uploadData.success) throw new Error('Audio upload failed')

        await createCustomStatus({
          type: 'voice',
          content: uploadData.fileUrl,
          caption: caption || '',
          privacy,
          excludedUsers,
          includedUsers,
          replySettings,
          quality,
          statusDuration,
          addYoursPrompt: addYoursPrompt || undefined,
          ...(pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2 ? {
            poll: {
              question: pollQuestion,
              options: pollOptions.filter(o => o.trim()),
              allowMultiple: pollAllowMultiple
            }
          } : {})
        })
        onClose()
        return
      }

      // Scheduled status — use the schedule endpoint
      if (scheduledAt && mode !== 'voice') {
        const token = getAuthToken()
        const scheduleBody = {
          scheduledAt,
          type: mode === 'text' ? 'text' : (mediaItems[activeIndex]?.type || mode),
          content: mode === 'text' ? text : (mediaItems[activeIndex]?.preview || ''),
          caption: caption || '',
          textStatus: mode === 'text' ? {
            text,
            backgroundColor: selectedColor.bg,
            fontColor: selectedColor.font,
            fontStyle: currentFont
          } : undefined,
          privacy,
          excludedUsers,
          includedUsers,
          replySettings,
          quality,
          statusDuration,
          ...(imageFilter !== 'none' ? { imageFilter } : {})
        }
        const res = await fetch(`${resolveApiBase()}/status/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(scheduleBody)
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.message || 'Schedule failed')
        onClose()
        return
      }

      // Voice status submission
      if (mode === 'voice' && audioBlob) {
        await createTextStatus({
          text,
          backgroundColor: selectedColor.bg,
          fontColor: selectedColor.font,
          fontStyle: currentFont,
          collabUsername: taggedContact.trim(),
          privacy,
          excludedUsers,
          includedUsers,
          replySettings,
          quality,
          statusDuration,
          addYoursPrompt: addYoursPrompt || undefined
        })
        onClose()
        return
      }

      // Media status submission
      const itemsToUpload = mediaItems.length > 0 ? mediaItems : []
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

        // Use drawn preview if available for images
        let fileToUpload = finalFile
        if (item.type === 'image' && item.drawnPreview) {
          try {
            const response = await fetch(item.drawnPreview)
            const blob = await response.blob()
            fileToUpload = new File([blob], `drawn-${item.file.name}.png`, { type: 'image/png' })
          } catch (err) { /* fallback to original */ }
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('caption', item.caption || caption || '')
        formData.append('fontStyle', currentFont)
        if (taggedContact.trim()) formData.append('collabUsername', taggedContact.trim())
        formData.append('duration', (item.trimEnd || 30) - (item.trimStart || 0))
        formData.append('privacy', privacy)
        if (excludedUsers?.length) formData.append('excludedUsers', JSON.stringify(excludedUsers))
        if (includedUsers?.length) formData.append('includedUsers', JSON.stringify(includedUsers))
        formData.append('replySettings', replySettings)
        formData.append('quality', quality)
        formData.append('statusDuration', String(statusDuration))
        if (addYoursPrompt.trim()) formData.append('addYoursPrompt', addYoursPrompt)
        if (imageFilter !== 'none') formData.append('imageFilter', imageFilter)

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

  // ────────── SELECT MODE ──────────
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

            <button onClick={() => setMode('voice')} className="create-option">
              <Mic size={28} color="#00a884" />
              <span>Voice</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ────────── VOICE RECORDING MODE ──────────
  if (mode === 'voice') {
    return (
      <div className="create-status-overlay" style={{ background: '#1a1a2e' }}>
        <div className="text-create-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Top Bar */}
          <div className="create-toolbar top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <button onClick={() => { discardRecording(); setMode('select'); }}><X color="#fff" /></button>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Voice Status</span>
            <div style={{ width: 24 }} />
          </div>

          {/* Recording Visualization */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            {isRecording && (
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)', border: '3px solid #ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                <Mic size={48} color="#ef4444" />
              </div>
            )}
            {!isRecording && !audioUrl && (
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '3px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Mic size={48} color="#8696a0" />
              </div>
            )}
            {!isRecording && audioUrl && (
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(0,168,132,0.2)', border: '3px solid #00a884',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Music size={48} color="#00a884" />
              </div>
            )}

            <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              {formatRecordingTime(recordingTime)}
            </div>

            {audioUrl && !isRecording && (
              <audio src={audioUrl} controls style={{ width: '280px', height: '36px', borderRadius: '18px' }} />
            )}
          </div>

          {/* Caption for voice */}
          <div style={{ padding: '0 16px 8px', width: '100%', maxWidth: '500px' }}>
            <input 
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Record / Stop / Discard buttons */}
          <div style={{ display: 'flex', gap: '16px', padding: '12px' }}>
            {isRecording ? (
              <button
                onClick={stopRecording}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#ef4444', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '3px' }} />
              </button>
            ) : audioUrl ? (
              <>
                <button
                  onClick={discardRecording}
                  style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Trash2 size={22} color="#ef4444" />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: '#00a884', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {isProcessing ? <span style={{ color: '#fff', fontSize: '11px' }}>...</span> : <Send size={26} color="#fff" />}
                </button>
              </>
            ) : (
              <button
                onClick={startRecording}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#ef4444', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 4px rgba(239,68,68,0.3)'
                }}
              >
                <Mic size={30} color="#fff" />
              </button>
            )}
          </div>

          <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }`}</style>
        </div>
      </div>
    )
  }

  // ────────── TEXT MODE ──────────
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

          {/* Text mode advanced settings row */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setShowReplySettingsModal(true)} style={advancedBtnStyle(selectedColor.font)}>
              <ShieldAlert size={14} /> Reply: {replySettings}
            </button>
            <button onClick={() => setShowDurationPicker(true)} style={advancedBtnStyle(selectedColor.font)}>
              <Clock size={14} /> {statusDuration}h
            </button>
            <button onClick={() => setShowPollModal(true)} style={advancedBtnStyle(selectedColor.font)}>
              <BarChart3 size={14} /> Poll
            </button>
          </div>
          
          <button 
            className="send-status-btn" 
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            <Send size={24} />
          </button>
        </div>

        {/* ── Reply Settings Modal ── */}
        {showReplySettingsModal && (
          <div className="privacy-overlay" style={{ zIndex: 100 }}>
            <div className="privacy-container" style={{ maxWidth: '340px' }}>
              <div className="privacy-header">
                <button onClick={() => setShowReplySettingsModal(false)}><X size={20} /></button>
                <h3>Who can reply</h3>
                <button onClick={() => setShowReplySettingsModal(false)} className="save-btn">Done</button>
              </div>
              <div className="privacy-options">
                {['everyone', 'contacts', 'nobody'].map(val => (
                  <label key={val} className={`privacy-option ${replySettings === val ? 'selected' : ''}`}>
                    <div><span style={{ textTransform: 'capitalize' }}>{val}</span></div>
                    <input type="radio" name="reply_settings" checked={replySettings === val} onChange={() => setReplySettings(val)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Duration Picker Modal ── */}
        {showDurationPicker && (
          <div className="privacy-overlay" style={{ zIndex: 100 }}>
            <div className="privacy-container" style={{ maxWidth: '340px' }}>
              <div className="privacy-header">
                <button onClick={() => setShowDurationPicker(false)}><X size={20} /></button>
                <h3>Status Duration</h3>
                <button onClick={() => setShowDurationPicker(false)} className="save-btn">Done</button>
              </div>
              <div className="privacy-options">
                {DURATION_OPTIONS.map(opt => (
                  <label key={opt.value} className={`privacy-option ${statusDuration === opt.value ? 'selected' : ''}`}>
                    <div><span>{opt.label}</span></div>
                    <input type="radio" name="duration" checked={statusDuration === opt.value} onChange={() => setStatusDuration(opt.value)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Poll Modal ── */}
        {showPollModal && (
          <div className="privacy-overlay" style={{ zIndex: 100 }}>
            <div className="privacy-container" style={{ maxWidth: '380px' }}>
              <div className="privacy-header">
                <button onClick={() => { setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']); }}><X size={20} /></button>
                <h3>Create Poll</h3>
                <button onClick={() => setShowPollModal(false)} className="save-btn">Done</button>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px' }}
                />
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px' }}
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={16} color="#ef4444" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button onClick={addPollOption} style={{ background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px', color: '#00a884', fontSize: '13px', cursor: 'pointer' }}>
                    + Add option
                  </button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} />
                  Allow multiple selections
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ────────── IMAGE/VIDEO MODE ──────────
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
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img
                src={mediaItems[activeIndex]?.drawnPreview || mediaItems[activeIndex]?.preview}
                alt="preview"
                style={{
                  filter: IMAGE_FILTERS.find(f => f.id === imageFilter)?.css || 'none',
                  width: '100%', height: '100%', objectFit: 'contain'
                }}
              />
              {isDrawing && (
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    cursor: 'crosshair', touchAction: 'none'
                  }}
                />
              )}
            </div>
          ) : (
            <video ref={videoRef} src={mediaItems[activeIndex]?.preview} controls muted loop />
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
                  width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden',
                  border: activeIndex === idx ? '2px solid #00a884' : '1px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer', flexShrink: 0
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
                      position: 'absolute', top: 2, right: 2,
                      background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >×</button>
                )}
              </div>
            ))}
            <label
              style={{
                width: '52px', height: '52px', borderRadius: '8px',
                border: '1px dashed #00a884', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, color: '#00a884'
              }}
            >
              <Plus size={20} />
              <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => handleFileSelect(e, 'image')} />
            </label>
          </div>
        )}

        {/* ═══════ WhatsApp-style Bottom Toolbar ═══════ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '10px 4px', background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid rgba(255,255,255,0.08)', width: '100%'
        }}>
          <BottomToolBtn icon={<Type size={20} />} label="Caption" active={activeBottomSheet === 'caption'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'caption' ? null : 'caption')} />
          {mode === 'video' && <BottomToolBtn icon={<Scissors size={20} />} label="Trim" active={activeBottomSheet === 'trim'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'trim' ? null : 'trim')} />}
          <BottomToolBtn icon={<Music size={20} />} label="Music" active={activeBottomSheet === 'music'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'music' ? null : 'music')} />
          {mode === 'image' && <BottomToolBtn icon={<PenTool size={20} />} label="Draw" active={isDrawing} onClick={() => {
            const newDrawing = !isDrawing
            setIsDrawing(newDrawing)
            if (newDrawing) {
              setTimeout(() => initCanvas(mediaItems[activeIndex]?.drawnPreview || mediaItems[activeIndex]?.preview), 100)
            }
          }} />}
          {mode === 'image' && <BottomToolBtn icon={<span style={{ fontSize: '18px' }}>🎨</span>} label="Filter" active={activeBottomSheet === 'filter'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'filter' ? null : 'filter')} />}
          <BottomToolBtn icon={<Users size={20} />} label="Privacy" active={activeBottomSheet === 'privacy'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'privacy' ? null : 'privacy')} />
          <BottomToolBtn icon={<BarChart3 size={20} />} label="More" active={activeBottomSheet === 'more'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'more' ? null : 'more')} />
        </div>

        {/* ═══════ Bottom Sheets ═══════ */}
        {activeBottomSheet && (
          <div
            className="bottom-sheet-overlay"
            onClick={() => setActiveBottomSheet(null)}
          >
            <div
              className="bottom-sheet"
              onClick={e => e.stopPropagation()}
            >
              <div className="bottom-sheet-handle" />

              {/* Caption Sheet */}
              {activeBottomSheet === 'caption' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>Caption</h3>
                  <input
                    type="text" placeholder="Add a caption..."
                    value={caption} onChange={(e) => setCaption(e.target.value)}
                    autoFocus
                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </>
              )}

              {/* Trim Sheet */}
              {activeBottomSheet === 'trim' && mode === 'video' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>✂️ Trim Video</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Start: {trimStart}s</span>
                      </div>
                      <input type="range" min={0} max={Math.max(0, (videoRef.current?.duration || 60) - 5)} value={trimStart}
                        onChange={(e) => { const val = Number(e.target.value); setTrimStart(val); if (val >= trimEnd) setTrimEnd(val + 5) }}
                        style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '12px', marginBottom: '4px' }}>
                        <span>End: {trimEnd}s</span>
                      </div>
                      <input type="range" min={trimStart + 1} max={videoRef.current?.duration || 60} value={trimEnd}
                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                        style={{ width: '100%' }} />
                    </div>
                    <div style={{ color: '#00a884', fontSize: '13px', textAlign: 'center' }}>
                      Duration: {trimEnd - trimStart}s
                    </div>
                  </div>
                </>
              )}

              {/* Music Sheet */}
              {activeBottomSheet === 'music' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>🎵 Add Music</h3>
                  {!musicFile ? (
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                      border: '2px dashed rgba(255,255,255,0.2)', cursor: 'pointer'
                    }}>
                      <Volume2 size={28} color="#00a884" />
                      <span style={{ color: '#8696a0', fontSize: '13px' }}>Choose audio from device</span>
                      <input type="file" accept="audio/*" hidden onChange={(e) => { if (e.target.files[0]) { setMusicFile(e.target.files[0]); setMusicEnd(15) } }} />
                    </label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ color: '#00a884', fontSize: '13px', textAlign: 'center' }}>🎶 {musicFile.name}</div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Start: {musicStart}s</span>
                        </div>
                        <input type="range" min={0} max={30} value={musicStart}
                          onChange={(e) => { const val = Number(e.target.value); setMusicStart(val); if (val >= musicEnd) setMusicEnd(val + 5) }}
                          style={{ width: '100%' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '12px', marginBottom: '4px' }}>
                          <span>End: {musicEnd}s</span>
                        </div>
                        <input type="range" min={musicStart + 1} max={60} value={musicEnd}
                          onChange={(e) => setMusicEnd(Number(e.target.value))}
                          style={{ width: '100%' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Volume: {Math.round(musicVolume * 100)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.1} value={musicVolume}
                          onChange={(e) => setMusicVolume(Number(e.target.value))}
                          style={{ width: '100%' }} />
                      </div>
                      <button onClick={() => setMusicFile(null)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}>
                        Remove Music
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Filter Sheet */}
              {activeBottomSheet === 'filter' && mode === 'image' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>🎨 Filters</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {IMAGE_FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setImageFilter(f.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          background: imageFilter === f.id ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.05)',
                          border: imageFilter === f.id ? '2px solid #00a884' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px', padding: '8px', cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)' }}>
                          {mediaItems[activeIndex]?.preview && (
                            <img src={mediaItems[activeIndex].preview} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }} />
                          )}
                        </div>
                        <span style={{ color: '#fff', fontSize: '10px', fontWeight: imageFilter === f.id ? '600' : '400' }}>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Privacy Sheet */}
              {activeBottomSheet === 'privacy' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>🔒 Privacy</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { val: 'contacts', icon: <Users size={18} />, label: 'My contacts', desc: 'Share with all contacts' },
                      { val: 'contacts_except', icon: <UserX size={18} />, label: 'Contacts except...', desc: 'Hide from selected' },
                      { val: 'only_share_with', icon: <UserCheck size={18} />, label: 'Only share with...', desc: 'Share only with selected' },
                      { val: 'only_me', icon: <Lock size={18} />, label: 'Only me', desc: 'Private to you only' }
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setPrivacy(opt.val)} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                        background: privacy === opt.val ? 'rgba(0,168,132,0.15)' : 'rgba(255,255,255,0.05)',
                        border: privacy === opt.val ? '1px solid #00a884' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', cursor: 'pointer', color: '#e9edef', textAlign: 'left', width: '100%'
                      }}>
                        <span style={{ color: privacy === opt.val ? '#00a884' : '#8696a0' }}>{opt.icon}</span>
                        <div><div style={{ fontSize: '14px' }}>{opt.label}</div><div style={{ fontSize: '11px', color: '#667781' }}>{opt.desc}</div></div>
                        {privacy === opt.val && <Check size={18} color="#00a884" style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* More Sheet (Schedule, Poll, Reply, Quality, Duration) */}
              {activeBottomSheet === 'more' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>More Options</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => { setActiveBottomSheet(null); setShowScheduleModal(true) }} style={sheetMenuBtnStyle}><span>📅</span><div><div>Schedule</div><div style={{ fontSize: '11px', color: '#667781' }}>Publish later</div></div></button>
                    <button onClick={() => { setActiveBottomSheet(null); setShowPollModal(true) }} style={sheetMenuBtnStyle}><span>📊</span><div><div>Create Poll</div><div style={{ fontSize: '11px', color: '#667781' }}>Ask a question</div></div></button>
                    <button onClick={() => { setActiveBottomSheet(null); setShowReplySettingsModal(true) }} style={sheetMenuBtnStyle}><span>💬</span><div><div>Reply Settings</div><div style={{ fontSize: '11px', color: '#667781' }}>Who can reply ({replySettings})</div></div></button>
                    <button onClick={() => { setActiveBottomSheet(null); setShowQualityModal(true) }} style={sheetMenuBtnStyle}><span>🎬</span><div><div>Quality</div><div style={{ fontSize: '11px', color: '#667781' }}>{quality.toUpperCase()}</div></div></button>
                    <button onClick={() => { setActiveBottomSheet(null); setShowDurationPicker(true) }} style={sheetMenuBtnStyle}><span>⏱️</span><div><div>Duration</div><div style={{ fontSize: '11px', color: '#667781' }}>{statusDuration}h</div></div></button>
                  </div>
                </>
              )}

              <button
                onClick={() => setActiveBottomSheet(null)}
                style={{
                  width: '100%', padding: '12px', marginTop: '12px',
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px',
                  color: '#e9edef', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >Done</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Per-Status Audience Selection Modal ── */}
      {showAudienceModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '360px' }}>
            <div className="privacy-header">
              <button onClick={() => setShowAudienceModal(false)}><X size={20} /></button>
              <h3>Status Audience</h3>
              <button onClick={() => setShowAudienceModal(false)} className="save-btn">Done</button>
            </div>
            <div className="privacy-options">
              {[
                { val: 'contacts', icon: <Users size={18} />, label: 'My contacts', desc: 'Share with all contacts' },
                { val: 'contacts_except', icon: <UserX size={18} />, label: 'My contacts except...', desc: 'Hide from selected contacts' },
                { val: 'only_share_with', icon: <UserCheck size={18} />, label: 'Only share with...', desc: 'Share only with selected contacts' },
                { val: 'only_me', icon: <Lock size={18} />, label: 'Only me', desc: 'Private to you only' }
              ].map(opt => (
                <label key={opt.val} className={`privacy-option ${privacy === opt.val ? 'selected' : ''}`}>
                  {opt.icon}
                  <div><span>{opt.label}</span><small>{opt.desc}</small></div>
                  <input type="radio" name="per_status_privacy" checked={privacy === opt.val} onChange={() => setPrivacy(opt.val)} />
                </label>
              ))}
            </div>
            {(privacy === 'contacts_except' || privacy === 'only_share_with') && (
              <div className="contacts-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <h4>{privacy === 'contacts_except' ? 'Hide status from' : 'Share status with'}</h4>
                {contacts.map(c => {
                  const cId = String(c.user?._id || c.user || c._id || '')
                  return (
                    <div key={cId} className="contact-item" onClick={() => toggleUser(cId)}>
                      <img src={c.profilePicture || '/default-avatar.png'} alt="" />
                      <span>{c.savedName || c.username}</span>
                      {selectedUsers.includes(cId) && <Check size={18} color="#00a884" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reply Settings Modal ── */}
      {showReplySettingsModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '340px' }}>
            <div className="privacy-header">
              <button onClick={() => setShowReplySettingsModal(false)}><X size={20} /></button>
              <h3>Who can reply</h3>
              <button onClick={() => setShowReplySettingsModal(false)} className="save-btn">Done</button>
            </div>
            <div className="privacy-options">
              {['everyone', 'contacts', 'nobody'].map(val => (
                <label key={val} className={`privacy-option ${replySettings === val ? 'selected' : ''}`}>
                  <div><span style={{ textTransform: 'capitalize' }}>{val}</span></div>
                  <input type="radio" name="reply_settings_media" checked={replySettings === val} onChange={() => setReplySettings(val)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quality Modal ── */}
      {showQualityModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '340px' }}>
            <div className="privacy-header">
              <button onClick={() => setShowQualityModal(false)}><X size={20} /></button>
              <h3>Media Quality</h3>
              <button onClick={() => setShowQualityModal(false)} className="save-btn">Done</button>
            </div>
            <div className="privacy-options">
              {[
                { val: 'hd', label: 'HD', desc: 'Best quality, larger file' },
                { val: 'standard', label: 'Standard', desc: 'Recommended' },
                { val: 'saver', label: 'Data Saver', desc: 'Smaller file, lower quality' }
              ].map(opt => (
                <label key={opt.val} className={`privacy-option ${quality === opt.val ? 'selected' : ''}`}>
                  <div><span>{opt.label}</span><small>{opt.desc}</small></div>
                  <input type="radio" name="quality" checked={quality === opt.val} onChange={() => setQuality(opt.val)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Duration Picker Modal ── */}
      {showDurationPicker && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '340px' }}>
            <div className="privacy-header">
              <button onClick={() => setShowDurationPicker(false)}><X size={20} /></button>
              <h3>Status Duration</h3>
              <button onClick={() => setShowDurationPicker(false)} className="save-btn">Done</button>
            </div>
            <div className="privacy-options">
              {DURATION_OPTIONS.map(opt => (
                <label key={opt.value} className={`privacy-option ${statusDuration === opt.value ? 'selected' : ''}`}>
                  <div><span>{opt.label}</span></div>
                  <input type="radio" name="duration_media" checked={statusDuration === opt.value} onChange={() => setStatusDuration(opt.value)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Poll Modal ── */}
      {showPollModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '380px' }}>
            <div className="privacy-header">
              <button onClick={() => { setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']); }}><X size={20} /></button>
              <h3>Create Poll</h3>
              <button onClick={() => setShowPollModal(false)} className="save-btn">Done</button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Ask a question..." value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px' }} />
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" placeholder={`Option ${i + 1}`} value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px' }} />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={16} color="#ef4444" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={addPollOption} style={{ background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px', color: '#00a884', fontSize: '13px', cursor: 'pointer' }}>
                  + Add option
                </button>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} />
                Allow multiple selections
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Picker Modal ── */}
      {showFilterPicker && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '380px' }}>
            <div className="privacy-header">
              <button onClick={() => setShowFilterPicker(false)}><X size={20} /></button>
              <h3>🎨 Image Filters</h3>
              <button onClick={() => setShowFilterPicker(false)} className="save-btn">Done</button>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {IMAGE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setImageFilter(f.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    background: imageFilter === f.id ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.05)',
                    border: imageFilter === f.id ? '2px solid #00a884' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', padding: '8px', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden',
                    background: 'rgba(255,255,255,0.15)'
                  }}>
                    {mediaItems[activeIndex]?.preview && (
                      <img
                        src={mediaItems[activeIndex].preview}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }}
                      />
                    )}
                  </div>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: imageFilter === f.id ? '600' : '400' }}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div className="privacy-overlay" style={{ zIndex: 100 }}>
          <div className="privacy-container" style={{ maxWidth: '380px' }}>
            <div className="privacy-header">
              <button onClick={() => { setShowScheduleModal(false); setScheduledAt(''); }}><X size={20} /></button>
              <h3>📅 Schedule Status</h3>
              <button onClick={() => setShowScheduleModal(false)} className="save-btn">Done</button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#8696a0', fontSize: '13px', margin: 0 }}>
                Choose when to publish this status. It will be posted automatically.
              </p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
                  padding: '12px', color: '#fff', fontSize: '14px'
                }}
              />
              {scheduledAt && (
                <div style={{ color: '#00a884', fontSize: '13px', textAlign: 'center' }}>
                  Will be published at: {new Date(scheduledAt).toLocaleString()}
                </div>
              )}
              <div style={{ color: '#667781', fontSize: '11px', textAlign: 'center' }}>
                {scheduledAt ? '✅ Scheduled — will post automatically' : '⬜ Set a date and time to schedule'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateStatus
