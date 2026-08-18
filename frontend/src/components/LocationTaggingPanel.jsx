import { getAuthToken } from '../utils/tokenStore';
import React, { useState, useEffect, useRef } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, MapPin, Navigation, Search, Star, CheckCircle, Plus, Loader } from 'lucide-react';

const LocationTaggingPanel = ({ onClose, status, onLocationAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customLocation, setCustomLocation] = useState('');
  const [savedLocations, setSavedLocations] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    loadSavedLocations();
    loadRecentLocations();
  }, []);

  const loadSavedLocations = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('genz_saved_locations') || '[]');
      setSavedLocations(saved);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

  const loadRecentLocations = () => {
    try {
      const recent = JSON.parse(localStorage.getItem('genz_recent_locations') || '[]');
      setRecentLocations(recent);
    } catch (error) {
      console.error('Error loading recent locations:', error);
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    addToRecent(location);
  };

  const addToRecent = (location) => {
    const updated = [location, ...recentLocations.filter(l => l.id !== location.id)].slice(0, 5);
    setRecentLocations(updated);
    localStorage.setItem('genz_recent_locations', JSON.stringify(updated));
  };

  const handleSaveLocation = () => {
    if (!selectedLocation) return;
    
    const updated = [...savedLocations, selectedLocation];
    setSavedLocations(updated);
    localStorage.setItem('genz_saved_locations', JSON.stringify(updated));
  };

  const handleRemoveSavedLocation = (locationId) => {
    const updated = savedLocations.filter(l => l.id !== locationId);
    setSavedLocations(updated);
    localStorage.setItem('genz_saved_locations', JSON.stringify(updated));
  };

  const handleAddCustomLocation = () => {
    if (!customLocation.trim()) return;
    
    const customLoc = {
      id: Date.now(),
      name: customLocation,
      country: 'Custom',
      lat: 0,
      lng: 0,
      isCustom: true
    };
    
    setSelectedLocation(customLoc);
    setCustomLocation('');
  };

  const handleConfirm = async () => {
    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          address: selectedLocation.name,
          placeName: selectedLocation.country
        })
      });

      if (onLocationAdd) {
        onLocationAdd(selectedLocation);
      }
      onClose();
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add location. Please try again.');
    }
  };

  // Debounced real geocoding via OpenStreetMap Nominatim (no API key needed).
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError('');
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
        const data = await res.json();
        setSearchResults((data || []).map((r, i) => ({
          id: i + 1,
          name: r.display_name?.split(',').slice(0, 2).join(',') || r.display_name || query,
          country: r.address?.country || '',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        })));
      } catch (error) {
        console.error('Error geocoding location:', error);
        setSearchError('Could not search locations right now.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MapPin className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Add Location</h2>
              <p className="text-white/60 text-xs">Tag your status with location</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Custom Location */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Custom location..."
              className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
            <button
              onClick={handleAddCustomLocation}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Recent Locations */}
          {recentLocations.length > 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Recent</p>
              <div className="space-y-2">
                {recentLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelectLocation(location)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedLocation?.id === location.id
                        ? 'bg-[#00a884]/20 border border-[#00a884]'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <MapPin size={16} className={selectedLocation?.id === location.id ? 'text-[#00a884]' : 'text-white/60'} />
                    <div className="text-left flex-1">
                      <p className="text-white text-sm">{location.name}</p>
                      <p className="text-white/40 text-xs">{location.country}</p>
                    </div>
                    {selectedLocation?.id === location.id && (
                      <CheckCircle className="text-[#00a884]" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Locations */}
          {savedLocations.length > 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Saved</p>
              <div className="space-y-2">
                {savedLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelectLocation(location)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedLocation?.id === location.id
                        ? 'bg-[#00a884]/20 border border-[#00a884]'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Star size={16} className={selectedLocation?.id === location.id ? 'text-[#00a884]' : 'text-yellow-400'} />
                    <div className="text-left flex-1">
                      <p className="text-white text-sm">{location.name}</p>
                      <p className="text-white/40 text-xs">{location.country}</p>
                    </div>
                    {selectedLocation?.id === location.id && (
                      <CheckCircle className="text-[#00a884]" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery.trim().length >= 3 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Results</p>
              {searching && (
                <div className="flex items-center gap-2 text-white/60 text-sm py-3">
                  <Loader size={16} className="animate-spin" />
                  Searching...
                </div>
              )}
              {!searching && searchError && (
                <p className="text-yellow-500 text-sm py-2">{searchError}</p>
              )}
              {!searching && !searchError && searchResults.length === 0 && (
                <p className="text-white/40 text-sm py-2">No locations found — type a longer query or add a custom location</p>
              )}
              <div className="space-y-2">
                {searchResults.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelectLocation(location)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedLocation?.id === location.id
                        ? 'bg-[#00a884]/20 border border-[#00a884]'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Navigation size={16} className={selectedLocation?.id === location.id ? 'text-[#00a884]' : 'text-white/60'} />
                    <div className="text-left flex-1">
                      <p className="text-white text-sm">{location.name}</p>
                      <p className="text-white/40 text-xs">{location.country}</p>
                    </div>
                    {selectedLocation?.id === location.id && (
                      <CheckCircle className="text-[#00a884]" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Location */}
          {selectedLocation && (
            <div className="bg-[#00a884]/20 border border-[#00a884] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="text-[#00a884]" size={18} />
                  <p className="text-white font-medium">Selected Location</p>
                </div>
                <button
                  onClick={handleSaveLocation}
                  className="text-[#00a884] text-sm flex items-center gap-1"
                >
                  <Star size={14} />
                  Save
                </button>
              </div>
              <p className="text-white text-lg">{selectedLocation.name}</p>
              <p className="text-white/60 text-sm">{selectedLocation.country}</p>
              {!selectedLocation.isCustom && (
                <p className="text-white/40 text-xs mt-1">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Add Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationTaggingPanel;
