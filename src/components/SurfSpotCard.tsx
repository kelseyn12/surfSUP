import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SurfSpot, SurfConditions } from '../types';
import { COLORS, SPACING } from '../constants';
import { formatWaveHeight, formatWind, formatTemperature } from '../utils/formatters';
import { fetchSurfConditions, getSurferCount } from '../services/api';
import { getGlobalSurferCount } from '../services/globalState';
import webSocketService, { WebSocketMessageType, WebSocketMessage } from '../services/websocket';

interface SurfSpotCardProps {
  spot: SurfSpot;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showConditions?: boolean;
  compact?: boolean;
  surferCount?: number;
}

const SurfSpotCard: React.FC<SurfSpotCardProps> = ({
  spot,
  isFavorite = false,
  onToggleFavorite,
  showConditions = true,
  compact = false,
  surferCount = 0,
}) => {
  const navigation = useNavigation();
  const [conditions, setConditions] = useState<SurfConditions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSurferCount, setCurrentSurferCount] = useState<number>(getGlobalSurferCount(spot.id));

  // Set up listener for surfer count updates
  useEffect(() => {
    const updateSurferCount = () => {
      // Always get from global state
      const count = getGlobalSurferCount(spot.id);
      console.log(`[SurfSpotCard] Getting count for ${spot.name}: ${count}`);
      setCurrentSurferCount(count);
    };
    
    // Initial update from props if provided
    if (surferCount > 0) {
      setCurrentSurferCount(surferCount);
    } else {
      updateSurferCount();
    }
    
    // Subscribe to WebSocket updates for this spot
    const unsubscribe = webSocketService.subscribe(
      WebSocketMessageType.SURFER_COUNT_UPDATE,
      (message: WebSocketMessage) => {
        if (message.payload.spotId === spot.id) {
          console.log(`[WebSocket] Received surfer count update for ${spot.name}: ${message.payload.count}`);
          setCurrentSurferCount(message.payload.count);
        }
      }
    );
    
    // Make sure WebSocket is connected
    if (!webSocketService.isConnected) {
      webSocketService.connect();
    }
    
    // Clean up
    return () => {
      unsubscribe();
    };
  }, [spot.id]);

  useEffect(() => {
    if (showConditions) {
      loadConditions();
    }
  }, [spot.id, showConditions]);

  const loadConditions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const spotConditions = await fetchSurfConditions(spot.id);
      setConditions(spotConditions);
    } catch (err) {
      setError('Failed to load conditions');
      console.error('Error loading conditions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    // Get latest surfer count from global state
    const latestCount = getGlobalSurferCount(spot.id);
    
    // Pass required data to the SpotDetails screen
    navigation.navigate('SpotDetails', { 
      spotId: spot.id, 
      spot: {
        ...spot,
        currentSurferCount: latestCount
      }
    });
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 7) return COLORS.surfConditions.excellent;
    if (rating >= 5) return COLORS.surfConditions.good;
    if (rating >= 3) return COLORS.surfConditions.fair;
    return COLORS.surfConditions.poor;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return COLORS.surfConditions.good;
      case 'intermediate':
        return COLORS.surfConditions.fair;
      case 'advanced':
      case 'expert':
        return COLORS.surfConditions.poor;
      default:
        return COLORS.gray;
    }
  };

  // Get appropriate surfer activity label
  const getSurferActivityLabel = (count: number): string => {
    if (count === 0) return 'No surfers';
    if (count < 3) return 'Low activity';
    if (count < 8) return 'Active';
    return 'Crowded';
  };

  // Get color for surfer count badge
  const getSurferCountColor = (count: number): string => {
    if (count === 0) return COLORS.gray;
    if (count < 3) return COLORS.success;
    if (count < 8) return COLORS.warning;
    return COLORS.error;
  };

  const renderConditions = () => {
    if (!showConditions) return null;
    
    if (isLoading) {
      return (
        <View style={styles.conditionsLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    
    if (error || !conditions) {
      return (
        <View style={styles.conditionsError}>
          <Text style={styles.errorText}>No conditions data</Text>
        </View>
      );
    }
    
    const conditionColor = getConditionColor(conditions.rating);
    
    return (
      <View style={styles.conditionsContainer}>
        <View style={[styles.ratingBadge, { backgroundColor: conditionColor }]}>
          <Text style={styles.ratingText}>{conditions.rating}/10</Text>
        </View>
        
        <View style={styles.conditionsDetails}>
          <View style={styles.conditionRow}>
            <Ionicons name="water" size={16} color={COLORS.primary} />
            <Text style={styles.conditionText}>
              {formatWaveHeight(conditions.waveHeight.min, conditions.waveHeight.max, conditions.waveHeight.unit)}
            </Text>
          </View>
          
          <View style={styles.conditionRow}>
            <Ionicons name="compass" size={16} color={COLORS.primary} />
            <Text style={styles.conditionText}>
              {formatWind(conditions.wind.speed, conditions.wind.direction, conditions.wind.unit)}
            </Text>
          </View>
          
          <View style={styles.conditionRow}>
            <Ionicons name="thermometer" size={16} color={COLORS.primary} />
            <Text style={styles.conditionText}>
              {formatTemperature(conditions.weather.temperature, conditions.weather.unit as 'F' | 'C')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.compactContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          {spot.imageUrls && spot.imageUrls.length > 0 ? (
            <Image
              source={{ uri: spot.imageUrls[0] }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Ionicons name="water-outline" size={32} color={COLORS.primary} />
            </View>
          )}
          
          {onToggleFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? COLORS.error : COLORS.white}
              />
            </TouchableOpacity>
          )}

          {/* Surfer count badge */}
          <View 
            style={[
              styles.surferCountBadge, 
              { backgroundColor: getSurferCountColor(currentSurferCount) }
            ]}
          >
            <Ionicons name="people" size={12} color={COLORS.white} />
            <Text style={styles.surferCountText}>{currentSurferCount}</Text>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <Text style={styles.spotName}>{spot.name}</Text>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(spot.difficulty) },
              ]}
            >
              <Text style={styles.difficultyText}>
                {spot.difficulty.charAt(0).toUpperCase() + spot.difficulty.slice(1)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.location}>
            {[spot.location?.city, spot.location?.state].filter(Boolean).join(', ')}
          </Text>
          
          {!compact && (
            <Text style={styles.description} numberOfLines={2}>
              {spot.description}
            </Text>
          )}

          {!compact && showConditions && !conditions && !isLoading && (
            <View style={styles.surferActivity}>
              <Text style={styles.surferActivityText}>
                {getSurferActivityLabel(currentSurferCount)}
              </Text>
            </View>
          )}
          
          {showConditions && renderConditions()}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  compactContainer: {
    marginBottom: SPACING.sm,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  spotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  difficultyText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  location: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  ratingText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  conditionsDetails: {
    flex: 1,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  conditionText: {
    fontSize: 12,
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  conditionsLoading: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionsError: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },
  surferCountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  surferCountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  surferActivity: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 12,
  },
  surferActivityText: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '500',
  }
});

export default SurfSpotCard; 