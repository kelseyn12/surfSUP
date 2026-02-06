import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, NativeModules, UIManager } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { SurfSpot } from '../types';
import { fetchNearbySurfSpots, getSurferCount } from '../services/api';
import { eventEmitter, AppEvents } from '../services/events';
import { getAllSpots } from '../utils/spotHelpers';

// Check if maps native module is linked (required after adding react-native-maps; run: cd ios && pod install && npx expo run:ios)
// On Android: NativeModules.AirMapModule. On iOS: view manager is "AIRMap" (UIManager.hasViewManagerConfig).
let mapsNativeAvailable = false;
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE = '';
let PROVIDER_DEFAULT = '';

function isMapsNativeAvailable(): boolean {
  if (Platform.OS === 'android') {
    return !!NativeModules.AirMapModule;
  }
  // iOS: react-native-maps registers the view as "AIRMap", not AirMapModule
  try {
    return !!UIManager.hasViewManagerConfig?.('AIRMap');
  } catch {
    return !!NativeModules.AirMapModule || !!NativeModules.AIRMapManager;
  }
}

let Callout: any = null;
try {
  const maps = require('react-native-maps');
  mapsNativeAvailable = isMapsNativeAvailable();
  if (mapsNativeAvailable) {
    MapView = maps.default;
    Marker = maps.Marker;
    Callout = maps.Callout;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
    PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
  } else {
    console.log('[MapScreen] Maps not available. Android: AirMapModule. iOS: UIManager AIRMap.');
    console.log('[MapScreen] NativeModules (map-related):', Object.keys(NativeModules).filter(k => k.toLowerCase().includes('map')));
  }
} catch (e) {
  console.log('[MapScreen] react-native-maps not available:', e);
}
type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Map'>['navigation']>();
  const mapRef = useRef<any>(null);
  
  // Re-check native module availability on mount (in case it loads asynchronously)
  const [mapsAvailable, setMapsAvailable] = React.useState(mapsNativeAvailable);
  
  React.useEffect(() => {
    const checkMaps = () => {
      const available = isMapsNativeAvailable();
      if (available !== mapsAvailable) {
        setMapsAvailable(available);
      }
    };
    checkMaps();
    const timeout = setTimeout(checkMaps, 100);
    return () => clearTimeout(timeout);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [surfSpots, setSurfSpots] = useState<SurfSpot[]>([]);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Map region state - centered on Lake Superior near Duluth
  const [region, setRegion] = useState<Region>({
    latitude: 46.7867, 
    longitude: -92.0805, 
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // Center used for fetching spots (Duluth) so pins always load regardless of map pan
  const SPOTS_CENTER = { lat: 46.7867, lng: -92.0805 };
  const SPOTS_RADIUS_KM = 500;

  const loadSurfSpots = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const spots = await fetchNearbySurfSpots(SPOTS_CENTER.lat, SPOTS_CENTER.lng, SPOTS_RADIUS_KM);
      const list = spots && spots.length > 0 ? spots : getAllSpots();
      const updatedSpots = [...list];
      for (let i = 0; i < updatedSpots.length; i++) {
        const latestCount = await getSurferCount(updatedSpots[i].id);
        updatedSpots[i].currentSurferCount = latestCount;
      }
      setSurfSpots(updatedSpots);
    } catch (err) {
      console.warn('[MapScreen] loadSurfSpots failed:', err);
      setSurfSpots(getAllSpots());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSurfSpots();
  }, [loadSurfSpots]);

  // Set up event listener for surfer count updates
  useEffect(() => {
    const handleSurferCountUpdate = (data: { spotId: string, count: number }) => {
      // Update the surfer count for the specific spot
      setSurfSpots(currentSpots => 
        currentSpots.map(spot => 
          spot.id === data.spotId 
            ? { ...spot, currentSurferCount: data.count } 
            : spot
        )
      );
    };

    // Register event listener
    eventEmitter.on(AppEvents.SURFER_COUNT_UPDATED, handleSurferCountUpdate);

    // Cleanup listener on unmount
    return () => {
      eventEmitter.off(AppEvents.SURFER_COUNT_UPDATED, handleSurferCountUpdate);
    };
  }, []);

  // Refresh spots when screen comes into focus (e.g. after checking in on Spot Details)
  useFocusEffect(
    React.useCallback(() => {
      loadSurfSpots();
      return () => {};
    }, [loadSurfSpots])
  );

  // Request location permissions
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          // Get initial location
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };
    requestLocationPermission();
  }, []);

  // Function for finding user's location
  const findMyLocation = async () => {
    setIsLoading(true);
    try {
      if (!locationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          alert('Location permission is required to find your location');
          setIsLoading(false);
          return;
        }
        setLocationPermission(true);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setRegion(newRegion);
      
      // Animate map to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      // Reload surf spots with new location
      await loadSurfSpots();
    } catch (error) {
      console.error('Error finding location:', error);
      alert('Unable to find your location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to center map on Lake Superior
  const centerOnLakeSuperior = () => {
    const lakeSuperiorRegion: Region = {
      latitude: 47.5,
      longitude: -87.5,
      latitudeDelta: 2.0,
      longitudeDelta: 2.0,
    };
    setRegion(lakeSuperiorRegion);
    if (mapRef.current) {
      mapRef.current.animateToRegion(lakeSuperiorRegion, 1000);
    }
    loadSurfSpots();
  };

  // Function to get color based on surfer count
  const getSurferCountColor = (count: number): string => {
    if (count === 0) return COLORS.gray;
    if (count < 3) return COLORS.success;
    if (count < 8) return COLORS.warning;
    return COLORS.error;
  };

  // Function to get label for surfer activity level
  const getSurferActivityLabel = (count: number): string => {
    if (count === 0) return 'No surfers';
    if (count < 3) return 'Low';
    if (count < 8) return 'Active';
    return 'Crowded';
  };

  // Placeholder for handling marker press
  const handleMarkerPress = (spot: SurfSpot) => {
    navigation.navigate('SpotDetails', { spotId: spot.id, spot });
  };

  // Fallback when maps native module isn't linked (e.g. before running pod install + rebuild)
  if (!mapsAvailable || !MapView || !Marker) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="map-outline" size={64} color={COLORS.gray} />
          <Text style={styles.fallbackTitle}>Map requires rebuild</Text>
          <Text style={styles.fallbackText}>
            The map view needs the native maps module (development build only).{'\n\n'}
            {Platform.OS === 'ios' ? 'UIManager AIRMap: ' + (typeof UIManager.hasViewManagerConfig === 'function' && UIManager.hasViewManagerConfig('AIRMap') ? 'yes' : 'no') : 'AirMapModule: ' + (NativeModules.AirMapModule ? 'yes' : 'no')}{'\n\n'}
            If "none", uninstall this app from the simulator, then run:{'\n'}
            ./scripts/ios-fresh-run.sh
          </Text>
          <Text style={styles.fallbackSubtext}>Nearby surf spots:</Text>
          {surfSpots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.fallbackSpotRow}
              onPress={() => handleMarkerPress(spot)}
            >
              <Text style={styles.fallbackSpotName}>{spot.name}</Text>
              <View style={[styles.surferCountBadge, { backgroundColor: getSurferCountColor(spot.currentSurferCount || 0) }]}>
                <Text style={styles.surferCountText}>{spot.currentSurferCount || 0}</Text>
                <Ionicons name="people" size={12} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real MapView component */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={locationPermission && !!userLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        zoomEnabled={true}
        zoomControlEnabled={Platform.OS === 'android'}
      >
        {/* Surf spot markers: legacy pin on iOS so pinColor (gray/green/orange/red) shows */}
        {surfSpots.map((spot) => {
          const count = spot.currentSurferCount ?? 0;
          const pinColor = getSurferCountColor(count);
          const activityLabel = getSurferActivityLabel(count);
          return (
            <Marker
              key={spot.id}
              coordinate={{
                latitude: spot.location.latitude,
                longitude: spot.location.longitude,
              }}
              pinColor={pinColor}
              useLegacyPinView={Platform.OS === 'ios'}
            >
              {Callout && (
                <Callout tooltip={false}>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{spot.name}</Text>
                    <Text style={styles.calloutSubtitle}>
                      {count} surfer{count !== 1 ? 's' : ''} • {activityLabel}
                    </Text>
                    <TouchableOpacity
                      style={styles.calloutButton}
                      onPress={() => handleMarkerPress(spot)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.calloutButtonText}>Go to details</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={findMyLocation}
          disabled={isLoading}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color={isLoading ? COLORS.gray : COLORS.primary} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={centerOnLakeSuperior}
          disabled={isLoading}
        >
          <Ionicons 
            name="map" 
            size={24} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={loadSurfSpots}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons 
              name="refresh" 
              size={24} 
              color={COLORS.primary} 
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.zoomHint}>
        <Text style={styles.zoomHintText}>Pinch to zoom</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={findMyLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="locate-outline" size={20} color={COLORS.white} />
              <Text style={styles.controlButtonText}>My Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.refreshButton]}
          onPress={loadSurfSpots}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
              <Text style={styles.controlButtonText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  markerBadgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  mapControls: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zoomHintText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  calloutContainer: {
    minWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 10,
  },
  calloutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  calloutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  controlButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: COLORS.secondary,
  },
  controlButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fallbackSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 24,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  fallbackSpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fallbackSpotName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  surferCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  surferCountText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default MapScreen; 