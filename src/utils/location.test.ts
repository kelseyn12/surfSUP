import {
  calculateDistance,
  degreesToRadians,
  formatDistance,
  getDirectionBetweenPoints,
  getRegionForCoordinates,
  getNearbySpots,
  createMapRegion,
  createRegionForSpots,
  formatCoordinates,
} from './location';
import type { SurfSpot } from '../types';

describe('Location Utilities', () => {
  describe('degreesToRadians', () => {
    it('should convert degrees to radians correctly', () => {
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(180)).toBe(Math.PI);
      expect(degreesToRadians(90)).toBe(Math.PI / 2);
      expect(degreesToRadians(360)).toBe(2 * Math.PI);
    });
  });

  describe('calculateDistance', () => {
    // San Francisco and Los Angeles coordinates
    const sf = { lat: 37.7749, lon: -122.4194 };
    const la = { lat: 34.0522, lon: -118.2437 };
    
    it('should calculate distance between two points in kilometers', () => {
      const distance = calculateDistance(sf.lat, sf.lon, la.lat, la.lon);
      // Approximate distance between SF and LA is about 560-580 km
      expect(distance).toBeGreaterThan(550);
      expect(distance).toBeLessThan(590);
    });

    it('should return zero for identical coordinates', () => {
      const distance = calculateDistance(sf.lat, sf.lon, sf.lat, sf.lon);
      expect(distance).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format small distances as "Nearby"', () => {
      expect(formatDistance(0.05, true)).toBe('Nearby');
      expect(formatDistance(0.05, false)).toBe('Nearby');
    });

    it('should format distances in miles with imperial units', () => {
      expect(formatDistance(5, true)).toBe('3.1 mi');
      expect(formatDistance(16.1, true)).toBe('10 mi');
      expect(formatDistance(40.23, true)).toBe('25 mi');
    });

    it('should format distances in kilometers with metric units', () => {
      expect(formatDistance(5, false)).toBe('5.0 km');
      expect(formatDistance(16.1, false)).toBe('16 km');
      expect(formatDistance(40.23, false)).toBe('40 km');
    });
  });

  describe('getDirectionBetweenPoints', () => {
    it('should return cardinal directions between points', () => {
      // North: latitude increases, longitude unchanged
      expect(getDirectionBetweenPoints(34, -118, 35, -118)).toBe('N');

      // East: longitude increases (less negative = further east)
      expect(getDirectionBetweenPoints(34, -118, 34, -117)).toBe('E');

      // South: latitude decreases, longitude unchanged
      expect(getDirectionBetweenPoints(35, -118, 34, -118)).toBe('S');

      // West: longitude decreases (more negative = further west)
      expect(getDirectionBetweenPoints(34, -117, 34, -118)).toBe('W');
    });
  });

  describe('getRegionForCoordinates', () => {
    it('should return null for empty coordinates', () => {
      expect(getRegionForCoordinates([])).toBeNull();
    });

    it('should handle a single coordinate', () => {
      const coords = [{ latitude: 34.0522, longitude: -118.2437 }];
      const region = getRegionForCoordinates(coords);
      
      expect(region).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    });

    it('should calculate a region that encompasses multiple coordinates', () => {
      const coords = [
        { latitude: 37.7749, longitude: -122.4194 }, // SF
        { latitude: 34.0522, longitude: -118.2437 }, // LA
      ];
      
      const region = getRegionForCoordinates(coords);
      
      // Region should be centered between the two points
      expect(region?.latitude).toBeCloseTo((37.7749 + 34.0522) / 2, 1);
      expect(region?.longitude).toBeCloseTo((-122.4194 + -118.2437) / 2, 1);
      
      // Delta should be large enough to encompass both points with padding
      expect(region?.latitudeDelta).toBeGreaterThan(37.7749 - 34.0522);
      expect(region?.longitudeDelta).toBeGreaterThan(-118.2437 - -122.4194);
    });
  });

  describe('formatCoordinates', () => {
    it('should format positive lat/lon as N/E', () => {
      expect(formatCoordinates(46.7825, 92.0856)).toBe('46.7825° N, 92.0856° E');
    });

    it('should format negative lat/lon as S/W', () => {
      expect(formatCoordinates(-46.7825, -92.0856)).toBe('46.7825° S, 92.0856° W');
    });

    it('should format real Stoney Point coordinates (N lat, W lon)', () => {
      // Real spot: latitude is positive (N), longitude is negative (W of prime meridian)
      expect(formatCoordinates(46.928071, -91.811896)).toBe('46.9281° N, 91.8119° W');
    });
  });

  describe('createMapRegion', () => {
    it('should use default deltas when none are provided', () => {
      expect(createMapRegion(46.7825, -92.0856)).toEqual({
        latitude: 46.7825,
        longitude: -92.0856,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    });

    it('should use custom deltas when provided', () => {
      expect(createMapRegion(46.7825, -92.0856, 0.5, 0.3)).toEqual({
        latitude: 46.7825,
        longitude: -92.0856,
        latitudeDelta: 0.5,
        longitudeDelta: 0.3,
      });
    });
  });

  // Minimal fixture covering only the fields location.ts actually reads.
  const makeSpot = (id: string, latitude: number, longitude: number): SurfSpot =>
    ({
      id,
      name: id,
      location: { latitude, longitude },
      difficulty: 'beginner',
      type: ['beach-break'],
      createdAt: '',
      updatedAt: '',
    } as SurfSpot);

  describe('getNearbySpots', () => {
    // Real North Shore MN spots: Stoney Point, Park Point, Lester River
    const stoneyPoint = makeSpot('stoneypoint', 46.928071, -91.811896);
    const parkPoint = makeSpot('parkpoint', 46.7825, -92.0856);
    const lesterRiver = makeSpot('lesterriver', 46.836016, -92.00554);
    // Far away — Marquette, MI — should be excluded at a small radius
    const marquette = makeSpot('marquette', 46.5436, -87.3954);

    it('should return nearby spots sorted by distance, excluding far-away ones', () => {
      const spots = [marquette, parkPoint, stoneyPoint, lesterRiver];
      // From a point near Lester River, with a tight radius that excludes Marquette
      const result = getNearbySpots(spots, 46.836016, -92.00554, 50);

      expect(result.map(s => s.id)).not.toContain('marquette');
      expect(result[0].id).toBe('lesterriver'); // distance 0, closest by definition
    });

    it('should return an empty array when nothing is within radius', () => {
      const result = getNearbySpots([marquette], 46.836016, -92.00554, 1);
      expect(result).toEqual([]);
    });

    it('should use the default radius from APP_CONFIG when none is provided', () => {
      // Stoney Point and Lester River are both within ~50km of each other on the North Shore
      const result = getNearbySpots([stoneyPoint, lesterRiver], 46.836016, -92.00554);
      expect(result.length).toBe(2);
    });
  });

  describe('createRegionForSpots', () => {
    it('should return null for an empty spot list', () => {
      expect(createRegionForSpots([])).toBeNull();
    });

    it('should center on the single spot when only one is given', () => {
      const spot = makeSpot('stoneypoint', 46.928071, -91.811896);
      const region = createRegionForSpots([spot]);

      expect(region).toEqual({
        latitude: 46.928071,
        longitude: -91.811896,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    });

    it('should encompass multiple spots with padding applied', () => {
      const spots = [
        makeSpot('parkpoint', 46.7825, -92.0856),
        makeSpot('stoneypoint', 46.928071, -91.811896),
      ];
      const region = createRegionForSpots(spots);

      expect(region?.latitude).toBeCloseTo((46.7825 + 46.928071) / 2, 4);
      expect(region?.longitude).toBeCloseTo((-92.0856 + -91.811896) / 2, 4);
      expect(region?.latitudeDelta).toBeGreaterThan(46.928071 - 46.7825);
    });

    it('should enforce a minimum zoom level for spots that are very close together', () => {
      const spots = [
        makeSpot('a', 46.7825, -92.0856),
        makeSpot('b', 46.78251, -92.08561), // ~1.5 meters away
      ];
      const region = createRegionForSpots(spots);

      expect(region?.latitudeDelta).toBe(0.02);
      expect(region?.longitudeDelta).toBe(0.02);
    });
  });
});