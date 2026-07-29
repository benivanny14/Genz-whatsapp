import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Search, Star, Clock, CheckCircle, Plus } from 'lucide-react';

const LocationTaggingPanel = ({ onClose, status, onLocationAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customLocation, setCustomLocation] = useState('');
  const [savedLocations, setSavedLocations] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const mockLocations = [
    { id: 1, name: 'Dar es Salaam', country: 'Tanzania', lat: -6.7924, lng: 39.2083 },
    { id: 2, name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
    { id: 3, name: 'Kampala', country: 'Uganda', lat: 0.3476, lng: 32.5825 },
    { id: 4, name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
    { id: 5, name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
    { id: 6, name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
    { id: 7, name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898 },
    { id: 8, name: 'Addis Ababa', country: 'Ethiopia', lat: 8.9634, lng: 38.7653 }
  ];

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
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/location`, {
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

  const filteredLocations = mockLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {searchQuery && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Results</p>
              <div className="space-y-2">
                {filteredLocations.map((location) => (
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
