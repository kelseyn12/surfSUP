import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { SurfSpot } from '../types';
import { SurfSpotCard } from '../components';
import { eventEmitter, AppEvents } from '../services/events';
import { getFavoriteSpots, removeFavoriteSpot } from '../services/storage';
import { getSurferCount } from '../services/api';
import { useAuthStore } from '../services/auth';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Favorites'>['navigation']>();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteSpots, setFavoriteSpots] = useState<SurfSpot[]>([]);
  const [surferCounts, setSurferCounts] = useState<Record<string, number>>({});

  const loadFavoriteSpots = useCallback(async () => {
    if (!user?.id) return;
    const spots = await getFavoriteSpots(user.id);
    setFavoriteSpots(spots);
  }, [user?.id]);

  useEffect(() => {
    loadFavoriteSpots();
  }, [loadFavoriteSpots]);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const spot of favoriteSpots) {
        counts[spot.id] = await getSurferCount(spot.id);
      }
      setSurferCounts(counts);
    };
    fetchCounts();
  }, [favoriteSpots]);

  useFocusEffect(
    React.useCallback(() => {
      loadFavoriteSpots();
      return () => {};
    }, [loadFavoriteSpots])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFavoriteSpots().then(() => {
      setRefreshing(false);
    });
  };

  const handleRemoveFavorite = async (spotId: string) => {
    if (!user?.id) return;
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
          onPress: async () => {
            await removeFavoriteSpot(user.id, spotId);
            loadFavoriteSpots();
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
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.emptyText}>You haven't added any favorites yet</Text>
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
    </SafeAreaView>
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