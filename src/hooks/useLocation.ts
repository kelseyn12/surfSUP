import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { APP_CONFIG } from '../constants';

/**
 * Custom hook for getting and tracking user location
 * @param options Configuration options
 * @returns Location state and methods
 */
export const useLocation = ({
  enableHighAccuracy = true,
  timeout = 15000,
  maximumAge = 10000,
  watchPosition = false,
  onLocationChange,
}: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
  onLocationChange?: (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => void;
} = {}) => {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    Location.PermissionStatus | null
  >(null);

  // Request location permissions and get initial location
  const requestLocationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return false;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      setLocation(locationData);
      if (onLocationChange) {
        onLocationChange(locationData);
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      setErrorMsg(`Error getting location: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Start watching position if requested
  useEffect(() => {
    let watchId: Location.LocationSubscription | null = null;

    const startWatchingPosition = async () => {
      if (!watchPosition) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: APP_CONFIG.LOCATION_REFRESH_INTERVAL * 60 * 1000, // convert minutes to ms
          distanceInterval: 10, // minimum movement in meters
        },
        (newLocation) => {
          const locationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
          };

          setLocation(locationData);
          if (onLocationChange) {
            onLocationChange(locationData);
          }
        }
      );
    };

    if (watchPosition) {
      startWatchingPosition();
    }

    // Cleanup function
    return () => {
      if (watchId) {
        watchId.remove();
      }
    };
  }, [watchPosition, onLocationChange]);

  // Get current location on demand
  const getCurrentLocation = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // If permission is not granted, request it
        return await requestLocationPermission();
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      setLocation(locationData);
      if (onLocationChange) {
        onLocationChange(locationData);
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      setErrorMsg(`Error getting location: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  return {
    location,
    errorMsg,
    isLoading,
    permissionStatus,
    requestLocationPermission,
    getCurrentLocation,
  };
}; 