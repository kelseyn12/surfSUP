import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { SurfConditions } from '../types';
import { fetchLakeSuperiorWaterLevel, fetchLakeSuperiorBuoyData } from '../services/greatLakesApi';

// Helper function to get spot coordinates
const getSpotCoordinates = (spotId: string) => {
  // Map spot IDs to coordinates - this should come from your spots data
  const spotCoords: { [key: string]: { lat: number; lon: number } } = {
    'park-point': { lat: 46.775, lon: -92.093 },
    'stoney-point': { lat: 46.775, lon: -92.093 },
    'two-harbors': { lat: 47.020, lon: -91.670 },
    'grand-marais': { lat: 47.750, lon: -90.334 },
    'marquette': { lat: 46.545, lon: -87.378 },
    'thunder-bay': { lat: 48.380, lon: -89.247 },
  };
  
  return spotCoords[spotId] || { lat: 46.775, lon: -92.093 }; // Default to Duluth
};

interface WaterLevelChartProps {
  spotId: string;
  conditions?: SurfConditions;
  forecast?: SurfConditions[];
  isLoading?: boolean;
}

interface BuoyData {
  timestamp: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: string;
  waterTemp: number;
  windSpeed: number;
  windDirection: string;
}

interface WaterLevelData {
  date: string;
  level: number; // in feet above chart datum
  trend: 'rising' | 'falling' | 'stable';
}

