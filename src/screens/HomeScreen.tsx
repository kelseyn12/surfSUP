import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { SurfSpotCard } from '../components';
import { SurfSpot } from '../types';
import { fetchNearbySurfSpots, resetAllCheckInsAndCounts } from '../services/api';
import { getGlobalSurferCount } from '../services/globalState';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';

// Duluth, MN — fallback when device location is unavailable
const DULUTH_LAT = 46.7825;
const DULUTH_LNG = -92.0856;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Home'>['navigation']>();
  const [refreshing, setRefreshing] = useState(false);
  const [nearbySpots, setNearbySpots] = useState<SurfSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const { location, requestLocationPermission } = useLocation();

  // Function to refresh only the surfer counts without reloading the spots
  const refreshSurferCounts = useCallback(() => {
    if (nearbySpots.length === 0) return;
    
    // Create a new array with updated counts
    const updatedSpots = nearbySpots.map(spot => {
      const count = getGlobalSurferCount(spot.id);
      return {
        ...spot,
        currentSurferCount: count
      };
    });
    
    // Update the state
    setNearbySpots(updatedSpots);
  }, [nearbySpots]);

  const loadNearbySpots = useCallback(async () => {
    try {
      setLoading(true);
      // Request permission if not yet granted; fall back to Duluth if denied or unavailable
      await requestLocationPermission();
      const lat = location?.latitude ?? DULUTH_LAT;
      const lng = location?.longitude ?? DULUTH_LNG;
      const spots = await fetchNearbySurfSpots(lat, lng);
      if (spots) {
        
        // Make sure each spot shows the latest surfer count by reading from global state
        const updatedSpots = spots.map(spot => ({
          ...spot,
          currentSurferCount: getGlobalSurferCount(spot.id)
        }));
        
        setNearbySpots(updatedSpots);
      }
    } catch (error) {
      console.error('Error loading nearby spots:', error);
    } finally {
      setLoading(false);
    }
  }, [location, requestLocationPermission]);

  // On manual refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadNearbySpots().then(() => {
      setRefreshing(false);
    });
  }, [loadNearbySpots]);

  // Place useFocusEffect after function declarations to avoid linter errors
  useFocusEffect(
    React.useCallback(() => {
      loadNearbySpots();
      // Also set up a refresh interval while this screen is focused
      const intervalId = setInterval(() => {
        // Just re-fetch surfer counts without loading all spots
        refreshSurferCounts();
      }, 5000); // Check every 5 seconds
      return () => {
        // Clear interval when screen loses focus
        clearInterval(intervalId);
      };
    }, [loadNearbySpots, refreshSurferCounts])
  );

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SurfSUP</Text>
        <Text style={styles.headerSubtitle}>Lake Superior Surf Forecast</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSearch} style={styles.iconButton}>
            <Ionicons name="search" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => {
                resetAllCheckInsAndCounts();
                Alert.alert('Reset', 'All check-ins and surfer counts have been reset');
                onRefresh();
              }}
              style={[styles.iconButton, { backgroundColor: COLORS.error }]}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Spots</Text>
        <View style={styles.spotsList}>
          {nearbySpots.map(spot => (
            <SurfSpotCard
              key={spot.id}
              spot={spot}
              showConditions={true}
              surferCount={spot.currentSurferCount || 0}
            />
          ))}
          
          {nearbySpots.length === 0 && !loading && (
            <Text style={styles.noSpotsText}>No spots found nearby</Text>
          )}
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  spotsList: {
    gap: 12,
  },
  noSpotsText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: 20,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  activityDate: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  activityDetails: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastDay: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  forecastCondition: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surfConditions.good,
    marginTop: 4,
  },
  forecastDetails: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
});

export default HomeScreen; 