import React, { useState, useRef, useCallback } from 'react'
import { useStatusContext } from '../context/StatusContext'
import { X, Type, Image, Video, Music, Scissors, Send, Volume2, RotateCw, Paintbrush, Eraser, Share2, Split } from 'lucide-react'
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
  const [rotation, setRotation] = useState(0)
  const [autoSplit, setAutoSplit] = useState(false)
  const [crossPost, setCrossPost] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
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

  // Initialize FFmpeg
  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load()
      ffmpegRef.current = ffmpeg
    }
    return ffmpegRef.current
  }

  // Handle file selection
  const handleFileSelect = (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setTrimEnd(type === 'video' ? 30 : 0)
    setMode(type)
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

  const handleSubmit = async () => {
    const currentFont = FONT_STYLES[fontIndex]?.id || 'sans'
    if (mode === 'text') {
      await createTextStatus({
        text,
        backgroundColor: selectedColor.bg,
        fontColor: selectedColor.font,
        fontStyle: currentFont,
        collabUsername: taggedContact.trim()
      })
      onClose()
      return
    }

    // For image/video
    let finalFile = mediaFile
    
    if (mode === 'video') {
      finalFile = await trimVideo()
      if (musicFile) {
        finalFile = await mixAudioWithVideo(finalFile, musicFile)
      }
    }

    const formData = new FormData()
    formData.append('file', finalFile)
    formData.append('caption', caption)
    formData.append('fontStyle', currentFont)
    if (taggedContact.trim()) formData.append('collabUsername', taggedContact.trim())
    formData.append('duration', trimEnd - trimStart)
    
    if (musicFile) {
      formData.append('music', JSON.stringify({
        title: musicFile.name,
        startTime: musicStart,
        endTime: musicEnd,
        volume: musicVolume
      }))
    }

    await createMediaStatus(formData)
    onClose()
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mode === 'image' && (
              <button 
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                title="Rotate 90°"
              >
                <RotateCw size={20} />
              </button>
            )}
            {mode === 'video' && (
              <button 
                type="button"
                onClick={() => setAutoSplit(!autoSplit)}
                style={{ background: autoSplit ? '#00a884' : 'transparent', border: '1px solid #00a884', borderRadius: '12px', padding: '2px 8px', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Auto-split into 30s clips"
              >
                <Split size={14} /> Auto 30s Split
              </button>
            )}
            <button 
              type="button"
              onClick={() => setCrossPost(!crossPost)}
              style={{ background: crossPost ? '#1877F2' : 'transparent', border: '1px solid #1877F2', borderRadius: '12px', padding: '2px 8px', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Cross-post to Facebook / Social Story"
            >
              <Share2 size={14} /> Social Story
            </button>
          </div>
          <button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : <Send size={20} />}
          </button>
        </div>

        <div className="media-preview" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mode === 'image' ? (
            <img src={mediaPreview} alt="preview" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }} />
          ) : (
            <video ref={videoRef} src={mediaPreview} controls muted loop style={{ transform: `rotate(${rotation}deg)` }} />
          )}
        </div>

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
    </div>
  )
}

export default CreateStatus