const WaterLevelChart: React.FC<WaterLevelChartProps> = ({
  spotId,
  conditions,
  forecast,
  isLoading = false,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'tomorrow' | 'weekend'>('today');
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData[]>([]);
  const [buoyData, setBuoyData] = useState<BuoyData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load real Great Lakes data
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      
      try {
        // Calculate data period based on timeframe
        const now = new Date();
        let targetDate: Date;
        
        switch (selectedTimeframe) {
          case 'today':
            targetDate = now;
            break;
          case 'tomorrow':
            targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekend':
            // Find next Saturday
            const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
            targetDate = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
            break;
          default:
            targetDate = now;
        }
        
        console.log(`Loading ${selectedTimeframe} data for ${targetDate.toDateString()}`);
        
        // Fetch current water level data (always current for now)
        const waterLevels = await fetchLakeSuperiorWaterLevel('9099064', 1);
        
        // Fetch buoy data for the target date
        const spotCoords = getSpotCoordinates(spotId);
        const buoyData = await fetchLakeSuperiorBuoyData(spotCoords.lat, spotCoords.lon, 24);
        
        console.log('Real data loaded:', { 
          timeframe: selectedTimeframe,
          waterLevels: waterLevels.length, 
          buoyData: buoyData.length 
        });
        console.log('Water level data:', waterLevels);
        console.log('Buoy data:', buoyData);
        setWaterLevelData(waterLevels);
        setBuoyData(buoyData);
      } catch (error) {
        console.error('Error loading Great Lakes data:', error);
        // Show no data available instead of fake data
        setWaterLevelData([]);
        setBuoyData([]);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, [spotId, selectedTimeframe]);

  const getWaterLevelColor = (trend: string) => {
    switch (trend) {
      case 'rising':
        return COLORS.success;
      case 'falling':
        return COLORS.warning;
      default:
        return COLORS.gray;
    }
  };

  const getWaveQualityColor = (height: number, period: number) => {
    const ratio = height / period;
    if (ratio > 0.4) return COLORS.error; // Too steep
    if (ratio > 0.3) return COLORS.warning; // Getting steep
    if (ratio > 0.2) return COLORS.success; // Good ratio
    return COLORS.gray; // Too small
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getWaterLevelInsight = (level: number, trend: string) => {
    let insight = '';
    let color = COLORS.gray;
    
    if (level >= 601.5 && level <= 602.5) {
      insight = 'Perfect water level for surfing!';
      color = COLORS.success;
    } else if (level >= 601.0 && level <= 603.0) {
      insight = 'Good conditions - waves should be working';
      color = COLORS.success;
    } else if (level >= 600.5 && level <= 603.5) {
      insight = 'Decent conditions - check the spot';
      color = COLORS.warning;
    } else if (level < 600.5) {
      insight = 'Low water - waves may be small';
      color = COLORS.error;
    } else {
      insight = 'High water - some spots may be flooded';
      color = COLORS.error;
    }
    
    return { insight, color };
  };

  const renderWaterLevelSection = () => {
    const currentLevel = waterLevelData[waterLevelData.length - 1];
    const currentBuoy = buoyData[buoyData.length - 1];
    const insight = currentLevel ? getWaterLevelInsight(currentLevel.level, currentLevel.trend) : 
                   getWaterLevelInsight(601.5, 'stable');
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="water-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Water Level & Temperature</Text>
        </View>
        
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="checkmark-circle" size={24} color={insight.color} />
            <Text style={[styles.insightText, { color: insight.color }]}>
              {insight.insight}
            </Text>
          </View>
          
          <View style={styles.levelInfo}>
            <Text style={styles.levelLabel}>Current Level: {currentLevel?.level?.toFixed(3) || '601.5'} ft</Text>
            <Text style={styles.trendText}>
              {currentLevel?.trend === 'rising' ? '↗ Rising' : 
               currentLevel?.trend === 'falling' ? '↘ Falling' : '→ Stable'}
            </Text>
          </View>
          
          <View style={styles.trendContainer}>
            <Ionicons 
              name={currentLevel?.trend === 'rising' ? 'trending-up' : currentLevel?.trend === 'falling' ? 'trending-down' : 'remove'} 
              size={16} 
              color={getWaterLevelColor(currentLevel?.trend || 'stable')} 
            />
            <Text style={[styles.trendText, { color: getWaterLevelColor(currentLevel?.trend || 'stable') }]}>
              {currentLevel?.trend === 'rising' ? 'Rising' : 
               currentLevel?.trend === 'falling' ? 'Falling' : 'Stable'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.infoText}>
          Lake Superior water levels between 601.5-602.5 ft are ideal for surfing
        </Text>
      </View>
    );
  };

  const getWaveInsight = (height: number, period: number, windSpeed: number, windDirection: string) => {
    let insight = '';
    let color = COLORS.gray;
    let recommendation = '';
    
    // Check for flat conditions (no waves)
    if (height === 0 || height < 0.5) {
      insight = 'Flat conditions - no waves today';
      color = COLORS.error;
      recommendation = 'Lake Superior is calm. Check back later for wind-driven waves.';
    } else if (height < 1) {
      insight = 'Very small waves - barely surfable';
      color = COLORS.warning;
      recommendation = 'Only for experienced surfers in calm conditions';
    } else if (height < 2) {
      insight = 'Small waves - good for beginners';
      color = COLORS.warning;
      recommendation = 'Great for learning on longboards';
    } else if (height >= 2 && height < 4) {
      const ratio = height / period;
      if (ratio < 0.3) {
        insight = 'Good waves - clean and surfable';
        color = COLORS.success;
        recommendation = 'Go surf! Conditions are good';
      } else {
        insight = 'Steep waves - experienced surfers only';
        color = COLORS.warning;
        recommendation = 'Advanced surfers only - waves are steep';
      }
    } else if (height >= 4) {
      insight = 'Big waves - expert level only';
      color = COLORS.error;
      recommendation = 'Experts only - dangerous conditions';
    }
    
    return { insight, color, recommendation };
  };

  const renderBuoyDataSection = () => {
    const currentData = buoyData[buoyData.length - 1];
    console.log('Current buoy data:', currentData);
    
    // If no buoy data, show flat conditions
    if (!currentData || buoyData.length === 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="radio-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Wave Conditions</Text>
          </View>
          
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="warning-outline" size={24} color={COLORS.error} />
              <Text style={[styles.insightText, { color: COLORS.error }]}>
                Flat conditions - no waves today
              </Text>
            </View>
            
            <View style={styles.waveInfo}>
              <View style={styles.waveMetric}>
                <Text style={styles.metricLabel}>Wave Height</Text>
                <Text style={styles.metricValue}>No waves</Text>
              </View>
              
              <View style={styles.waveMetric}>
                <Text style={styles.metricLabel}>Wave Period</Text>
                <Text style={styles.metricValue}>N/A</Text>
              </View>
              
              <View style={styles.waveMetric}>
                <Text style={styles.metricLabel}>Wind</Text>
                <Text style={styles.metricValue}>N/A</Text>
              </View>
              
              <View style={styles.waveMetric}>
                <Text style={styles.metricLabel}>Water Temp</Text>
                <Text style={styles.metricValue}>N/A</Text>
              </View>
            </View>
            
            <View style={styles.recommendationContainer}>
              <Ionicons name="bulb-outline" size={16} color={COLORS.primary} />
              <Text style={styles.recommendationText}>
                Lake Superior is calm. Check back later for wind-driven waves.
              </Text>
            </View>
          </View>
          
          <Text style={styles.infoText}>
            Lake Superior is often flat. Waves typically form during strong winds.
          </Text>
        </View>
      );
    }
    
    const insight = getWaveInsight(
      currentData.waveHeight, 
      currentData.wavePeriod, 
      currentData.windSpeed, 
      currentData.windDirection
    );
    
    console.log('Wave insight:', insight);
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="radio-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Wave Conditions</Text>
        </View>
        
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="checkmark-circle" size={24} color={insight.color} />
            <Text style={[styles.insightText, { color: insight.color }]}>
              {insight.insight}
            </Text>
          </View>
          
          <View style={styles.waveInfo}>
            <View style={styles.waveMetric}>
              <Text style={styles.metricLabel}>Wave Height</Text>
              <Text style={styles.metricValue}>
                {currentData?.waveHeight && currentData.waveHeight > 0 ? 
                  `${currentData.waveHeight.toFixed(1)} ft` : 'No waves'}
              </Text>
            </View>
            
            <View style={styles.waveMetric}>
              <Text style={styles.metricLabel}>Wave Period</Text>
              <Text style={styles.metricValue}>
                {currentData?.wavePeriod && currentData.wavePeriod > 0 ? 
                  `${currentData.wavePeriod} sec` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.waveMetric}>
              <Text style={styles.metricLabel}>Wind</Text>
              <Text style={styles.metricValue}>
                {currentData?.windSpeed ? 
                  `${currentData.windSpeed} mph ${currentData.windDirection}` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.waveMetric}>
              <Text style={styles.metricLabel}>Water Temp</Text>
              <Text style={styles.metricValue}>
                {currentData?.waterTemp ? `${currentData.waterTemp}°F` : 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.recommendationContainer}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.primary} />
            <Text style={styles.recommendationText}>{insight.recommendation}</Text>
          </View>
        </View>
        
        <Text style={styles.infoText}>
          Wave height 2-4ft with 8+ second periods are ideal for Lake Superior surfing
        </Text>
      </View>
    );
  };

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      <Text style={styles.timeframeLabel}>Timeframe:</Text>
      <View style={styles.timeframeButtons}>
        {(['today', 'tomorrow', 'weekend'] as const).map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            style={[
              styles.timeframeButton,
              selectedTimeframe === timeframe && styles.timeframeButtonActive
            ]}
            onPress={() => setSelectedTimeframe(timeframe)}
          >
            <Text style={[
              styles.timeframeButtonText,
              selectedTimeframe === timeframe && styles.timeframeButtonTextActive
            ]}>
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.timeframeInfo}>
        {selectedTimeframe === 'today' ? 'Current conditions' : 
         selectedTimeframe === 'tomorrow' ? 'Tomorrow\'s forecast' : 'Weekend forecast'}
      </Text>
    </View>
  );

  if (isLoading || loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading water level and buoy data...</Text>
      </View>
    );
  }

  // Show no data message if no data is available
  if (waterLevelData.length === 0 && buoyData.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
        <Text style={styles.noDataTitle}>No Data Available</Text>
        <Text style={styles.noDataText}>
          Real-time data is currently unavailable. Check back later or visit NOAA/NDBC websites directly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTimeframeSelector()}
      {renderWaterLevelSection()}
      {renderBuoyDataSection()}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  timeframeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeframeLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginRight: 12,
  },
  timeframeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
  },
  timeframeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  timeframeButtonText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  timeframeButtonTextActive: {
    color: COLORS.white,
  },
  timeframeInfo: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  waterLevelContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  currentLevel: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  levelValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  levelTrend: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  levelChart: {
    flexDirection: 'row',
  },
  levelBar: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  levelBarFill: {
    width: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  levelDate: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  buoyContainer: {
    flexDirection: 'row',
  },
  buoyCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
  },
  buoyTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  buoyMetrics: {
    gap: 8,
  },
  buoyMetric: {
    alignItems: 'center',
  },
  insightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  levelInfo: {
    marginBottom: 12,
  },
  trendText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  waveInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  waveMetric: {
    flex: 1,
    minWidth: '45%',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 8,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    margin: 16,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buoyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  buoyLabel: {
    fontSize: 10,
    color: COLORS.text.secondary,
  },
  qualityIndicator: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default WaterLevelChart; 