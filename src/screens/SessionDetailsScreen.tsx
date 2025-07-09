import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants';
import { SurfSession } from '../types';
import { getSessionById, deleteSession } from '../services/sessions';
import { HeaderBar } from '../components';
import { formatDate, formatTime } from '../utils/dateTime';

const SessionDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId } = route.params as { sessionId: string };

  const [session, setSession] = useState<SurfSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessionDetails();
  }, [sessionId]);

  const loadSessionDetails = async () => {
    try {
      setIsLoading(true);
      const sessionData = await getSessionById(sessionId);
      if (sessionData) {
        setSession(sessionData);
      } else {
        Alert.alert('Error', 'Session not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading session details:', error);
      Alert.alert('Error', 'Failed to load session details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete session');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Session Details"
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleDeleteSession} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <Text style={styles.text}>{formatDate(session.startTime)}</Text>
          <Text style={styles.text}>
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </Text>
          <Text style={styles.text}>Duration: {session.duration} minutes</Text>
        </View>

        {session.board && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board</Text>
            <Text style={styles.text}>Type: {session.board.type}</Text>
            {session.board.details && (
              <Text style={styles.text}>Details: {session.board.details}</Text>
            )}
          </View>
        )}

        {session.conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <Text style={styles.text}>Wave Height: {session.conditions.waveHeight}ft</Text>
            <Text style={styles.text}>Quality: {session.conditions.quality}</Text>
          </View>
        )}

        {session.performance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <Text style={styles.text}>Waves Ridden: {session.performance.wavesRidden}</Text>
            {session.performance.longestRide && (
              <Text style={styles.text}>Longest Ride: {session.performance.longestRide}s</Text>
            )}
            {session.performance.bestWave && (
              <Text style={styles.text}>Best Wave: {session.performance.bestWave}/10</Text>
            )}
          </View>
        )}

        {session.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.text}>{session.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  content: {
    flex: 1,
    padding: 16
  },
  backButton: {
    padding: 8
  },
  deleteButton: {
    padding: 8
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  text: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4
  }
});

export default SessionDetailsScreen; 