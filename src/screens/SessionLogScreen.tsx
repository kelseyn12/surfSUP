import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { COLORS, MESSAGES } from '../constants';
import { SurfConditions, SurfSession } from '../types';
import type { RootStackParamList } from '../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// In a real app, you would use a proper date/time picker
const TimeInput = ({ 
  label, 
  value, 
  onChangeText 
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void; 
}) => (
  <View style={styles.inputRow}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.timeInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="00:00"
      placeholderTextColor={COLORS.gray}
      keyboardType="numbers-and-punctuation"
    />
  </View>
);

const BoardTypeSelector = ({ 
  selected, 
  onSelect 
}: { 
  selected: NonNullable<SurfSession['board']>['type']; 
  onSelect: (boardType: NonNullable<SurfSession['board']>['type']) => void; 
}) => {
  const boardTypes: NonNullable<SurfSession['board']>['type'][] = ['shortboard', 'longboard', 'fish', 'funboard', 'sup', 'other'];
  
  return (
    <View style={styles.boardTypesContainer}>
      {boardTypes.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.boardTypeButton,
            selected === type ? { backgroundColor: COLORS.primary } : {}
          ]}
          onPress={() => onSelect(type)}
        >
          <Text
            style={[
              styles.boardTypeText,
              selected === type ? { color: COLORS.white } : {}
            ]}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const SessionLogScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'SessionLog'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // Get spot details from route params or use fallback
  const { spotId, spot } = route.params;
  
  // Current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Form state
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('09:00');
  const [rating, setRating] = useState(4);
  const [boardType, setBoardType] = useState<NonNullable<SurfSession['board']>['type']>('shortboard');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState<SurfConditions>({
    spotId,
    timestamp: new Date().toISOString(),
    waveHeight: {
      min: 2,
      max: 3,
      unit: 'ft'
    },
    wind: {
      speed: 5,
      direction: 'N',
      unit: 'mph'
    },
    swell: [{
      height: 3,
      period: 12,
      direction: 'W'
    }],
    tide: {
      current: 2.5,
      unit: 'ft'
    },
    weather: {
      temperature: 62,
      condition: 'sunny',
      unit: 'F'
    },
    rating: 7,
    source: 'user'
  });

  // Calculate duration (simplified)
  const calculateDuration = () => {
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Assuming session spans to next day
      }
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return `${hours}h ${minutes}m`;
    } catch (e) {
      return 'Invalid time';
    }
  };

  // Submit session log
  const handleSubmit = () => {
    // Validate times
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Please enter start and end times');
      return;
    }

    // In a real app, you would save this to storage or API
    console.log('Session logged', { 
      spotId, 
      spotName: spot?.name,
      date: currentDate.toISOString(),
      startTime,
      endTime,
      duration: calculateDuration(),
      rating,
      board: {
        type: boardType
      },
      notes,
      conditions
    });

    // Show success message and navigate back
    Alert.alert(
      'Success',
      MESSAGES.SUCCESS.SESSION_LOGGED,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.spotName}>{spot?.name}</Text>
        <Text style={styles.dateTime}>{formattedDate}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        
        <TimeInput
          label="Start Time"
          value={startTime}
          onChangeText={setStartTime}
        />
        
        <TimeInput
          label="End Time"
          value={endTime}
          onChangeText={setEndTime}
        />

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Duration</Text>
          <Text style={styles.durationText}>{calculateDuration()}</Text>
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Rating</Text>
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
                <Text
                  style={[
                    styles.ratingText,
                    rating >= value ? { color: COLORS.white } : {}
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Board</Text>
        <BoardTypeSelector
          selected={boardType}
          onSelect={setBoardType}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conditions</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Wave Height (ft)</Text>
          <TextInput
            style={styles.conditionInput}
            value={conditions.waveHeight.min.toString()}
            onChangeText={(text) => setConditions({
              ...conditions,
              waveHeight: {
                ...conditions.waveHeight,
                min: parseFloat(text) || 0,
                max: parseFloat(text) + 1 || 1
              }
            })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Wind Speed (mph)</Text>
          <TextInput
            style={styles.conditionInput}
            value={conditions.wind.speed.toString()}
            onChangeText={(text) => setConditions({
              ...conditions,
              wind: {
                ...conditions.wind,
                speed: parseInt(text) || 0
              }
            })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Wind Direction</Text>
          <View style={styles.selectContainer}>
            {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((direction) => (
              <TouchableOpacity
                key={direction}
                style={[
                  styles.selectOption,
                  conditions.wind.direction === direction ? { backgroundColor: COLORS.primary } : {}
                ]}
                onPress={() => setConditions({
                  ...conditions,
                  wind: {
                    ...conditions.wind,
                    direction
                  }
                })}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    conditions.wind.direction === direction ? { color: COLORS.white } : {}
                  ]}
                >
                  {direction}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Water Temperature (°F)</Text>
          <TextInput
            style={styles.conditionInput}
            value={conditions.weather.temperature.toString()}
            onChangeText={(text) => setConditions({
              ...conditions,
              weather: {
                ...conditions.weather,
                temperature: parseInt(text) || 0
              }
            })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Swell Period (s)</Text>
          <TextInput
            style={styles.conditionInput}
            value={conditions.swell[0].period.toString()}
            onChangeText={(text) => setConditions({
              ...conditions,
              swell: [
                {
                  ...conditions.swell[0],
                  period: parseInt(text) || 0
                }
              ]
            })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Swell Direction</Text>
          <View style={styles.selectContainer}>
            {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((direction) => (
              <TouchableOpacity
                key={direction}
                style={[
                  styles.selectOption,
                  conditions.swell[0].direction === direction ? { backgroundColor: COLORS.primary } : {}
                ]}
                onPress={() => setConditions({
                  ...conditions,
                  swell: [
                    {
                      ...conditions.swell[0],
                      direction
                    }
                  ]
                })}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    conditions.swell[0].direction === direction ? { color: COLORS.white } : {}
                  ]}
                >
                  {direction}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Tide</Text>
          <View style={styles.selectContainer}>
            {['Low', 'Rising', 'High', 'Falling'].map((tideType) => (
              <TouchableOpacity
                key={tideType}
                style={[
                  styles.selectOption,
                  conditions.tide.current === getTideHeight(tideType) ? { backgroundColor: COLORS.primary } : {}
                ]}
                onPress={() => setConditions({
                  ...conditions,
                  tide: {
                    ...conditions.tide,
                    current: getTideHeight(tideType)
                  }
                })}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    conditions.tide.current === getTideHeight(tideType) ? { color: COLORS.white } : {}
                  ]}
                >
                  {tideType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about your session..."
          placeholderTextColor={COLORS.gray}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Log Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const getTideHeight = (tideType: string): number => {
  switch (tideType) {
    case 'Low':
      return 0;
    case 'Rising':
      return 2;
    case 'High':
      return 4;
    case 'Falling':
      return 3;
    default:
      return 2;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  spotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  dateTime: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  section: {
    padding: 20,
    backgroundColor: COLORS.white,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
    width: 100,
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  durationText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  boardTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  boardTypeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  boardTypeText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  conditionInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 2,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectOptionText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SessionLogScreen; 