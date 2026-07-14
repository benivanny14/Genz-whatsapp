import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Send, Clock, Share2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LocationPicker = ({ onClose, onLocationSelect, currentUser, selectedChat }) => {
  const [mapCenter, setMapCenter] = useState({ lat: -6.2088, lng: 35.2757 }); // Default: Dar es Salaam
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [liveDuration, setLiveDuration] = useState(15); // minutes
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Search for locations
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Using OpenStreetMap Nominatim API for search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a location from search results
  const selectSearchResult = (result) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
      name: result.name || result.display_name.split(',')[0]
    };
    setSelectedLocation(location);
    setMapCenter({ lat: location.lat, lng: location.lng });
    setSearchResults([]);
    setSearchQuery('');
  };

  // Handle map click to select location
  const handleMapClick = (lat, lng) => {
    setSelectedLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
  };

  // Send location
  const handleSendLocation = () => {
    if (!selectedLocation) return;

    const locationData = {
      type: isLiveLocation ? 'live_location' : 'static_location',
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      address: selectedLocation.address,
      timestamp: Date.now(),
      ...(isLiveLocation && { duration: liveDuration * 60 * 1000 }) // Convert to milliseconds
    };

    onLocationSelect(locationData);
    onClose();
  };

  // Center map on user's location
  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setSelectedLocation({
        ...userLocation,
        address: 'Current Location'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <h2 className="text-white text-xl font-semibold flex items-center gap-2">
            <MapPin className="text-[#00a884]" />
            Share Location
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Map Area */}
          <div className="flex-1 relative bg-[#0d1b2a]">
            {/* Search Bar */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-[#1a2e35] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a2e35] rounded-lg border border-[#00a884]/30 max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectSearchResult(result)}
                        className="w-full text-left px-4 py-3 hover:bg-[#00a884]/10 text-white text-sm border-b border-[#00a884]/20 last:border-0"
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-gray-400 text-xs truncate">{result.display_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Map Placeholder (In production, use actual map library like Leaflet) */}
            <div className="w-full h-full flex items-center justify-center relative">
              <div className="text-center">
                <MapPin className="text-[#00a884] mx-auto mb-4" size={64} />
                <p className="text-gray-400">Map View</p>
                <p className="text-gray-500 text-sm mt-2">
                  {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </p>
              </div>

              {/* Selected Location Marker */}
              {selectedLocation && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative">
                    <MapPin className="text-[#00a884]" size={32} />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#00a884] rounded-full animate-ping" />
                  </div>
                </motion.div>
              )}

              {/* Click to select instruction */}
              {!selectedLocation && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a2e35] px-4 py-2 rounded-lg text-white text-sm">
                  Click on map to select location
                </div>
              )}
            </div>

            {/* Center on User Button */}
            <button
              onClick={centerOnUser}
              className="absolute bottom-4 right-4 bg-[#00a884] text-white p-3 rounded-full hover:bg-[#008f72] transition-colors shadow-lg"
              title="Center on my location"
            >
              <Navigation size={24} />
            </button>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-[#1a2e35] p-4 flex flex-col border-l border-[#00a884]/20">
            {/* Location Type Toggle */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">Location Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsLiveLocation(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    !isLiveLocation
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  <MapPin size={20} className="mx-auto mb-1" />
                  <span className="text-sm">Static</span>
                </button>
                <button
                  onClick={() => setIsLiveLocation(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    isLiveLocation
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  <Share2 size={20} className="mx-auto mb-1" />
                  <span className="text-sm">Live</span>
                </button>
              </div>
            </div>

            {/* Live Location Duration */}
            {isLiveLocation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6"
              >
                <label className="text-white text-sm font-medium mb-3 block flex items-center gap-2">
                  <Clock size={16} />
                  Share Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setLiveDuration(minutes)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        liveDuration === minutes
                          ? 'bg-[#00a884] text-white'
                          : 'bg-[#0b141a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Selected Location Info */}
            {selectedLocation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 bg-[#0b141a] rounded-lg p-4 mb-4"
              >
                <h3 className="text-white font-medium mb-2">Selected Location</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-[#00a884] mt-1 flex-shrink-0" />
                    <p className="text-gray-300 text-sm">{selectedLocation.address}</p>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Privacy Notice */}
            <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Lock size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-xs">
                  {isLiveLocation
                    ? 'Your live location will be shared with this contact. You can stop sharing anytime.'
                    : 'Your current location will be shared once. This does not update automatically.'}
                </p>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendLocation}
              disabled={!selectedLocation}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                selectedLocation
                  ? 'bg-[#00a884] text-white hover:bg-[#008f72]'
                  : 'bg-[#0b141a] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
              Send Location
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationPicker;
