import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants';
import { SurfSpot } from '../types';
import { fetchNearbySurfSpots, getSurferCount } from '../services/api';
import { eventEmitter, AppEvents } from '../services/events';

// In a full implementation, we would import and use a map component like:
// import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
// or similar for a different map provider

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Map'>['navigation']>();
  const [isLoading, setIsLoading] = useState(false);
  const [surfSpots, setSurfSpots] = useState<SurfSpot[]>([]);

  // Placeholder for map region state - centered on Lake Superior near Duluth
  const [region, setRegion] = useState({
    latitude: 46.7867, 
    longitude: -92.0805, 
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // Initial load
  useEffect(() => {
    loadSurfSpots();
  }, []);

  // Set up event listener for surfer count updates
  useEffect(() => {
    const handleSurferCountUpdate = (data: { spotId: string, count: number }) => {
      console.log(`[EVENT] MapScreen received surfer count update for ${data.spotId}: ${data.count}`);
      
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

  // Always refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[DEBUG] MapScreen focused, refreshing data');
      loadSurfSpots();
      return () => {};
    }, [])
  );

  const loadSurfSpots = async () => {
    setIsLoading(true);
    try {
      const spots = await fetchNearbySurfSpots(region.latitude, region.longitude);
      if (spots) {
        console.log('[DEBUG] MapScreen loaded spots:', spots.length);
        
        // Make sure each spot shows the latest surfer count
        const updatedSpots = [...spots];
        for (let i = 0; i < updatedSpots.length; i++) {
          const latestCount = await getSurferCount(updatedSpots[i].id);
          console.log(`[DEBUG] Getting latest count for ${updatedSpots[i].name}: ${latestCount}`);
          updatedSpots[i].currentSurferCount = latestCount;
        }
        
        setSurfSpots(updatedSpots);
      }
    } catch (error) {
      console.error('Error loading surf spots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder function for finding user's location
  const findMyLocation = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Mock location finding - centered on Duluth
      setRegion({
        latitude: 46.7867,
        longitude: -92.0805,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
      // Reload surf spots with new location
      loadSurfSpots();
    }, 1000);
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

  return (
    <View style={styles.container}>
      {/* This is a placeholder for the actual map component */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Lake Superior Surf Map</Text>
        <Text style={styles.mapPlaceholderSubText}>
          In a real implementation, this would be a MapView component showing Lake Superior surf spots
        </Text>
        
        {/* Placeholder for marker indicators */}
        {surfSpots.map((spot) => (
          <TouchableOpacity
            key={spot.id}
            style={[
              styles.markerPlaceholder,
              {
                top: Math.random() * 200 + 100,
                left: Math.random() * 200 + 75,
              }
            ]}
            onPress={() => handleMarkerPress(spot)}
          >
            <View style={styles.markerContent}>
              <Text style={styles.markerText}>{spot.name}</Text>
              <View style={[
                styles.surferCountBadge, 
                { backgroundColor: getSurferCountColor(spot.currentSurferCount || 0) }
              ]}>
                <Text style={styles.surferCountText}>{spot.currentSurferCount || 0}</Text>
                <Ionicons name="people" size={12} color={COLORS.white} />
              </View>
            </View>
            <View style={[
              styles.surferActivityBadge,
              { backgroundColor: getSurferCountColor(spot.currentSurferCount || 0) }
            ]}>
              <Text style={styles.surferActivityText}>
                {getSurferActivityLabel(spot.currentSurferCount || 0)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={findMyLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.controlButtonText}>Find My Location</Text>
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
            <Text style={styles.controlButtonText}>Refresh</Text>
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
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  mapPlaceholderSubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  markerPlaceholder: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    margin: 4,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerText: {
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginRight: 8,
  },
  surferCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  surferCountText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 3,
  },
  surferActivityBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  surferActivityText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 10,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 5,
  },
  refreshButton: {
    backgroundColor: COLORS.secondary,
  },
  controlButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MapScreen; 