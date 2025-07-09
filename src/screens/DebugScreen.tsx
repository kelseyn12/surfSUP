import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Button
} from 'react-native';
import { COLORS } from '../constants';
import { globalSurferCounts, userCheckIns, updateGlobalSurferCount } from '../services/globalState';
import { getSurferCount, checkInToSpot, checkOutFromSpot } from '../services/api';

const DebugScreen: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Refresh the component to show the latest values
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Reset all surfer counts to 0
  const resetCounts = () => {
    Alert.alert(
      "Reset Counts",
      "Are you sure you want to reset all surfer counts to 0?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            // Reset each spot's count
            for (const spotId in globalSurferCounts) {
              updateGlobalSurferCount(spotId, 0);
              await getSurferCount(spotId);
            }
            forceRefresh();
          }
        }
      ]
    );
  };

  // Create a test check-in
  const testCheckIn = async (spotId: string) => {
    try {
      const result = await checkInToSpot('test-user-id', spotId);
      if (result) {
        Alert.alert('Success', `Checked in to ${spotId}`);
      } else {
        Alert.alert('Error', 'Failed to check in');
      }
      forceRefresh();
    } catch (error) {
      console.error('Error in test check-in:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  // Test spots
  const spotIds = ['stonypoint', 'parkpoint', 'lesterriver', 'superiorentry'];

  return (
    <ScrollView style={styles.container} key={refreshKey}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Information</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={forceRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Surfer Counts</Text>
        {Object.entries(globalSurferCounts).map(([spotId, count]) => (
          <View key={spotId} style={styles.infoRow}>
            <Text style={styles.spotName}>{spotId}:</Text>
            <Text style={styles.countValue}>{count}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.resetButton} onPress={resetCounts}>
          <Text style={styles.resetButtonText}>Reset All Counts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Check-In Status</Text>
        {Object.entries(userCheckIns).map(([spotId, isCheckedIn]) => (
          <View key={spotId} style={styles.infoRow}>
            <Text style={styles.spotName}>{spotId}:</Text>
            <Text style={[
              styles.statusValue, 
              { color: isCheckedIn ? COLORS.success : COLORS.error }
            ]}>
              {isCheckedIn ? 'Checked In' : 'Not Checked In'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        <View style={styles.buttonRow}>
          {spotIds.map(spotId => (
            <TouchableOpacity 
              key={spotId}
              style={styles.testButton}
              onPress={() => testCheckIn(spotId)}
            >
              <Text style={styles.testButtonText}>Check In to {spotId}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last refreshed: {new Date().toLocaleTimeString()}
        </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  spotName: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  countValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  testButton: {
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  testButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.text.secondary,
  },
});

export default DebugScreen; 