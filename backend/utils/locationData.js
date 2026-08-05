// Normalize incoming status location payloads to the schema shape (lat/lng).
// Clients send either `{ latitude, longitude }` (GPS / pickers) or `{ lat, lng }`
// (StatusCreator) — both must persist. Returns null when there is nothing real.
function normalizeLocationData(locationData) {
  if (!locationData || typeof locationData !== 'object') return null;
  const lat = Number.isFinite(Number(locationData.lat)) ? Number(locationData.lat)
    : Number.isFinite(Number(locationData.latitude)) ? Number(locationData.latitude) : undefined;
  const lng = Number.isFinite(Number(locationData.lng)) ? Number(locationData.lng)
    : Number.isFinite(Number(locationData.longitude)) ? Number(locationData.longitude) : undefined;
  if (lat === undefined && lng === undefined && !locationData.address && !locationData.placeName) return null;
  return {
    lat,
    lng,
    address: locationData.address || '',
    placeName: locationData.placeName || ''
  };
}

module.exports = { normalizeLocationData };
