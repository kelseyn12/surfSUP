import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { MESSAGES } from '../constants';
import { CheckIn } from '../types';
import { checkInToSpot } from '../services/mockBackend';
import { useAuthStore } from '../services/auth';

type CrowdLevel = NonNullable<CheckIn['conditions']>['crowdLevel'];
type WindQuality = NonNullable<CheckIn['conditions']>['windQuality'];

const CROWD_LEVELS: { value: CrowdLevel; label: string }[] = [
  { value: 'empty', label: 'Empty' },
  { value: 'uncrowded', label: 'Uncrowded' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'very-crowded', label: 'Very Crowded' },
];

const WIND_QUALITIES: { value: WindQuality; label: string }[] = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
];

const CheckInScreen: React.FC = () => {
  const route = useRoute<RootStackScreenProps<'CheckIn'>['route']>();
  const navigation = useNavigation<RootStackScreenProps<'CheckIn'>['navigation']>();
  const { user } = useAuthStore();

  const { spotId, spot } = route.params || { spotId: '0', spot: { name: 'Unknown Spot' } };

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Form state — defaults sourced from spot conditions when available via route.params
  const routeConditions = (route.params as any)?.conditions;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [waveHeight, setWaveHeight] = useState<number>(
    routeConditions?.waveHeight?.min != null
      ? Math.round(((routeConditions.waveHeight.min + routeConditions.waveHeight.max) / 2) * 2) / 2
      : 2.0
  );
  const [windSpeed, setWindSpeed] = useState<number>(routeConditions?.wind?.speed ?? 10);
  const [windDirection, setWindDirection] = useState<string>(
    routeConditions?.wind?.direction?.toLowerCase() ?? 'north'
  );
  const [swellPeriod, setSwellPeriod] = useState<number>(routeConditions?.swell?.[0]?.period ?? 6);
  const [waterTemp, setWaterTemp] = useState<number>(routeConditions?.waterTemp?.value ?? 38);
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>('uncrowded');
  const [windQuality, setWindQuality] = useState<WindQuality>('fair');

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to check in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const checkInData = {
        conditions: {
          waveHeight,
          crowdLevel,
          windQuality,
          overallRating: rating,
        },
        comment: notes.trim() || undefined,
      };

      const result = await checkInToSpot(user.id, spotId, checkInData);

      if (result) {
        Alert.alert('Success', MESSAGES.SUCCESS.CHECK_IN, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to check in. Please try again.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.spotName}>{spot?.name}</Text>
        <Text style={styles.dateTime}>{formattedDate} • {formattedTime}</Text>
      </View>

      {/* Overall rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Rating</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.ratingButton,
                rating >= value ? { backgroundColor: COLORS.primary } : {}
              ]}
              onPress={() => setRating(value)}
            >
              <Ionicons
                name="star"
                size={24}
                color={rating >= value ? COLORS.white : COLORS.lightGray}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conditions</Text>
        <View style={styles.conditionsContainer}>

          {/* Wave Height */}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Wave Height (ft)</Text>
            <View style={styles.conditionInputContainer}>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWaveHeight(Math.max(0, waveHeight - 0.5))}
              >
                <Ionicons name="remove" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.conditionValue}>{waveHeight.toFixed(1)}</Text>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWaveHeight(Math.round((waveHeight + 0.5) * 2) / 2)}
              >
                <Ionicons name="add" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wind Speed */}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Wind Speed (mph)</Text>
            <View style={styles.conditionInputContainer}>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWindSpeed(Math.max(0, windSpeed - 1))}
              >
                <Ionicons name="remove" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.conditionValue}>{windSpeed}</Text>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWindSpeed(windSpeed + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Swell Period */}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Swell Period (s)</Text>
            <View style={styles.conditionInputContainer}>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setSwellPeriod(Math.max(0, swellPeriod - 1))}
              >
                <Ionicons name="remove" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.conditionValue}>{swellPeriod}</Text>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setSwellPeriod(swellPeriod + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Water Temp */}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Water Temp (°F)</Text>
            <View style={styles.conditionInputContainer}>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWaterTemp(Math.max(32, waterTemp - 1))}
              >
                <Ionicons name="remove" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.conditionValue}>{waterTemp}</Text>
              <TouchableOpacity
                style={styles.conditionButton}
                onPress={() => setWaterTemp(waterTemp + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wind Direction */}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Wind Direction</Text>
            <View style={styles.windDirectionContainer}>
              {['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'].map((direction) => (
                <TouchableOpacity
                  key={direction}
                  style={[
                    styles.windDirectionButton,
                    windDirection === direction ? { backgroundColor: COLORS.primary } : {}
                  ]}
                  onPress={() => setWindDirection(direction)}
                >
                  <Text
                    style={[
                      styles.windDirectionText,
                      windDirection === direction ? { color: COLORS.white } : {}
                    ]}
                  >
                    {direction.slice(0, 2).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Crowd Level — user-reported */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crowd Level</Text>
        <View style={styles.chipRow}>
          {CROWD_LEVELS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, crowdLevel === value && styles.chipSelected]}
              onPress={() => setCrowdLevel(value)}
            >
              <Text style={[styles.chipText, crowdLevel === value && styles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Wind Quality — user-reported */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wind Quality</Text>
        <View style={styles.chipRow}>
          {WIND_QUALITIES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, windQuality === value && styles.chipSelected]}
              onPress={() => setWindQuality(value)}
            >
              <Text style={[styles.chipText, windQuality === value && styles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any observations about current conditions..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Check-In</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  spotName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  dateTime: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  conditionsContainer: {
    gap: 16,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  conditionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
  },
  conditionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  conditionValue: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  windDirectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    maxWidth: 200,
  },
  windDirectionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  windDirectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    color: COLORS.text.primary,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckInScreen;
