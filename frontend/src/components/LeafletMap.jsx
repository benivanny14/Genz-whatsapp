import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tile providers — street (OpenStreetMap) and satellite (Esri World Imagery, free, no API key)
const TILE_PROVIDERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
  }
};

// Green pin matching the app's accent color
const liveIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
           <div style="position:absolute;inset:0;border-radius:9999px;border:3px solid #00a884;animation:genz-ping 1.5s cubic-bezier(0,0,.2,1) infinite;opacity:.6;"></div>
           <div style="width:34px;height:34px;border-radius:9999px;border:3px solid #00a884;background:#202c33;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.5);">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="#00a884" stroke="#00a884" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#0b141a" stroke="#00a884"/></svg>
           </div>
         </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
           <div style="width:30px;height:30px;border-radius:9999px;border:3px solid #00a884;background:#202c33;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.5);">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="#00a884" stroke="#00a884" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#0b141a" stroke="#00a884"/></svg>
           </div>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

/**
 * Reusable Leaflet map.
 * Props:
 *  - center: {lat, lng} initial/controlled center
 *  - marker: {lat, lng} | null — marker position (optional)
 *  - interactive: bool — allow click-to-select (calls onMapClick)
 *  - onMapClick: ({lat,lng}) => void
 *  - zoom: number
 *  - className: extra classes for the container
 *  - live: bool — render pulsing live pin instead of static pin
 *  - onClick: fired on any click on the map container (native listener,
 *             works even though Leaflet stops propagation to parents)
 *  - mapType: 'street' | 'satellite' — initial tile layer
 *  - showLayerControl: bool — render a Map/Satellite toggle (like WhatsApp)
 */
const LeafletMap = ({
  center,
  marker = null,
  interactive = false,
  onMapClick,
  onClick,
  zoom = 15,
  className = '',
  live = false,
  height = '100%',
  mapType = 'satellite',
  showLayerControl = false
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [currentMapType, setCurrentMapType] = useState(mapType);
  const centerRef = useRef(center);
  centerRef.current = center;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const c = centerRef.current || { lat: -6.2088, lng: 35.2757 };
    const map = L.map(containerRef.current, {
      center: [c.lat, c.lng],
      zoom,
      zoomControl: interactive,
      attributionControl: true,
      scrollWheelZoom: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive
    });
    if (interactive) {
      map.on('click', (e) => {
        if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    // Fix size when the container becomes visible
    const t = setTimeout(() => map.invalidateSize(), 100);
    mapRef.current = map;
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (marker) {
      if (!markerRef.current) {
        markerRef.current = L.marker([marker.lat, marker.lng], {
          icon: live ? liveIcon : pinIcon,
          interactive: false
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([marker.lat, marker.lng]);
        if (live) markerRef.current.setIcon(liveIcon);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [marker, live]);

  // Swap tile layer when map type changes (street <-> satellite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const provider = TILE_PROVIDERS[currentMapType] || TILE_PROVIDERS.street;
    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      attribution: provider.attribution
    }).addTo(map);
  }, [currentMapType]);

  // Recenter when center changes (used by search results / user location)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    setTimeout(() => map.invalidateSize(), 50);
  }, [center?.lat, center?.lng]);

  // Native click handler on the container (Leaflet stops propagation to parents)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onClick) return;
    const handler = () => onClick();
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onClick]);

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <div
        ref={containerRef}
        className={`leaflet-container ${className}`}
        style={{ height: '100%', width: '100%', background: '#0b141a' }}
      />
      {showLayerControl && (
        <div className="absolute bottom-2 left-2 z-[1000] flex items-stretch overflow-hidden rounded-lg bg-[#1a2e35]/95 border border-white/20 shadow-lg text-xs font-semibold select-none">
          <button
            type="button"
            onClick={() => setCurrentMapType('street')}
            className={`px-3 py-1.5 transition-colors ${currentMapType === 'street' ? 'bg-[#00a884] text-white' : 'text-[#8696a0] hover:text-white'}`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setCurrentMapType('satellite')}
            className={`px-3 py-1.5 transition-colors ${currentMapType === 'satellite' ? 'bg-[#00a884] text-white' : 'text-[#8696a0] hover:text-white'}`}
          >
            Satellite
          </button>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
