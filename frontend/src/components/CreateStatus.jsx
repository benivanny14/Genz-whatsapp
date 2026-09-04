import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { X, Type, Image, Video, Music, Scissors, Send, Volume2, Users, Check, UserX, UserCheck, Lock, Plus, Trash2, AtSign, Smile, Mic, MicOff, Clock, ShieldAlert, Award, ChevronDown, List, BarChart3, PenTool, MapPin, LayoutGrid, Sparkles } from 'lucide-react'
import { getAuthToken } from '../utils/tokenStore'
import { resolveApiBase } from '../utils/resolveApiBase'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import './CreateStatus.css'
import MusicPicker from './MusicPicker'
import CollageBuilder from './CollageBuilder'
import LocationSticker from './LocationSticker'
import TextAnimationPicker, { injectAnimationKeyframes, getAnimationStyle } from './TextAnimationPicker'
import PhotoStickerTool from './PhotoStickerTool'
import RichTextEditor from './RichTextEditor'

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

// Pre-computed fallback waveform (stable, no Math.random in render)
const FALLBACK_WAVEFORM = Array.from({ length: 120 }, (_, i) =>
  0.3 + Math.sin(i * 0.25) * 0.25 + Math.cos(i * 0.6) * 0.2 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.15
)

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

/**
 * Instagram/WhatsApp-style trim bar with draggable handles.
 * Shows a visual timeline with green handles that can be dragged.
 */
