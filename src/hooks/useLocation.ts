import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { APP_CONFIG } from '../constants';

// Single permission request per app lifecycle (avoids duplicate TCC prompts and CLLocationManager churn).
let hasRequestedAppPermission = false;

/**
 * Request foreground location permission once per app session.
 * Subsequent calls only check status (getForegroundPermissionsAsync).
 */
async function requestPermissionOnce(): Promise<Location.PermissionStatus> {
  if (hasRequestedAppPermission) {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  }
  hasRequestedAppPermission = true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

/**
 * useLocation: single source for permission + location.
 * - Permission is requested at most once per app (guarded by module ref).
 * - Watch subscription is created once when watchPosition is true and removed on cleanup.
 * - onLocationChange is stored in a ref so the watch effect does not re-run on every render.
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

  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  /** Request permission once and get initial position. Safe to call from useEffect(() => {}, []). */
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const status = await requestPermissionOnce();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return false;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy ?? undefined,
      };
      setLocation(locationData);
      onLocationChangeRef.current?.(locationData);
      setIsLoading(false);
      return true;
    } catch (error) {
      setErrorMsg(`Error getting location: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Watch: only depends on watchPosition. Callback via ref so no re-subscribe on parent re-render.
  useEffect(() => {
    let watchId: Location.LocationSubscription | null = null;
    if (!watchPosition) return;

    const start = async () => {
      const status = await requestPermissionOnce();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: APP_CONFIG.LOCATION_REFRESH_INTERVAL * 60 * 1000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const locationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy ?? undefined,
          };
          setLocation(locationData);
          onLocationChangeRef.current?.(locationData);
        }
      );
    };
    start();

    return () => {
      if (watchId) {
        watchId.remove();
        watchId = null;
      }
    };
  }, [watchPosition]);

  /** Get current position on demand. Uses existing permission; requests only if not yet granted. Returns location or null. */
  const getCurrentLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const status = await requestPermissionOnce();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return null;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy ?? undefined,
      };
      setLocation(locationData);
      onLocationChangeRef.current?.(locationData);
      setIsLoading(false);
      return locationData;
    } catch (error) {
      setErrorMsg(`Error getting location: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      return null;
    }
  }, []);

  return {
    location,
    errorMsg,
    isLoading,
    permissionStatus,
    requestLocationPermission,
    getCurrentLocation,
  };
};
