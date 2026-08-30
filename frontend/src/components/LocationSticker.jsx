import React, { useState, useEffect, useCallback } from 'react'
import { MapPin, Search, Navigation } from 'lucide-react'
import { resolveApiBase } from '../utils/resolveApiBase'
import { getAuthToken } from '../utils/tokenStore'

/**
 * Location picker + sticker preview for status creation.
 * Uses OpenStreetMap Nominatim for geocoding (no API key needed).
 */
const LocationSticker = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [myLocation, setMyLocation] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [searchDebounce, setSearchDebounce] = useState(null)

  // Get user's current location
  const getMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'My Location'
        })
      },
      () => { /* User denied permission */ }
    )
  }, [])

  useEffect(() => {
    getMyLocation()
  }, [getMyLocation])

  // Search for places
  const searchPlaces = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setResults(data.map(r => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        name: r.display_name?.split(',').slice(0, 3).join(',') || q,
        type: r.type
      })))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (value) => {
    setQuery(value)
    if (searchDebounce) clearTimeout(searchDebounce)
    setSearchDebounce(setTimeout(() => searchPlaces(value), 400))
  }

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc)
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation)
      onClose?.()
    }
  }

  // Save to backend (optional)
  const saveToBackend = async (location) => {
    try {
      const token = getAuthToken()
      await fetch(`${resolveApiBase()}/status/location-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(location)
      }).catch(() => {})
    } catch {}
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Selected location preview */}
      {selectedLocation && (
        <div style={{
          margin: '0 0 12px',
          padding: '10px 14px',
          background: 'rgba(0,168,132,0.15)',
          border: '1px solid #00a884',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <MapPin size={18} color="#00a884" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{selectedLocation.name}</div>
            <div style={{ color: '#8696a0', fontSize: 11 }}>
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </div>
          </div>
          <button
            onClick={handleConfirm}
            style={{
              background: '#00a884', border: 'none', borderRadius: 8,
              padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* My Location button */}
      {myLocation && !selectedLocation && (
        <button
          onClick={() => handleSelectLocation(myLocation)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '12px', background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.3)',
            borderRadius: 12, cursor: 'pointer', color: '#fff', marginBottom: 10
          }}
        >
          <Navigation size={18} color="#00a884" />
          <span style={{ fontSize: 14 }}>Use my current location</span>
        </button>
      )}

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', marginBottom: 10
      }}>
        <Search size={16} color="#8696a0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search for a place..."
          style={{
            flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none'
          }}
        />
        {loading && <span style={{ color: '#8696a0', fontSize: 12 }}>...</span>}
      </div>

      {/* Results */}
      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => handleSelectLocation(r)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', background: 'none', border: 'none',
              cursor: 'pointer', color: '#e9edef', textAlign: 'left',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 0
            }}
          >
            <MapPin size={16} color="#8696a0" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, lineHeight: 1.3 }}>{r.name}</span>
          </button>
        ))}
        {query.length >= 2 && results.length === 0 && !loading && (
          <div style={{ color: '#8696a0', fontSize: 13, padding: '12px', textAlign: 'center' }}>
            No places found. Try a different search.
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Renders a location sticker overlay on a status image.
 */
export const LocationStickerOverlay = ({ location }) => {
  if (!location) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      background: 'rgba(0,168,132,0.9)',
      backdropFilter: 'blur(4px)',
      borderRadius: 12,
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: '#fff',
      zIndex: 11,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
    }}>
      <MapPin size={14} />
      <span style={{ fontSize: 12, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {location.name || 'Location'}
      </span>
    </div>
  )
}

export default LocationSticker
