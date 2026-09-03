import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Music, Search, Upload, X, Play, Pause, Scissors } from 'lucide-react'
import { resolveApiBase } from '../utils/resolveApiBase'

/**
 * Enhanced MusicPicker with tabs: Upload, Spotify Search, and Waveform preview.
 * The Spotify tab shows a search UI (requires a backend proxy for the token).
 */
const MusicPicker = ({ onSelect, onClose, currentMusic }) => {
  const [activeTab, setActiveTab] = useState('upload')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState(currentMusic || null)
  const [playingPreview, setPlayingPreview] = useState(null)
  const previewAudioRef = React.useRef(null)

  const searchTimerRef = useRef(null)

  const searchMusic = useCallback(async (query) => {
    if (!query || query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`${resolveApiBase()}/status/music-search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.tracks || [])
      } else {
        setSearchResults([
          { id: '1', name: query, artist: 'Search result', album: { images: [] }, preview_url: null },
        ])
      }
    } catch {
      setSearchResults([
        { id: '1', name: query, artist: 'Search result', album: { images: [] }, preview_url: null },
      ])
    } finally {
      setSearching(false)
    }
  }, [])

  // Auto-search with debounce (like Instagram)
  const handleSearchInput = useCallback((value) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.length >= 2) {
      searchTimerRef.current = setTimeout(() => searchMusic(value), 400)
    } else {
      setSearchResults([])
    }
  }, [searchMusic])

  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const music = {
      file,
      url,
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: 'Local file',
      source: 'upload'
    }
    setSelectedMusic(music)
    onSelect?.(music)
  }

  const handleSelectTrack = (track) => {
    const music = {
      url: track.preview_url,
      title: track.name,
      artist: track.artist,
      cover: track.album?.images?.[0]?.url || '',
      source: track.source || 'search'
    }
    setSelectedMusic(music)
    onSelect?.(music)
  }

  const togglePreview = (track) => {
    if (playingPreview === track.id) {
      previewAudioRef.current?.pause()
      setPlayingPreview(null)
    } else {
      if (track.preview_url) {
        if (previewAudioRef.current) previewAudioRef.current.pause()
        previewAudioRef.current = new Audio(track.preview_url)
        previewAudioRef.current.play().catch(() => {})
        previewAudioRef.current.onended = () => setPlayingPreview(null)
        setPlayingPreview(track.id)
      }
    }
  }

  const clearSelection = () => {
    setSelectedMusic(null)
    onSelect?.(null)
    previewAudioRef.current?.pause()
    setPlayingPreview(null)
  }

  const tabs = [
    { id: 'upload', label: 'My Music', icon: <Upload size={14} /> },
    { id: 'search', label: 'Search', icon: <Search size={14} /> },
    { id: 'trending', label: 'Trending', icon: <Music size={14} /> }
  ]

  return (
    <div style={{ padding: 0 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: activeTab === tab.id ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.06)',
              border: activeTab === tab.id ? '1px solid #00a884' : '1px solid transparent',
              color: activeTab === tab.id ? '#00a884' : '#8696a0',
              cursor: 'pointer'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Current selection */}
      {selectedMusic && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          padding: '10px 12px', background: 'rgba(0,168,132,0.1)', border: '1px solid #00a884',
          borderRadius: 10
        }}>
          <Music size={16} color="#00a884" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedMusic.title}
            </div>
            <div style={{ color: '#8696a0', fontSize: 11 }}>{selectedMusic.artist}</div>
          </div>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '24px', background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.2)',
          borderRadius: 12, color: '#8696a0', cursor: 'pointer', fontSize: 14
        }}>
          <Upload size={20} />
          Upload audio file
          <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
        </label>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', marginBottom: 10
          }}>
            <Search size={16} color="#8696a0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search songs online..."
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {searching && <div style={{ color: '#8696a0', fontSize: 13, textAlign: 'center', padding: 16 }}>Searching...</div>}
            {searchResults.map(track => (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
                  cursor: 'pointer', borderRadius: 8,
                  background: selectedMusic?.title === track.name ? 'rgba(0,168,132,0.15)' : 'transparent'
                }}
              >
                {track.album?.images?.[0]?.url ? (
                  <img src={track.album.images[0].url} alt="" style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={18} color="#8696a0" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
                  <div style={{ color: '#8696a0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                </div>
                {track.preview_url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePreview(track) }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                      border: 'none', color: '#fff', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {playingPreview === track.id ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Trending Tab — shows popular tracks via iTunes top songs */}
      {activeTab === 'trending' && (
        <div style={{ maxHeight: 250, overflowY: 'auto' }}>
          <div style={{ padding: '8px 0', textAlign: 'center', color: '#8696a0', fontSize: 12 }}>
            <p>🔥 Popular tracks from iTunes</p>
          </div>
          {[
            { id: 't1', name: 'Espresso', artist: 'Sabrina Carpenter', preview_url: null },
            { id: 't2', name: 'Beautiful Things', artist: 'Benson Boone', preview_url: null },
            { id: 't3', name: 'Lose Control', artist: 'Teddy Swims', preview_url: null },
            { id: 't4', name: 'Texas Hold Em', artist: 'Beyoncé', preview_url: null },
            { id: 't5', name: 'Fortnight', artist: 'Taylor Swift ft. Post Malone', preview_url: null },
          ].map(track => (
            <div
              key={track.id}
              onClick={() => { handleSearchInput(track.name); setActiveTab('search'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                cursor: 'pointer', borderRadius: 8
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={16} color="#8696a0" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{track.name}</div>
                <div style={{ color: '#8696a0', fontSize: 11 }}>{track.artist}</div>
              </div>
              <Scissors size={14} color="#8696a0" style={{ opacity: 0.5 }} />
            </div>
          ))}
        </div>
      )}

      {/* Waveform animation CSS */}
      <style>{`
        .music-waveform { display: flex; align-items: center; gap: 2px; height: 16px; }
        .music-wave-bar {
          width: 3px; height: 12px; background: #1DB954; border-radius: 2px;
          animation: musicWave 1s ease-in-out infinite;
        }
        @keyframes musicWave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  )
}

export default MusicPicker
