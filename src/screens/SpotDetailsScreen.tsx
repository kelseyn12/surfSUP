import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../navigation/types';
import { COLORS } from '../constants';
import { SurfConditions } from '../types';
import { 
  fetchSurfConditions, 
  fetchSurfForecast, 
  checkInToSpot, 
  checkOutFromSpot, 
  getSurferCount, 
  getActiveCheckInForUser, 
  getActiveCheckInForUserAnywhere, 
  fetchNearbySurfSpots 
} from '../services/api';
import { eventEmitter, AppEvents } from '../services/events';
import { isUserCheckedInAt, getGlobalSurferCount } from '../services/globalState';
import webSocketService, { WebSocketMessageType } from '../services/websocket';
import { HeaderBar } from '../components';

const SpotDetailsScreen: React.FC<any> = (props) => {
  // Use props directly instead of hooks
  const route = props.route;
  const navigation = props.navigation;
  
  // Get spot details from route params or use fallback
  const { spotId, spot } = route?.params || { spotId: '0', spot: { name: 'Unknown Spot' } };
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentConditions, setCurrentConditions] = useState<SurfConditions | null>(null);
  const [forecast, setForecast] = useState<SurfConditions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [surferCount, setSurferCount] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);

  // Initial setup when spot changes
  useEffect(() => {
    console.log(`[DEBUG] SpotDetailsScreen loading for spot: ${spotId}`);
    
    // Reset check-in status and load data
    setIsCheckedIn(isUserCheckedInAt(spotId));
    setSurferCount(getGlobalSurferCount(spotId));
    loadData();
    checkExistingCheckIn();
  }, [spotId]);
  
  // Listen for WebSocket updates about surfer counts
  useEffect(() => {
    // Subscribe to WebSocket updates for this spot
    const unsubscribe = webSocketService.subscribe(
      WebSocketMessageType.SURFER_COUNT_UPDATE,
      (message) => {
        if (message.payload.spotId === spotId) {
          console.log(`[WebSocket] Received surfer count update for current spot: ${message.payload.count}`);
          setSurferCount(message.payload.count);
        }
      }
    );
    
    // Initial connection if needed
    if (!webSocketService.isConnected) {
      webSocketService.connect();
    }
    
    return () => {
      unsubscribe();
    };
  }, [spotId]);

  // Listen for WebSocket updates about check-in status
  useEffect(() => {
    // Subscribe to check-in status changes
    const unsubscribe = webSocketService.subscribe(
      WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
      (message) => {
        // We only care about our own user's check-ins
        if (message.payload.userId === 'test-user-id' && message.payload.spotId === spotId) {
          console.log(`[WebSocket] Received check-in status update for current spot: ${message.payload.isCheckedIn}`);
          setIsCheckedIn(message.payload.isCheckedIn);
          
          // If checked out, also clear the check-in ID
          if (!message.payload.isCheckedIn) {
            setCheckInId(null);
          }
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [spotId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch current conditions
      const conditions = await fetchSurfConditions(spotId);
      if (conditions) {
        setCurrentConditions(conditions);
        setSurferCount(conditions.surferCount || 0);
      }

      // Fetch forecast
      const forecastData = await fetchSurfForecast(spotId, 5);
      if (forecastData) {
        setForecast(forecastData);
      }
    } catch (error) {
      console.error('Error loading spot data:', error);
      Alert.alert('Error', 'Failed to load spot information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the user is already checked in at this spot
  const checkExistingCheckIn = async () => {
    try {
      // In a real app, you would get the actual userId from auth state
      const userId = 'test-user-id';
      
      // Only check for check-ins at THIS spot
      const activeCheckIn = await getActiveCheckInForUser(userId, spotId);
      console.log(`[DEBUG] Checking for check-in at spot ${spotId}:`, activeCheckIn);
      
      // Also check if checked in anywhere (for debugging)
      const anywhereCheckIn = await getActiveCheckInForUserAnywhere(userId);
      console.log(`[DEBUG] Checking for check-in anywhere:`, anywhereCheckIn);
      
      if (activeCheckIn) {
        // User is checked in at this spot
        console.log(`[DEBUG] User is checked in at THIS spot`);
        setIsCheckedIn(true);
        setCheckInId(activeCheckIn.id);
      } else {
        // User is not checked in at this spot
        console.log(`[DEBUG] User is NOT checked in at THIS spot`);
        setIsCheckedIn(false);
        setCheckInId(null);
      }
    } catch (error) {
      console.error('Error checking existing check-in:', error);
    }
  };

  // Toggle favorite status
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // In a real app, you would persist this to storage or API
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (isCheckedIn) {
      // Check out flow
      if (checkInId) {
        setIsLoading(true);
        try {
          const success = await checkOutFromSpot(checkInId);
          if (success) {
            setIsCheckedIn(false);
            setCheckInId(null);
            // Update surfer count (decrement)
            const newCount = await getSurferCount(spotId);
            setSurferCount(newCount);
            
            // Ask user if they want to log the session
            Alert.alert(
              'Checked Out Successfully',
              'Would you like to log details about your surf session?',
              [
                {
                  text: 'Not Now',
                  style: 'cancel'
                },
                {
                  text: 'Log Session',
                  onPress: () => {
                    // Navigate to the log session screen
                    navigation.navigate('LogSession', {
                      spotId,
                      checkInTime: undefined // We don't know when they checked in
                    });
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', 'Failed to check out. Please try again.');
          }
        } catch (error) {
          console.error('Error checking out:', error);
          Alert.alert('Error', 'Failed to check out. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // Check in flow
      setIsLoading(true);
      try {
        // In a real app, you would get the actual userId from auth state
        const userId = 'test-user-id';

        // Recheck if user is already checked in somewhere else
        const existingCheckIn = await getActiveCheckInForUserAnywhere(userId);
        
        console.log(`[DEBUG] Existing check-in when trying to check in at ${spotId}:`, existingCheckIn);
        
        if (existingCheckIn && existingCheckIn.spotId !== spotId) {
          // User is already checked in elsewhere
          setIsLoading(false);
          
          // Get the spot name
          let otherSpotName = 'another spot';
          try {
            const spots = await fetchNearbySurfSpots(46.7825, -92.0856);
            const otherSpot = spots?.find(s => s.id === existingCheckIn.spotId);
            if (otherSpot) {
              otherSpotName = otherSpot.name;
            }
          } catch (error) {
            console.error('Error fetching spot details:', error);
          }
          
          // Ask if they want to check out from the other spot
          Alert.alert(
            'Already Checked In',
            `You are currently checked in at ${otherSpotName}. Do you want to check out from there and check in here?`,
            [
              {
                text: 'No',
                style: 'cancel'
              },
              {
                text: 'Yes',
                onPress: async () => {
                  setIsLoading(true);
                  try {
                    // Check out from the other spot
                    const checkOutSuccess = await checkOutFromSpot(existingCheckIn.id);
                    if (checkOutSuccess) {
                      // Now check in to this spot
                      const checkIn = await checkInToSpot(userId, spotId);
                      if (checkIn) {
                        setIsCheckedIn(true);
                        setCheckInId(checkIn.id);
                        const newCount = await getSurferCount(spotId);
                        setSurferCount(newCount);
                        Alert.alert('Success', 'You have checked in to this spot!');
                      } else {
                        Alert.alert('Error', 'Failed to check in. Please try again.');
                      }
                    } else {
                      Alert.alert('Error', 'Failed to check out from previous spot. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error handling check-in/check-out flow:', error);
                    Alert.alert('Error', 'Failed to process check-in. Please try again.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }
            ]
          );
          return;
        }
        
        // Regular check in (not already checked in elsewhere)
        const checkIn = await checkInToSpot(userId, spotId);
        
        if (checkIn) {
          setIsCheckedIn(true);
          setCheckInId(checkIn.id);
          // Update surfer count (increment)
          const newCount = await getSurferCount(spotId);
          setSurferCount(newCount);
          Alert.alert('Success', 'You have checked in to this spot!');
        } else {
          Alert.alert('Error', 'Failed to check in. Please try again.');
        }
      } catch (error) {
        console.error('Error checking in:', error);
        Alert.alert('Error', 'Failed to check in. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Function to determine color based on rating
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return COLORS.surfConditions.excellent;
    if (rating >= 6) return COLORS.surfConditions.good;
    if (rating >= 4) return COLORS.surfConditions.fair;
    return COLORS.surfConditions.poor;
  };

  // Function to get appropriate surfer activity label and color
  const getSurferActivityLabel = (count: number): string => {
    if (count === 0) return 'No surfers';
    if (count < 3) return 'Low activity';
    if (count < 8) return 'Active';
    return 'Crowded';
  };

  const getSurferCountColor = (count: number): string => {
    if (count === 0) return COLORS.gray;
    if (count < 3) return COLORS.success;
    if (count < 8) return COLORS.warning;
    return COLORS.error;
  };

  // Create a formatted forecast from the API data
  const formattedForecast = forecast.slice(0, 5).map((item, index) => {
    const day = index === 0 ? 'Today' : 
               index === 1 ? 'Tomorrow' : 
               new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      day,
      timestamp: item.timestamp,
      waveHeight: `${item.waveHeight.min}-${item.waveHeight.max}${item.waveHeight.unit}`,
      period: `${Math.round(item.swell[0]?.period || 0)}s`,
      wind: `${item.wind.direction} ${item.wind.speed}${item.wind.unit}`,
      rating: item.rating,
    };
  });

  // Simple back button handler
  const handleGoBack = () => {
    navigation.goBack();
  };

  if (isLoading && !currentConditions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading spot information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar 
        title={spot?.name || 'Spot Details'} 
        onBackPress={handleGoBack}
        rightComponent={
          <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={28}
              color={isFavorite ? COLORS.error : COLORS.primary}
            />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.scrollContent}>
        {/* Hero image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: spot?.imageUrls?.[0] || 'https://via.placeholder.com/800x400' }} 
            style={styles.spotImage} 
          />
          <View style={styles.imageOverlay}>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={toggleFavorite}
            >
              <Ionicons 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={28} 
                color={isFavorite ? COLORS.error : COLORS.white} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spot header with surfer count */}
        <View style={styles.spotHeader}>
          <View style={styles.spotTitleContainer}>
            <Text style={styles.spotName}>{spot?.name}</Text>
            <Text style={styles.spotLocation}>
              {[spot?.location?.city, spot?.location?.state].filter(Boolean).join(', ')}
            </Text>
          </View>

          <View style={styles.surferCountContainer}>
            <View style={[styles.surferCountBadge, { backgroundColor: getSurferCountColor(surferCount) }]}>
              <Text style={styles.surferCountNumber}>{surferCount}</Text>
              <Ionicons name="people" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.surferCountLabel}>{getSurferActivityLabel(surferCount)}</Text>
          </View>
        </View>

        {/* Current conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>
          {currentConditions ? (
            <View style={styles.conditionsCard}>
              <View style={styles.conditionRow}>
                <View style={styles.conditionItem}>
                  <Ionicons name="water-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Wave Height</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.waveHeight.min}-{currentConditions.waveHeight.max} {currentConditions.waveHeight.unit}
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Period</Text>
                  <Text style={styles.conditionValue}>{currentConditions.swell[0]?.period || 0}s</Text>
                </View>
              </View>
              <View style={styles.conditionRow}>
                <View style={styles.conditionItem}>
                  <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Wind</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.wind.speed}{currentConditions.wind.unit === 'mph' ? 'mph' : 'kn'} {currentConditions.wind.direction}
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="thermometer-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Water Temp</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.weather.temperature}°{currentConditions.weather.unit}
                  </Text>
                </View>
              </View>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Overall Rating:</Text>
                <Text style={[styles.ratingValue, { color: getRatingColor(currentConditions.rating) }]}>
                  {currentConditions.rating}/10
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No current conditions available</Text>
            </View>
          )}
        </View>

        {/* Forecast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forecast</Text>
          {formattedForecast.length > 0 ? (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.forecastContainer}
            >
              {formattedForecast.map((day, index) => (
                <View key={index} style={styles.forecastCard}>
                  <Text style={styles.forecastDay}>{day.day}</Text>
                  <Text style={[styles.forecastRating, { color: getRatingColor(day.rating) }]}>
                    {day.rating}/10
                  </Text>
                  <View style={styles.forecastDetail}>
                    <Ionicons name="water-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.forecastDetailText}>{day.waveHeight}</Text>
                  </View>
                  <View style={styles.forecastDetail}>
                    <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.forecastDetailText}>{day.period}</Text>
                  </View>
                  <View style={styles.forecastDetail}>
                    <Ionicons name="speedometer-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.forecastDetailText}>{day.wind}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No forecast data available</Text>
            </View>
          )}
        </View>

        {/* Additional info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Spot</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {spot?.description || `${spot?.name} is a popular Lake Superior surf spot known for consistent waves during north and northeast winds. 
              It works best during fall and winter months when winds are strongest.
              Water temperatures can be very cold, ranging from 32-55°F depending on the season, so a thick wetsuit, boots, gloves, and hood are essential.`}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, isCheckedIn && styles.checkOutButton]}
            onPress={handleCheckIn}
            disabled={isLoading}
          >
            <Ionicons name={isCheckedIn ? "log-out-outline" : "location-outline"} size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Processing...' : isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('LogSession', { spotId, spot })}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Log Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  spotImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 16,
  },
  favoriteButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  spotTitleContainer: {
    flex: 1,
  },
  spotName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  spotLocation: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  surferCountContainer: {
    alignItems: 'center',
  },
  surferCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  surferCountNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  surferCountLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  conditionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  conditionItem: {
    flex: 1,
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  forecastContainer: {
    paddingRight: 16,
  },
  forecastCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 120,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  forecastRating: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  forecastDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastDetailText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 6,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  checkOutButton: {
    backgroundColor: COLORS.error,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
});

export default SpotDetailsScreen; 