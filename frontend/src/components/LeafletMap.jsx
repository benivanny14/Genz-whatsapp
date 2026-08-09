import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  height = '100%'
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

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
    <div
      ref={containerRef}
      className={`leaflet-container ${className}`}
      style={{ height, width: '100%', background: '#0b141a' }}
    />
  );
};

export default LeafletMap;
