/**
 * Location utilities for calculating distances and finding nearby spots
 */
import { SurfSpot, CoordinateRegion } from '../types';
import { APP_CONFIG } from '../constants';

/**
 * Location utilities for the SurfSUP app
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians
 */
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Filters spots within a certain radius of the user's location
 * @param spots Array of surf spots to filter
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param radiusKm Radius in kilometers (default from APP_CONFIG)
 * @returns Array of spots within the radius, sorted by distance
 */
export const getNearbySpots = (
  spots: SurfSpot[],
  userLat: number,
  userLon: number,
  radiusKm = APP_CONFIG.NEARBY_SPOT_RADIUS
): SurfSpot[] => {
  // Calculate distance for each spot
  const spotsWithDistance = spots.map(spot => {
    const distance = calculateDistance(
      userLat,
      userLon,
      spot.location.latitude,
      spot.location.longitude
    );
    return { spot, distance };
  });
  
  // Filter spots within radius and sort by distance
  return spotsWithDistance
    .filter(item => item.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.spot);
};

/**
 * Creates a map region centered on a specific location with default deltas
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param latitudeDelta Optional latitude delta (zoom level)
 * @param longitudeDelta Optional longitude delta (zoom level)
 * @returns CoordinateRegion object for React Native Maps
 */
export const createMapRegion = (
  latitude: number,
  longitude: number,
  latitudeDelta = 0.1,
  longitudeDelta = 0.1
): CoordinateRegion => {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

/**
 * Creates a map region that encompasses all provided spots
 * @param spots Array of surf spots to include in the region
 * @param padding Percentage of padding to add around the spots (0-1)
 * @returns CoordinateRegion object for React Native Maps
 */
export const createRegionForSpots = (
  spots: SurfSpot[],
  padding = 0.2
): CoordinateRegion | null => {
  if (!spots.length) {
    return null;
  }
  
  // If only one spot, create a centered region
  if (spots.length === 1) {
    return createMapRegion(
      spots[0].location.latitude,
      spots[0].location.longitude
    );
  }
  
  // Find min and max coordinates
  let minLat = spots[0].location.latitude;
  let maxLat = spots[0].location.latitude;
  let minLon = spots[0].location.longitude;
  let maxLon = spots[0].location.longitude;
  
  spots.forEach(spot => {
    minLat = Math.min(minLat, spot.location.latitude);
    maxLat = Math.max(maxLat, spot.location.latitude);
    minLon = Math.min(minLon, spot.location.longitude);
    maxLon = Math.max(maxLon, spot.location.longitude);
  });
  
  // Calculate center
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  
  // Calculate deltas with padding
  const latDelta = (maxLat - minLat) * (1 + padding);
  const lonDelta = (maxLon - minLon) * (1 + padding);
  
  return {
    latitude: centerLat,
    longitude: centerLon,
    latitudeDelta: Math.max(latDelta, 0.02), // Ensure a minimum zoom level
    longitudeDelta: Math.max(lonDelta, 0.02),
  };
};

/**
 * Formats a coordinate to a readable string
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Formatted string (e.g., "46.7825° N, 92.0856° W")
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  
  const absLat = Math.abs(latitude).toFixed(4);
  const absLon = Math.abs(longitude).toFixed(4);
  
  return `${absLat}° ${latDir}, ${absLon}° ${lonDir}`;
};

/**
 * Format distance for display
 * @param distance Distance in kilometers
 * @param useImperial Whether to use miles (true) or kilometers (false)
 * @returns Formatted distance string
 */
export const formatDistance = (
  distance: number,
  useImperial = true
): string => {
  if (useImperial) {
    // Convert to miles
    const miles = distance * 0.621371;
    
    if (miles < 0.1) {
      return 'Nearby';
    } else if (miles < 10) {
      return `${miles.toFixed(1)} mi`;
    } else {
      return `${Math.round(miles)} mi`;
    }
  } else {
    // Use kilometers
    if (distance < 0.1) {
      return 'Nearby';
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${Math.round(distance)} km`;
    }
  }
};

/**
 * Determine cardinal direction between two points
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Cardinal direction (N, NE, E, etc.)
 */
export const getDirectionBetweenPoints = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = bearing * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  
  // Convert bearing to compass direction
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round(bearing / 45);
  
  return directions[index];
};

/**
 * Get a map region for a list of coordinates
 * @param coordinates Array of coordinate points
 * @param padding Padding percentage (0-1)
 * @returns Map region with proper zoom level
 */
export const getRegionForCoordinates = (
  coordinates: Array<{ latitude: number; longitude: number }>,
  padding = 0.2
) => {
  if (coordinates.length === 0) {
    return null;
  }
  
  // Fallback for single coordinate
  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }
  
  // Calculate min and max for lat and long
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;
  
  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });
  
  // Calculate center
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  
  // Calculate deltas
  let latDelta = (maxLat - minLat) * (1 + padding);
  let lngDelta = (maxLng - minLng) * (1 + padding);
  
  // Ensure minimum zoom level
  latDelta = Math.max(latDelta, 0.01);
  lngDelta = Math.max(lngDelta, 0.01);
  
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}; 