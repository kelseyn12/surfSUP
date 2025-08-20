import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { SurfSpot } from '../types';
import { SurfSpotCard } from '../components';
import { fetchNearbySurfSpots } from '../services/api';
import { getGlobalSurferCount } from '../services/globalState';

interface FilterState {
  difficulty: string[];
  type: string[];
  region: string[];
  hasAmenities: string[];
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [allSpots, setAllSpots] = useState<SurfSpot[]>([]);
  const [filteredSpots, setFilteredSpots] = useState<SurfSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    difficulty: [],
    type: [],
    region: [],
    hasAmenities: [],
  });

  // Available filter options
  const difficultyOptions = ['beginner', 'intermediate', 'advanced', 'expert'];
  const typeOptions = ['beach-break', 'point-break', 'reef', 'river-mouth'];
  const regionOptions = ['superior'];
  const amenityOptions = ['parking', 'restrooms', 'showers'];

  const loadSpots = useCallback(async () => {
    try {
      setLoading(true);
      // Load all spots (not just nearby)
      const spots = await fetchNearbySurfSpots(46.7825, -92.0856, 1000); // Large radius to get all spots
      if (spots) {
        const updatedSpots = spots.map(spot => ({
          ...spot,
          currentSurferCount: getGlobalSurferCount(spot.id)
        }));
        setAllSpots(updatedSpots);
      }
    } catch (error) {
      console.error('Error loading spots:', error);
      Alert.alert('Error', 'Failed to load surf spots');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter spots based on search query and filters
  const filterSpots = useCallback(() => {
    let filtered = [...allSpots];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(spot =>
        spot.name.toLowerCase().includes(query) ||
        spot.location.city?.toLowerCase().includes(query) ||
        spot.location.state?.toLowerCase().includes(query) ||
        spot.description?.toLowerCase().includes(query)
      );
    }

    // Difficulty filter
    if (filters.difficulty.length > 0) {
      filtered = filtered.filter(spot =>
        filters.difficulty.includes(spot.difficulty)
      );
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(spot =>
        spot.type.some(type => filters.type.includes(type))
      );
    }

    // Region filter
    if (filters.region.length > 0) {
      filtered = filtered.filter(spot =>
        filters.region.includes(spot.region || 'superior')
      );
    }

    // Amenities filter
    if (filters.hasAmenities.length > 0) {
      filtered = filtered.filter(spot =>
        spot.amenities?.some(amenity => filters.hasAmenities.includes(amenity))
      );
    }

    setFilteredSpots(filtered);
  }, [allSpots, searchQuery, filters]);

  // Apply filters when any filter changes
  useEffect(() => {
    filterSpots();
  }, [filterSpots]);

  // Load spots on mount
  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSpots().then(() => {
      setRefreshing(false);
    });
  }, [loadSpots]);

  const toggleFilter = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [filterType]: newValues,
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      difficulty: [],
      type: [],
      region: [],
      hasAmenities: [],
    });
    setSearchQuery('');
  };

  const renderFilterChip = (
    label: string,
    value: string,
    filterType: keyof FilterState,
    color: string = COLORS.primary
  ) => {
    const isSelected = filters[filterType].includes(value);
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected ? color : COLORS.lightGray,
            borderColor: isSelected ? color : COLORS.lightGray,
          },
        ]}
        onPress={() => toggleFilter(filterType, value)}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: isSelected ? COLORS.white : COLORS.text.primary },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFilterSection = (
    title: string,
    options: { value: string; label: string; color?: string }[],
    filterType: keyof FilterState
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <View style={styles.filterChips}>
        {options.map(option =>
          renderFilterChip(
            option.label,
            option.value,
            filterType,
            option.color
          )
        )}
      </View>
    </View>
  );

  const renderSpotItem = ({ item }: { item: SurfSpot }) => (
    <SurfSpotCard
      spot={item}
      showConditions={true}
      surferCount={item.currentSurferCount || 0}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyText}>
        {searchQuery.trim() || Object.values(filters).some(f => f.length > 0)
          ? 'No spots match your search criteria'
          : 'Search for surf spots'}
      </Text>
      <Text style={styles.emptySubText}>
        Try adjusting your search terms or filters
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Spots</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'close' : 'filter'}
            size={24}
            color={COLORS.text?.primary || COLORS.text || '#000'}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray || '#666'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spots by name, location, or description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray || '#666'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.gray || '#666'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {renderFilterSection(
            'Difficulty',
            [
              { value: 'beginner', label: 'Beginner', color: COLORS.success },
              { value: 'intermediate', label: 'Intermediate', color: COLORS.warning },
              { value: 'advanced', label: 'Advanced', color: COLORS.error },
              { value: 'expert', label: 'Expert', color: COLORS.error },
            ],
            'difficulty'
          )}

          {renderFilterSection(
            'Wave Type',
            [
              { value: 'beach-break', label: 'Beach Break' },
              { value: 'point-break', label: 'Point Break' },
              { value: 'reef', label: 'Reef' },
              { value: 'river-mouth', label: 'River Mouth' },
            ],
            'type'
          )}

          {renderFilterSection(
            'Amenities',
            [
              { value: 'parking', label: 'Parking' },
              { value: 'restrooms', label: 'Restrooms' },
              { value: 'showers', label: 'Showers' },
            ],
            'hasAmenities'
          )}
        </View>
      )}

      {/* Results */}
      <FlatList
        data={filteredSpots}
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
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          filteredSpots.length > 0 ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          ) : null
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  clearFiltersText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultsHeader: {
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SearchScreen; 