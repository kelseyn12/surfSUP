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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { SurfConditions } from '../types';
import { 
  fetchSurfConditions, 
  fetchSurfForecast, 
  fetchNearbySurfSpots 
} from '../services/api';
import { 
  checkInToSpot, 
  checkOutFromSpot, 
  getSurferCount, 
  getActiveCheckInForUser, 
  getActiveCheckInForUserAnywhere 
} from '../services/mockBackend';
import { isUserCheckedInAt, getGlobalSurferCount } from '../services/globalState';
import webSocketService, { WebSocketMessageType } from '../services/websocket';
import { HeaderBar } from '../components';
import { addFavoriteSpot, removeFavoriteSpot } from '../services/storage';
import { useAuthStore } from '../services/auth';

const SpotDetailsScreen: React.FC<any> = (props) => {
  // Use props directly instead of hooks
  const route = props.route;
  const navigation = props.navigation;
  
  // Get spot details from route params or use fallback
  const { spotId: rawSpotId, spot } = route?.params || { spotId: '0', spot: { name: 'Unknown Spot' } };
  
  // Use a valid spot ID if none provided (for testing)
  const spotId = rawSpotId === '0' ? 'stoneypoint' : rawSpotId;
  
  // SpotDetailsScreen initialized
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentConditions, setCurrentConditions] = useState<SurfConditions | null>(null);
  const [forecast, setForecast] = useState<SurfConditions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [surferCount, setSurferCount] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const { user } = useAuthStore();

  // Function to load spot data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch current conditions
      const conditions = await fetchSurfConditions(spotId);
      if (conditions) {
        setCurrentConditions(conditions);
        setSurferCount(conditions.surferCount || 0);
      }

      // Fetch forecast
      const forecastData = await fetchSurfForecast(spotId, 14);
      if (forecastData) {
        setForecast(forecastData);
      }
    } catch (error) {
      console.error('Error loading spot data:', error);
      Alert.alert('Error', 'Failed to load spot information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [spotId]);

  // Function to check if the user is already checked in at this spot
  const checkExistingCheckIn = React.useCallback(async () => {
    try {
      // In a real app, you would get the actual userId from auth state
      const userId = 'test-user-id';
      
      // Only check for check-ins at THIS spot
      const activeCheckIn = await getActiveCheckInForUser(userId, spotId);
      
      
      if (activeCheckIn) {
        // User is checked in at this spot
       
        setIsCheckedIn(true);
        setCheckInId(activeCheckIn.id);
      } else {
        // User is not checked in at this spot
        
        setIsCheckedIn(false);
        setCheckInId(null);
      }
    } catch (error) {
      
    }
  }, [spotId]);

  // Initial setup when spot changes
  useEffect(() => {
    // Reset check-in status and load data
    setIsCheckedIn(isUserCheckedInAt(spotId));
    setSurferCount(getGlobalSurferCount(spotId));
    loadData();
    checkExistingCheckIn();
  }, [spotId, loadData, checkExistingCheckIn]);
  
  // Listen for WebSocket updates about surfer counts
  useEffect(() => {
    // Subscribe to WebSocket updates for this spot
    const unsubscribe = webSocketService.subscribe(
      WebSocketMessageType.SURFER_COUNT_UPDATE,
      (message) => {
        if (typeof message.payload === 'object' && message.payload && 'spotId' in message.payload && (message.payload as any).spotId === spotId) {
          const payload = message.payload as { spotId: string; count: number };
          setSurferCount(payload.count);
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
        if (typeof message.payload === 'object' && message.payload && 'userId' in message.payload && 'spotId' in message.payload && (message.payload as any).userId === 'test-user-id' && (message.payload as any).spotId === spotId) {
          const payload = message.payload as { userId: string; spotId: string; isCheckedIn: boolean };
          console.log(`[WebSocket] Received check-in status update for current spot: ${payload.isCheckedIn}`);
          setIsCheckedIn(payload.isCheckedIn);
          // If checked out, also clear the check-in ID
          if (!payload.isCheckedIn) {
            setCheckInId(null);
          }
        }
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [spotId]);

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!user?.id || !spot) return;
    if (isFavorite) {
      await removeFavoriteSpot(user.id, spot.id);
      setIsFavorite(false);
    } else {
      await addFavoriteSpot(user.id, spot);
      setIsFavorite(true);
    }
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

  const getSurfLikelihoodColor = (likelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing'): string => {
    switch (likelihood) {
      case 'Flat':
        return COLORS.gray;
      case 'Maybe Surf':
        return COLORS.warning;
      case 'Good':
        return COLORS.success;
      case 'Firing':
        return COLORS.error; // Red for "firing" conditions
      default:
        return COLORS.gray;
    }
  };

  // Create a formatted forecast from the API data
  console.log(`🔍 Forecast data in UI:`, {
    forecastLength: forecast?.length || 0,
    forecastSample: forecast?.[0],
    hasForecast: forecast && forecast.length > 0
  });
  
  const formattedForecast = (forecast || []).slice(0, 14).map((item, index) => {
    const day = index === 0 ? 'Today' : 
               index === 1 ? 'Tomorrow' : 
               new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      day,
      timestamp: item.timestamp,
      waveHeight: `${item.waveHeight.min}-${item.waveHeight.max}${item.waveHeight.unit}`,
      period: item.swell && item.swell.length > 0 && item.swell[0]?.period ? `${Math.round(item.swell[0].period)}s` : 'N/A',
      wind: `${item.wind.direction} ${item.wind.speed}${item.wind.unit}`,
      rating: item.rating,
      surfLikelihood: item.surfLikelihood,
      surfReport: item.surfReport,
      notes: item.notes,
    };
  });

  // Simple back button handler
  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSurfBadgeTap = (notes: string[]) => {
    if (notes && notes.length > 0) {
      setSelectedNotes(notes);
      setNotesModalVisible(true);
    } else {
      // Show a simple alert if no notes are available
      Alert.alert(
        'No Additional Notes',
        'No detailed notes are available for this forecast period.',
        [{ text: 'OK' }]
      );
    }
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
                    {currentConditions.waveHeight.max < 0.5 
                      ? 'Flat' 
                      : `${currentConditions.waveHeight.min.toFixed(1)}-${currentConditions.waveHeight.max.toFixed(1)} ${currentConditions.waveHeight.unit}`
                    }
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Period</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.swell && currentConditions.swell.length > 0 && currentConditions.swell[0].period > 0 
                      ? `${currentConditions.swell[0].period}s` 
                      : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.conditionRow}>
                <View style={styles.conditionItem}>
                  <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Wind</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.wind.direction ? `${currentConditions.wind.direction} @ ${currentConditions.wind.speed}${currentConditions.wind.unit === 'mph' ? 'mph' : 'kn'}` : `${currentConditions.wind.speed}${currentConditions.wind.unit === 'mph' ? 'mph' : 'kn'}`}
                  </Text>
                </View>
                <View style={styles.conditionItem}>
                  <Ionicons name="thermometer-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.conditionLabel}>Water Temp</Text>
                  <Text style={styles.conditionValue}>
                    {currentConditions.weather?.temperature ? Number(currentConditions.weather.temperature).toFixed(1) : 'N/A'}°{currentConditions.weather?.unit || 'F'}
                  </Text>
                </View>
              </View>
              
              {/* Surf Tag */}
              {currentConditions.surfLikelihood && (
                <TouchableOpacity 
                  style={[styles.surfTagBadge, { backgroundColor: getSurfLikelihoodColor(currentConditions.surfLikelihood) }]}
                  onPress={() => handleSurfBadgeTap(currentConditions.notes || [])}
                  activeOpacity={0.8}
                >
                  <Text style={styles.surfTagText}>
                    {currentConditions.surfLikelihood}
                  </Text>
                </TouchableOpacity>
              )}

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
          {forecast && forecast.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.forecastContainer}
            >
              {formattedForecast.map((day, index) => (
                <View key={index} style={styles.forecastCard}>
                  <Text style={styles.forecastDay}>{day.day}</Text>
                  
                  {/* Surf Likelihood Badge */}
                  {day.surfLikelihood && (
                    <TouchableOpacity 
                      style={[styles.forecastSurfBadge, { backgroundColor: getSurfLikelihoodColor(day.surfLikelihood) }]}
                      onPress={() => handleSurfBadgeTap(day.notes || [])}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.forecastSurfBadgeText}>
                        {day.surfLikelihood}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Forecast Summary */}
                  {day.surfReport && (
                    <Text style={styles.forecastSummaryText}>
                      {day.surfReport}
                    </Text>
                  )}
                  
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

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotesModalVisible(false)}
        >
          <View style={styles.notesModalContent}>
            <Text style={styles.notesModalTitle}>Surf Notes</Text>
            {selectedNotes.map((note, index) => (
              <Text key={index} style={styles.notesModalText}>
                • {note}
              </Text>
            ))}
            <TouchableOpacity 
              style={styles.notesModalCloseButton}
              onPress={() => setNotesModalVisible(false)}
            >
              <Text style={styles.notesModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  conditionsDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  conditionsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  surfReportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  surfReportText: {
    fontSize: 18,
    color: COLORS.text.primary,
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
    lineHeight: 24,
  },
  surfLikelihoodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  surfLikelihoodText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  notesContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  surfTagBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  surfTagText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  surfSummaryContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  surfSummaryText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  forecastSurfBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  forecastSurfBadgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  forecastSummaryText: {
    fontSize: 10,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  notesModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  notesModalText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  notesModalCloseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  notesModalCloseText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SpotDetailsScreen; 