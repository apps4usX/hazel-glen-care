// Geo helpers — distance between two lat/lng points (Haversine, kilometres).

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates, in kilometres.
 * Returns null if either coordinate is missing.
 * @param {{latitude?:number|null, longitude?:number|null}} a
 * @param {{latitude?:number|null, longitude?:number|null}} b
 * @returns {number|null}
 */
function distanceKm(a, b) {
  if (
    a == null || b == null ||
    a.latitude == null || a.longitude == null ||
    b.latitude == null || b.longitude == null
  ) {
    return null;
  }
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

module.exports = { distanceKm };
