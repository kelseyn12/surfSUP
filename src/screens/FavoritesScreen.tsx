import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants';
import { SurfSpot } from '../types';
import { SurfSpotCard } from '../components';
import { getSurferCount } from '../services/api';
import { eventEmitter, AppEvents } from '../services/events';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Favorites'>['navigation']>();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for favorite spots
  const [favoriteSpots, setFavoriteSpots] = useState<SurfSpot[]>([
    {
      id: 'stonypoint',
      name: 'Stoney Point',
      location: { 
        latitude: 46.9463, 
        longitude: -91.8944,
        city: 'Duluth',
        state: 'MN',
        country: 'USA' 
      },
      type: ['point-break'],
      difficulty: 'intermediate',
      description: 'Popular spot for Lake Superior surfers with consistent waves during NE winds.',
      imageUrls: ['https://example.com/stonypoint.jpg'],
      createdAt: '2023-01-15T00:00:00.000Z',
      updatedAt: '2023-01-15T00:00:00.000Z',
    },
    {
      id: 'parkpoint',
      name: 'Park Point',
      location: { 
        latitude: 46.7616, 
        longitude: -92.0593,
        city: 'Duluth',
        state: 'MN',
        country: 'USA'
      },
      type: ['beach-break'],
      difficulty: 'beginner',
      description: 'Long sandy beach with gentle waves, perfect for beginners during calm conditions.',
      imageUrls: ['https://example.com/parkpoint.jpg'],
      createdAt: '2023-01-15T00:00:00.000Z',
      updatedAt: '2023-01-15T00:00:00.000Z',
    },
    {
      id: 'lesterriver',
      name: 'Lester River',
      location: { 
        latitude: 46.8330, 
        longitude: -92.0070,
        city: 'Duluth',
        state: 'MN',
        country: 'USA'
      },
      type: ['river-mouth'],
      difficulty: 'advanced',
      description: 'River mouth break that works well during strong winds and storms.',
      imageUrls: ['https://example.com/lesterriver.jpg'],
      createdAt: '2023-01-15T00:00:00.000Z',
      updatedAt: '2023-01-15T00:00:00.000Z',
    },
  ]);
  
  const [surferCounts, setSurferCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load initial surfer counts
    loadSurferCounts();

    // Listen for surfer count updates
    const handleSurferCountUpdate = (data: { spotId: string, count: number }) => {
      console.log(`[EVENT] Surfer count updated for ${data.spotId}: ${data.count}`);
      
      // Update the surfer count for the specific spot
      setSurferCounts(currentCounts => ({
        ...currentCounts,
        [data.spotId]: data.count
      }));
    };

    // Register event listener
    eventEmitter.on(AppEvents.SURFER_COUNT_UPDATED, handleSurferCountUpdate);

    // Cleanup listener on unmount
    return () => {
      eventEmitter.off(AppEvents.SURFER_COUNT_UPDATED, handleSurferCountUpdate);
    };
  }, []);

  // Refresh surfer counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[DEBUG] FavoritesScreen focused, refreshing data');
      loadSurferCounts();
      return () => {};
    }, [])
  );

  const loadSurferCounts = async () => {
    console.log('[DEBUG] Loading surfer counts for favorites');
    const counts: Record<string, number> = {};
    
    for (const spot of favoriteSpots) {
      const count = await getSurferCount(spot.id);
      console.log(`[DEBUG] Getting latest count for ${spot.name}: ${count}`);
      counts[spot.id] = count;
    }
    
    setSurferCounts(counts);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSurferCounts().then(() => {
      setRefreshing(false);
    });
  };

  const handleRemoveFavorite = (spotId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this spot from favorites?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => {
            setFavoriteSpots(favoriteSpots.filter(spot => spot.id !== spotId));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderSpotItem = ({ item }: { item: SurfSpot }) => (
    <SurfSpotCard
      spot={item}
      showConditions={true}
      surferCount={surferCounts[item.id] || 0}
      isFavorite={true}
      onToggleFavorite={() => handleRemoveFavorite(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteSpots}
        keyExtractor={(item) => item.id}
        renderItem={renderSpotItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Favorite Spots</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No favorite spots yet</Text>
            <Text style={styles.emptySubText}>
              Add spots to your favorites to see them here
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Map')}
            >
              <Text style={styles.exploreButtonText}>Find Spots</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  spotCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  spotType: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  favoriteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  exploreButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FavoritesScreen; 