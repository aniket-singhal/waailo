import { haversineMetres, isWithinGeofence } from 'src/common/utils/geo.util';

describe('geo util', () => {
  // Bengaluru office ~ (12.9716, 77.5946)
  const officeLat = 12.9716;
  const officeLng = 77.5946;

  it('returns ~0 for the same point', () => {
    expect(haversineMetres(officeLat, officeLng, officeLat, officeLng)).toBe(0);
  });

  it('computes a known short distance (~157m)', () => {
    // ~0.001 deg latitude ≈ 111m; check it's in a sane range
    const d = haversineMetres(officeLat, officeLng, officeLat + 0.001, officeLng + 0.001);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(200);
  });

  it('flags a point inside the geofence', () => {
    // ~50m away, radius 100m → inside
    expect(isWithinGeofence(officeLat + 0.0004, officeLng, officeLat, officeLng, 100)).toBe(true);
  });

  it('flags a point outside the geofence', () => {
    // ~1.5km away, radius 100m → outside
    expect(isWithinGeofence(officeLat + 0.013, officeLng, officeLat, officeLng, 100)).toBe(false);
  });
});
