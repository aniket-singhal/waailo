/** Geolocation helpers for geo-fenced attendance (pure, unit-tested). */

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle (haversine) distance between two lat/lng points, in metres. */
export function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Whether a point is within `radiusM` of a geofence centre. */
export function isWithinGeofence(
  pointLat: number,
  pointLng: number,
  centreLat: number,
  centreLng: number,
  radiusM: number,
): boolean {
  return haversineMetres(pointLat, pointLng, centreLat, centreLng) <= radiusM;
}