const InstagramTrimBar = ({ duration = 60, startTime = 0, endTime = 30, onChange, color = '#00a884' }) => {
  const barRef = React.useRef(null)
  const [dragging, setDragging] = useState(null) // 'start' | 'end' | 'range'
  const [dragStartX, setDragStartX] = useState(0)
  const [dragInitialStart, setDragInitialStart] = useState(0)
  const [dragInitialEnd, setDragInitialEnd] = useState(0)

  const getPositionFromX = (clientX) => {
    if (!barRef.current) return 0
    const rect = barRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    return ratio * duration
  }

  const handlePointerDown = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
    setDragStartX(e.clientX || e.touches?.[0]?.clientX || 0)
    setDragInitialStart(startTime)
    setDragInitialEnd(endTime)
  }

  const handlePointerMove = React.useCallback((e) => {
    if (!dragging) return
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0
    const time = getPositionFromX(clientX)

    if (dragging === 'start') {
      const newStart = Math.min(time, endTime - 1)
      onChange(Math.max(0, Math.round(newStart * 10) / 10), endTime)
    } else if (dragging === 'end') {
      const newEnd = Math.max(time, startTime + 1)
      onChange(startTime, Math.min(duration, Math.round(newEnd * 10) / 10))
    } else if (dragging === 'range') {
      const dx = clientX - dragStartX
      if (!barRef.current) return
      const dt = (dx / barRef.current.getBoundingClientRect().width) * duration
      const rangeLen = dragInitialEnd - dragInitialStart
      let newStart = dragInitialStart + dt
      let newEnd = dragInitialEnd + dt
      if (newStart < 0) { newStart = 0; newEnd = rangeLen }
      if (newEnd > duration) { newEnd = duration; newStart = duration - rangeLen }
      onChange(Math.round(newStart * 10) / 10, Math.round(newEnd * 10) / 10)
    }
  }, [dragging, startTime, endTime, duration, dragStartX, dragInitialStart, dragInitialEnd, onChange])

  const handlePointerUp = React.useCallback(() => { setDragging(null) }, [])

  React.useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handlePointerMove)
      document.addEventListener('mouseup', handlePointerUp)
      document.addEventListener('touchmove', handlePointerMove)
      document.addEventListener('touchend', handlePointerUp)
      return () => {
        document.removeEventListener('mousemove', handlePointerMove)
        document.removeEventListener('mouseup', handlePointerUp)
        document.removeEventListener('touchmove', handlePointerMove)
        document.removeEventListener('touchend', handlePointerUp)
      }
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  const startPct = (startTime / duration) * 100
  const endPct = (endTime / duration) * 100
  const selWidth = endPct - startPct

  // Generate fake waveform bars
  const waveformBars = React.useMemo(() => {
    const bars = []
    for (let i = 0; i < 80; i++) {
      const h = 20 + Math.sin(i * 0.3) * 15 + Math.random() * 10
      bars.push(h)
    }
    return bars
  }, [])

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ position: 'relative', width: '100%', height: 56, userSelect: 'none', touchAction: 'none' }} ref={barRef}>
        {/* Waveform background */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 1, padding: '0 2px', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
          {waveformBars.map((h, i) => {
            const barPct = (i / waveformBars.length) * 100
            const inSelection = barPct >= startPct && barPct <= endPct
            return (
              <div key={i} style={{
                flex: 1, height: `${h}%`, minHeight: 4,
                borderRadius: 2,
                background: inSelection ? color : 'rgba(255,255,255,0.15)',
                transition: 'background 0.15s'
              }} />
            )
          })}
        </div>

        {/* Dimmed areas outside selection */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${startPct}%`, background: 'rgba(0,0,0,0.6)', borderRadius: '8px 0 0 8px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${endPct}%`, right: 0, background: 'rgba(0,0,0,0.6)', borderRadius: '0 8px 8px 0', pointerEvents: 'none' }} />

        {/* Selected area border */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${startPct}%`, width: `${selWidth}%`,
          border: `2px solid ${color}`, borderRadius: 4,
          pointerEvents: 'none'
        }} />

        {/* Start handle */}
        <div
          onMouseDown={(e) => handlePointerDown(e, 'start')}
          onTouchStart={(e) => handlePointerDown(e, 'start')}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${startPct}%`, transform: 'translateX(-50%)',
            width: 20, cursor: 'ew-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5
          }}
        >
          <div style={{ width: 4, height: 32, borderRadius: 2, background: color, boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: -16, color: color, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {startTime.toFixed(1)}s
          </div>
        </div>

        {/* End handle */}
        <div
          onMouseDown={(e) => handlePointerDown(e, 'end')}
          onTouchStart={(e) => handlePointerDown(e, 'end')}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${endPct}%`, transform: 'translateX(-50%)',
            width: 20, cursor: 'ew-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5
          }}
        >
          <div style={{ width: 4, height: 32, borderRadius: 2, background: color, boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: -16, color: color, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {endTime.toFixed(1)}s
          </div>
        </div>

        {/* Range drag handle (center) */}
        <div
          onMouseDown={(e) => handlePointerDown(e, 'range')}
          onTouchStart={(e) => handlePointerDown(e, 'range')}
          style={{
            position: 'absolute', top: '50%',
            left: `${startPct + selWidth / 2}%`, transform: 'translate(-50%, -50%)',
            cursor: 'grab', zIndex: 4,
            display: 'flex', gap: 3, padding: '4px 6px',
            background: 'rgba(0,0,0,0.4)', borderRadius: 8
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ width: 2, height: 10, borderRadius: 1, background: '#fff' }} />
          ))}
        </div>
      </div>
    </div>
  )
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

  // New creative tools state
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [musicLoading, setMusicLoading] = useState(false)
  const [showPhotoStickerTool, setShowPhotoStickerTool] = useState(false)
  const [showRichTextEditor, setShowRichTextEditor] = useState(false)
  const [stickers, setStickers] = useState([]) // photo stickers from cutout tool
  const [linkPreview, setLinkPreview] = useState(null) // auto-detected link preview
  const [selectedMusicData, setSelectedMusicData] = useState(null)
  const [showCollage, setShowCollage] = useState(false)
  const [collageData, setCollageData] = useState(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [textAnimation, setTextAnimation] = useState('none')
  const [isViewOnce, setIsViewOnce] = useState(false)

  // Inject animation keyframes on mount
  useEffect(() => { injectAnimationKeyframes() }, [])

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
  const musicPreviewRef = useRef(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [musicCurrentTime, setMusicCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef(null)
  const ffmpegRef = useRef(null)
  const musicStartRef = useRef(0)
  const musicEndRef = useRef(15)
  const [waveformData, setWaveformData] = useState([])
  const [musicLoop, setMusicLoop] = useState(true)
  const [trimZoom, setTrimZoom] = useState(1)
  const [trimScrollPct, setTrimScrollPct] = useState(0.5)
  const waveformCanvasRef = useRef(null)

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

  // Keep refs in sync with state for use in audio callbacks (avoids stale closures)
  useEffect(() => { musicStartRef.current = musicStart }, [musicStart])
  useEffect(() => { musicEndRef.current = musicEnd }, [musicEnd])

  // ═══ Music preview audio (plays from trim position like Instagram) ═══
  useEffect(() => {
    const url = selectedMusicData?.url
    if (!url) { setIsMusicPlaying(false); setAudioDuration(0); setWaveformData([]); return }
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.src = url
    audio.volume = musicVolume
    musicPreviewRef.current = audio

    // Decode audio for real waveform visualization
    let audioCtx = null
    let aborted = false
    const decodeWaveform = async () => {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const resp = await fetch(url)
        const arrayBuf = await resp.arrayBuffer()
        if (aborted) return
        const decoded = await audioCtx.decodeAudioData(arrayBuf)
        if (aborted) return
        const rawData = decoded.getChannelData(0)
        const samples = 120
        const blockSize = Math.floor(rawData.length / samples)
        const bars = []
        for (let i = 0; i < samples; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j])
        }
          bars.push(sum / blockSize)
        }
        // Normalize to 0-1
        const max = Math.max(...bars, 0.01)
        setWaveformData(bars.map(b => b / max))
      } catch (e) {
        // CORS or decode error — generate procedural fallback
        if (import.meta.env.DEV) console.warn('[Music] Waveform decode failed:', e)
        const fallback = FALLBACK_WAVEFORM.slice()
        setWaveformData(fallback)
      }
    }

    const onLoaded = () => {
      const dur = audio.duration || 0
      setAudioDuration(dur)
      const initialEnd = Math.min(15, dur)
      setMusicEnd(initialEnd)
      setMusicStart(0)
      musicStartRef.current = 0
      musicEndRef.current = initialEnd
      setTrimZoom(1)
      setTrimScrollPct(0.5)
      decodeWaveform()
    }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', () => {
      setMusicCurrentTime(audio.currentTime)
      const curEnd = musicEndRef.current
      const curStart = musicStartRef.current
      if (audio.currentTime >= curEnd) {
        // Loop: restart from trim start
        audio.currentTime = curStart
        audio.play().catch(() => {})
      }
    })
    audio.addEventListener('ended', () => setIsMusicPlaying(false))
    return () => {
      aborted = true
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.pause()
      musicPreviewRef.current = null
      setIsMusicPlaying(false)
      try { audioCtx?.close() } catch {}
    }
  }, [selectedMusicData?.url])

  // Update volume in real-time
  useEffect(() => {
    if (musicPreviewRef.current) musicPreviewRef.current.volume = musicVolume
  }, [musicVolume])

  const toggleMusicPreview = useCallback(() => {
    const audio = musicPreviewRef.current
    if (!audio) return
    if (isMusicPlaying) {
      audio.pause()
      setIsMusicPlaying(false)
    } else {
      audio.currentTime = musicStart
      audio.play().catch(() => {})
      setIsMusicPlaying(true)
    }
  }, [isMusicPlaying, musicStart])

  // When trim handles change, seek to new start position (like Instagram)
  const handleMusicTrimChange = useCallback((start, end) => {
    setMusicStart(start)
    setMusicEnd(end)
    const audio = musicPreviewRef.current
    if (audio && isMusicPlaying) {
      audio.currentTime = start
      audio.play().catch(() => {})
    } else if (audio) {
      audio.currentTime = start
    }
  }, [isMusicPlaying])

  // Scrub position within the selected trim range (Instagram-style)
  const handleMusicScrub = useCallback((time) => {
    setMusicCurrentTime(time)
    const audio = musicPreviewRef.current
    if (audio) {
      audio.currentTime = time
      if (!isMusicPlaying) {
        audio.play().catch(() => {})
        setIsMusicPlaying(true)
      }
    }
  }, [isMusicPlaying])

  // Format seconds as m:ss or mm:ss
  const formatMusicTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  // Auto-stop video at trim end position
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onTimeUpdate = () => {
      if (vid.currentTime >= trimEnd && trimEnd > 0) {
        vid.pause()
        vid.currentTime = trimStart
      }
    }
    vid.addEventListener('timeupdate', onTimeUpdate)
    return () => vid.removeEventListener('timeupdate', onTimeUpdate)
  }, [trimStart, trimEnd])

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
        if (import.meta.env.DEV) console.error('Fetch contacts error:', err)
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

  // Auto-detect link preview from caption text
  useEffect(() => {
    if (!caption || mode !== 'text') { setLinkPreview(null); return }
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = caption.match(urlRegex)
    if (!urls || urls.length === 0) { setLinkPreview(null); return }

    const debounce = setTimeout(async () => {
      try {
        const token = getAuthToken()
        const res = await fetch(`${resolveApiBase()}/status/link-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ url: urls[0] })
        })
        const data = await res.json()
        if (data.success && data.preview) setLinkPreview(data.preview)
      } catch { setLinkPreview(null) }
    }, 800)
    return () => clearTimeout(debounce)
  }, [caption, mode])

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

    // File size validation — 25MB max
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    const oversized = files.filter(f => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      const names = oversized.map(f => f.name).join(', ');
      alert(`File too large (max 25MB): ${names}`);
      const validFiles = files.filter(f => f.size <= MAX_SIZE);
      if (validFiles.length === 0) return;
      // Continue with only valid files
      files.splice(0, files.length, ...validFiles);
    }

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
      // Try multiple MIME types for Android WebView compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/ogg;codecs=opus',
        ''
      ]
      const mimeType = mimeTypes.find(mt => mt && MediaRecorder.isTypeSupported(mt)) || ''
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
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
      if (import.meta.env.DEV) console.error('Microphone access denied:', err)
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
      if (import.meta.env.DEV) console.error('Trim video item error:', err)
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
      if (import.meta.env.DEV) console.error('Mix error:', err)
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

      // Text status submission
      if (mode === 'text' && text.trim()) {
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
          addYoursPrompt: addYoursPrompt || undefined,
          textAnimation: textAnimation !== 'none' ? textAnimation : undefined,
          isViewOnce: isViewOnce || undefined
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
            volume: musicVolume,
            loop: musicLoop
          }))
        }

        await createMediaStatus(formData)
        if (i < itemsToUpload.length - 1) {
          await new Promise(r => setTimeout(r, 200))
        }
      }
      onClose()
    } catch (err) {
      if (import.meta.env.DEV) console.error('Submit status error:', err)
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

            <button onClick={() => setMode('location')} className="create-option">
              <MapPin size={28} color="#00a884" />
              <span>Location</span>
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

  // ────────── LOCATION MODE ──────────
  if (mode === 'location') {
    return (
      <div className="create-status-overlay" style={{ background: '#1a1a2e' }}>
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={() => setMode('select')}><X color="#fff" size={24} /></button>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, margin: 0 }}>📍 Share Location</h3>
            <div style={{ width: 24 }} />
          </div>

          {/* Get current location button */}
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setSelectedLocation({
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      name: 'Current Location',
                      address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                    });
                  },
                  () => alert('Location access denied'),
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }
            }}
            style={{
              width: '100%', padding: '14px', background: '#00a884', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginBottom: '12px', cursor: 'pointer'
            }}
          >
            <Navigation size={18} /> Share Current Location
          </button>

          {/* Location input */}
          <input
            type="text"
            placeholder="Search for a place..."
            value={selectedLocation?.name === 'Current Location' ? '' : (selectedLocation?.name || '')}
            onChange={(e) => setSelectedLocation({
              latitude: 0, longitude: 0,
              name: e.target.value, address: ''
            })}
            style={{
              width: '100%', padding: '12px 16px', background: '#0b141a', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px',
              fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px'
            }}
          />

          {/* Selected location preview */}
          {selectedLocation && (
            <div style={{
              padding: '12px 16px', background: '#0b141a', borderRadius: '10px',
              border: '1px solid #00a884', marginBottom: '12px'
            }}>
              <p style={{ color: '#00a884', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> {selectedLocation.name}
              </p>
              {selectedLocation.address && <p style={{ color: '#8696a0', fontSize: '12px', margin: '4px 0 0' }}>{selectedLocation.address}</p>}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={async () => {
              if (!selectedLocation) return;
              setIsSharing(true);
              try {
                const token = getAuthToken();
                const res = await fetch(`${resolveApiBase()}/status`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({
                    type: 'location',
                    content: selectedLocation.name,
                    locationData: selectedLocation,
                    privacy,
                    excludedUsers: privacy === 'contacts_except' ? selectedUsers : [],
                    includedUsers: privacy === 'only_share_with' ? selectedUsers : []
                  })
                });
                if (res.ok) onClose?.();
              } catch (err) {
                console.error('Location status error:', err);
              } finally {
                setIsSharing(false);
              }
            }}
            disabled={!selectedLocation || isSharing}
            style={{
              width: '100%', padding: '14px', background: selectedLocation ? '#00a884' : '#2a3942',
              color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px',
              fontWeight: 600, cursor: selectedLocation ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {isSharing ? 'Sharing...' : 'Share Location Status'}
          </button>
        </div>
      </div>
    );
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
          
          {showRichTextEditor ? (
            <div style={{ width: '100%', padding: '0 16px' }}>
              <RichTextEditor
                value={text}
                onChange={setText}
                backgroundColor={selectedColor.bg}
                fontColor={selectedColor.font}
              />
            </div>
          ) : (
            <>
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>
                <button
                  onClick={() => setShowRichTextEditor(true)}
                  title="Rich text formatting"
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                    padding: '6px 8px', color: '#e9edef', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <span style={{ fontWeight: 700 }}>B</span><span style={{ fontStyle: 'italic' }}>I</span>
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a status..."
                style={{ color: selectedColor.font, fontFamily: FONT_STYLES[fontIndex].family, ...getAnimationStyle(textAnimation) }}
                maxLength={700}
              />
            </>
          )}

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

          {/* Link Preview Card (auto-detected from caption) */}
          {linkPreview && mode === 'text' && (
            <div style={{
              margin: '0 16px 8px', padding: 0,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 468, width: '100%', alignSelf: 'center'
            }}>
              {linkPreview.image && (
                <img src={linkPreview.image} alt=""
                  style={{ width: '100%', height: 120, objectFit: 'cover' }} loading="lazy" />
              )}
              <div style={{ padding: '8px 12px' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {linkPreview.title}
                </div>
                <div style={{ color: '#8696a0', fontSize: 11, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {linkPreview.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {linkPreview.favicon && (
                    <img src={linkPreview.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} loading="lazy" />
                  )}
                  <span style={{ color: '#00a884', fontSize: 11 }}>{linkPreview.domain}</span>
                </div>
              </div>
              <button
                onClick={() => setLinkPreview(null)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          )}

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
          {mode === 'image' && <BottomToolBtn icon={<span style={{ fontSize: '18px' }}>✂️</span>} label="Sticker" active={activeBottomSheet === 'sticker'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'sticker' ? null : 'sticker')} />}
          {mode === 'image' && <BottomToolBtn icon={<span style={{ fontSize: '18px' }}>🎨</span>} label="Filter" active={activeBottomSheet === 'filter'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'filter' ? null : 'filter')} />}
          <BottomToolBtn icon={<Users size={20} />} label="Privacy" active={activeBottomSheet === 'privacy'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'privacy' ? null : 'privacy')} />
          {mode === 'image' && <BottomToolBtn icon={<LayoutGrid size={20} />} label="Collage" active={activeBottomSheet === 'collage'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'collage' ? null : 'collage')} />}
          {mode === 'image' && <BottomToolBtn icon={<MapPin size={20} />} label="Location" active={activeBottomSheet === 'location'} onClick={() => setActiveBottomSheet(activeBottomSheet === 'location' ? null : 'location')} />}
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
                  <InstagramTrimBar
                    duration={videoRef.current?.duration || 60}
                    startTime={trimStart}
                    endTime={trimEnd}
                    onChange={(start, end) => {
                      setTrimStart(start); setTrimEnd(end)
                      // Seek video to new start position (like Instagram)
                      const vid = videoRef.current
                      if (vid) { vid.currentTime = start; vid.play().catch(() => {}) }
                    }}
                  />
                  <div style={{ color: '#00a884', fontSize: '13px', textAlign: 'center', marginTop: 8 }}>
                    {trimStart.toFixed(1)}s — {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)
                  </div>
                </>
              )}

              {/* Music Sheet — browse/search mode (hidden when track selected) */}
              {activeBottomSheet === 'music' && !selectedMusicData && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>🎵 Add Music</h3>
                  <MusicPicker
                    currentMusic={selectedMusicData}
                    onSelect={async (music) => {
                      setSelectedMusicData(music)
                      if (music?.file) {
                        setMusicFile(music.file)
                        setMusicEnd(15)
                      } else if (music?.url) {
                        // Online track (Spotify/iTunes preview) — fetch and convert to File for FFmpeg
                        setMusicLoading(true)
                        try {
                          const res = await fetch(music.url)
                          const blob = await res.blob()
                          const ext = (blob.type || '').includes('mpeg') ? 'mp3' : 'm4a'
                          const file = new File([blob], `${music.title || 'track'}.${ext}`, { type: blob.type || 'audio/mpeg' })
                          setMusicFile(file)
                          setMusicEnd(15)
                          setMusicStart(0)
                        } catch (e) {
                          if (import.meta.env.DEV) console.error('[Music] Failed to fetch preview:', e)
                          setMusicFile(null)
                        } finally {
                          setMusicLoading(false)
                        }
                      }
                    }}
                    onClose={() => setActiveBottomSheet(null)}
                  />
                </>
              )}

              {/* ═══════ Instagram-style Music Trim View ═══════ */}
              {activeBottomSheet === 'music' && selectedMusicData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 8px' }}>
                  {/* Track info header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selectedMusicData.cover ? (
                      <img src={selectedMusicData.cover} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(135deg, #1DB954, #1ed760)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={24} color="#fff" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMusicData.title}</div>
                      <div style={{ color: '#8696a0', fontSize: 12 }}>{selectedMusicData.artist}</div>
                    </div>
                    <button onClick={() => { setSelectedMusicData(null); setMusicFile(null); setAudioDuration(0); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8696a0' }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Loading state */}
                  {musicLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0', color: '#8696a0', fontSize: 13 }}>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#1DB954', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Downloading track preview...
                    </div>
                  )}

                  {/* Trim section */}
                  {!musicLoading && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '16px 12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#8696a0', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trim Music</span>
                        <span style={{ color: '#1DB954', fontSize: 13, fontWeight: 600 }}>{(musicEnd - musicStart).toFixed(1)}s</span>
                      </div>

                      {/* Time labels above waveform */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                        <span style={{ color: '#1DB954', fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMusicTime(musicStart)}</span>
                        <span style={{ color: '#8696a0', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{formatMusicTime(audioDuration)}</span>
                        <span style={{ color: '#1DB954', fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMusicTime(musicEnd)}</span>
                      </div>

                      {/* Zoom controls */}
                      {audioDuration > 20 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                          <button onClick={() => setTrimZoom(z => Math.max(1, z - 0.5))} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#8696a0', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ color: '#8696a0', fontSize: 10, minWidth: 30, textAlign: 'center' }}>{trimZoom.toFixed(1)}×</span>
                          <button onClick={() => setTrimZoom(z => Math.min(4, z + 0.5))} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#8696a0', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          {trimZoom > 1 && <button onClick={() => { setTrimZoom(1); setTrimScrollPct(0.5) }} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,165,0,0.2)', border: 'none', color: '#ffa500', fontSize: 9, cursor: 'pointer', fontWeight: 700 }}>FIT</button>}
                        </div>
                      )}

                      {/* Full waveform visualization with selection overlay and playback cursor */}
                      <div
                        style={{ position: 'relative', height: 52, marginBottom: 4, overflow: 'hidden', borderRadius: 6 }}
                        onWheel={(e) => {
                          if (audioDuration > 20) {
                            e.preventDefault()
                            const delta = e.deltaY > 0 ? -0.3 : 0.3
                            setTrimZoom(z => Math.max(1, Math.min(4, z + delta)))
                          }
                        }}
                      >
                        {/* Zoomed waveform container — scrolls when zoomed */}
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: trimZoom > 1 ? `${-(trimScrollPct * (trimZoom - 1) * 100)}%` : 0,
                          width: `${trimZoom * 100}%`,
                          display: 'flex', alignItems: 'center', gap: trimZoom > 2 ? 0.5 : 1,
                          padding: '0 2px', transition: 'left 0.15s ease'
                        }}>
                          {(() => {
                            const bars = waveformData.length > 0 ? waveformData : FALLBACK_WAVEFORM
                            return bars.map((amp, i, arr) => {
                            const pct = i / arr.length
                            const timePos = pct * (audioDuration || 1)
                            const inSelection = timePos >= musicStart && timePos <= musicEnd
                            const isPast = musicCurrentTime > 0 && timePos <= musicCurrentTime && inSelection
                            return (
                              <div key={i} style={{
                                flex: 1, minWidth: trimZoom > 2 ? 1.5 : 2,
                                height: `${Math.max(8, amp * 100)}%`,
                                background: isPast ? '#fff' : inSelection ? '#1DB954' : 'rgba(255,255,255,0.15)',
                                borderRadius: 1, transition: 'background 0.1s'
                              }} />
                            )
                          })
                          })()}
                        </div>
                        {/* Dimmed areas outside selection — offset-aware for zoom */}
                        {(() => {
                          const baseLeft = (musicStart / (audioDuration || 1)) * 100
                          const baseRightStart = (musicEnd / (audioDuration || 1)) * 100
                          const zoomOffset = trimZoom > 1 ? -(trimScrollPct * (trimZoom - 1) * 100) : 0
                          const dimLeftW = Math.max(0, baseLeft + zoomOffset)
                          const dimRightStart = baseRightStart + zoomOffset
                          const dimRightW = Math.max(0, 100 - dimRightStart)
                          return (
                            <>
                              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${dimLeftW}%`, background: 'rgba(0,0,0,0.55)', borderRadius: '6px 0 0 6px', pointerEvents: 'none', zIndex: 2 }} />
                              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${dimRightStart}%`, width: `${dimRightW}%`, background: 'rgba(0,0,0,0.55)', borderRadius: '0 6px 6px 0', pointerEvents: 'none', zIndex: 2 }} />
                            </>
                          )
                        })()}
                        {/* Playback cursor */}
                        {isMusicPlaying && (
                          <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: '#fff', borderRadius: 1, boxShadow: '0 0 6px rgba(255,255,255,0.5)', left: `${((musicCurrentTime / (audioDuration || 1)) * 100) + (trimZoom > 1 ? -(trimScrollPct * (trimZoom - 1) * 100) : 0)}%`, transition: 'left 0.08s linear', pointerEvents: 'none', zIndex: 3 }} />
                        )}
                      </div>

                      {/* Scrub slider — slide to position anywhere in the song */}
                      <div style={{ position: 'relative', width: '100%', height: 28, marginTop: 2 }}>
                        <input
                          type="range"
                          min={0}
                          max={audioDuration || 1}
                          step={0.05}
                          value={musicCurrentTime}
                          onChange={(e) => handleMusicScrub(Number(e.target.value))}
                          className="music-scrub-slider"
                          style={{
                            width: '100%', height: '100%',
                            appearance: 'none', WebkitAppearance: 'none',
                            background: 'transparent', cursor: 'pointer',
                            outline: 'none'
                          }}
                        />
                        <style>{`
                          .music-scrub-slider::-webkit-slider-thumb {
                            -webkit-appearance: none; appearance: none;
                            width: 16px; height: 16px; border-radius: 50%;
                            background: #1DB954; border: 2px solid #fff;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                            cursor: pointer; margin-top: -6px;
                          }
                          .music-scrub-slider::-moz-range-thumb {
                            width: 16px; height: 16px; border-radius: 50%;
                            background: #1DB954; border: 2px solid #fff;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                            cursor: pointer;
                          }
                          .music-scrub-slider::-webkit-slider-runnable-track {
                            height: 4px; border-radius: 2px;
                            background: rgba(255,255,255,0.15);
                          }
                          .music-scrub-slider::-moz-range-track {
                            height: 4px; border-radius: 2px;
                            background: rgba(255,255,255,0.15);
                          }
                        `}</style>
                      </div>

                      {/* InstagramTrimBar — draggable trim handles on the full duration */}
                      <InstagramTrimBar
                        duration={audioDuration || 30}
                        startTime={musicStart}
                        endTime={musicEnd}
                        onChange={handleMusicTrimChange}
                        color="#1DB954"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ color: '#1DB954', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{formatMusicTime(musicStart)}</span>
                        <span style={{ color: '#8696a0', fontSize: 11 }}>{formatMusicTime(audioDuration)}</span>
                        <span style={{ color: '#1DB954', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{formatMusicTime(musicEnd)}</span>
                      </div>
                    </div>
                  )}

                  {/* Play / Pause + Loop controls */}
                  {!musicLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                      <button onClick={() => setMusicLoop(l => !l)}
                        title={musicLoop ? 'Loop enabled — tap to disable' : 'Loop disabled — tap to enable'}
                        style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: musicLoop ? 'rgba(29,185,84,0.2)' : 'rgba(255,255,255,0.1)',
                          border: musicLoop ? '2px solid #1DB954' : '1px solid rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={musicLoop ? '#1DB954' : '#8696a0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                      </button>
                      <button onClick={toggleMusicPreview}
                        style={{ width: 56, height: 56, borderRadius: '50%', background: '#1DB954', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,185,84,0.4)' }}>
                        {isMusicPlaying ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Zoom scroll position slider (only visible when zoomed) */}
                  {!musicLoading && trimZoom > 1 && (
                    <div style={{ padding: '0 4px' }}>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={trimScrollPct}
                        onChange={(e) => setTrimScrollPct(Number(e.target.value))}
                        style={{ width: '100%', height: 20, accentColor: '#1DB954' }}
                      />
                    </div>
                  )}

                  {/* Duration picker — adapts to actual song length */}
                  {!musicLoading && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {[15, 30, 60].filter(dur => dur <= Math.max(audioDuration, 15)).map(dur => (
                        <button key={dur} onClick={() => {
                          const newEnd = Math.min(dur, audioDuration || 30)
                          setMusicStart(0); setMusicEnd(newEnd)
                          const audio = musicPreviewRef.current
                          if (audio) { audio.currentTime = 0 }
                        }}
                          style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: Math.abs((musicEnd - musicStart) - dur) < 0.1 ? '2px solid #1DB954' : '1px solid rgba(255,255,255,0.2)', background: Math.abs((musicEnd - musicStart) - dur) < 0.1 ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.06)', color: Math.abs((musicEnd - musicStart) - dur) < 0.1 ? '#1DB954' : '#8696a0', cursor: 'pointer' }}
                        >{dur}s</button>
                      ))}
                      {audioDuration > 15 && (
                        <button onClick={() => {
                          setMusicStart(0); setMusicEnd(audioDuration)
                          const audio = musicPreviewRef.current
                          if (audio) { audio.currentTime = 0 }
                        }}
                          style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: Math.abs(musicEnd - musicStart - audioDuration) < 0.1 ? '2px solid #1DB954' : '1px solid rgba(255,255,255,0.2)', background: Math.abs(musicEnd - musicStart - audioDuration) < 0.1 ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.06)', color: Math.abs(musicEnd - musicStart - audioDuration) < 0.1 ? '#1DB954' : '#8696a0', cursor: 'pointer' }}
                        >Full</button>
                      )}
                    </div>
                  )}

                  {/* Volume control */}
                  {!musicLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
                      <Volume2 size={16} color="#8696a0" />
                      <input type="range" min={0} max={1} step={0.05} value={musicVolume}
                        onChange={(e) => setMusicVolume(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#1DB954' }} />
                      <span style={{ color: '#8696a0', fontSize: 12, minWidth: 36, textAlign: 'right' }}>{Math.round(musicVolume * 100)}%</span>
                    </div>
                  )}

                  {/* Done button */}
                  {!musicLoading && (
                    <button onClick={() => setActiveBottomSheet(null)}
                      style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#1DB954', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >Done</button>
                  )}
                </div>
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

              {/* Photo Sticker Sheet */}
              {activeBottomSheet === 'sticker' && mode === 'image' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>✂️ Photo Sticker</h3>
                  {mediaItems[activeIndex]?.preview && (
                    <PhotoStickerTool
                      imageUrl={mediaItems[activeIndex].preview}
                      onStickerCreated={(stickerUrl) => {
                        // Add as overlay sticker
                        setStickers(prev => [...prev, {
                          id: Date.now(),
                          src: stickerUrl,
                          x: 50, y: 50,
                          scale: 1, rotation: 0
                        }])
                        setActiveBottomSheet(null)
                      }}
                      onClose={() => setActiveBottomSheet(null)}
                    />
                  )}
                </>
              )}

              {/* Collage Sheet */}
              {activeBottomSheet === 'collage' && mode === 'image' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>🖼️ Collage</h3>
                  <CollageBuilder
                    onComplete={(data) => {
                      setCollageData(data)
                      setActiveBottomSheet(null)
                    }}
                    onCancel={() => setActiveBottomSheet(null)}
                  />
                </>
              )}

              {/* Location Sheet */}
              {activeBottomSheet === 'location' && (
                <>
                  <h3 style={{ color: '#e9edef', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>📍 Location</h3>
                  <LocationSticker
                    onSelect={(loc) => {
                      setSelectedLocation(loc)
                      setActiveBottomSheet(null)
                    }}
                    onClose={() => setActiveBottomSheet(null)}
                  />
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
                  {/* View Once toggle */}
                  <div style={{ marginTop: 12, padding: '12px', background: isViewOnce ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.05)', border: isViewOnce ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setIsViewOnce(!isViewOnce)}>
                    <span style={{ fontSize: 20 }}>🔥</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>View Once</div>
                      <div style={{ color: '#8696a0', fontSize: 11 }}>Status disappears after being viewed once</div>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 12, background: isViewOnce ? '#00a884' : 'rgba(255,255,255,0.2)', padding: 2, cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: isViewOnce ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                    </div>
                  </div>
                </>
              )}

              {/* More Sheet (Schedule, Poll, Reply, Quality, Duration, Animation) */}
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
                  {mode === 'text' && (
                    <div style={{ marginTop: 12 }}>
                      <h4 style={{ color: '#e9edef', fontSize: '14px', fontWeight: 500, margin: '0 0 8px' }}>✨ Text Animation</h4>
                      <TextAnimationPicker selected={textAnimation} onSelect={setTextAnimation} />
                    </div>
                  )}
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
                      <img src={c.profilePicture || '/default-avatar.svg'} alt="" />
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
