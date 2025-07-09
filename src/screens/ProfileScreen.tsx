import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabScreenProps } from '../navigation/types';
import { COLORS } from '../constants';
import type { SurfSession, SurfSpot } from '../types';
import { useAuthStore } from '../services/auth';
import { getUserSessionsById, calculateUserStats } from '../services/sessions';
import { fetchNearbySurfSpots } from '../services/api';
import { formatShortDate, formatDuration } from '../utils/dateTime';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenProps<'Profile'>['navigation']>();
  const { user, updateUserProfile } = useAuthStore();
  const [sessions, setSessions] = useState<SurfSession[]>([]);
  const [spots, setSpots] = useState<Record<string, SurfSpot>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const userSessions = await getUserSessionsById(user.id);
      setSessions(userSessions);
      const stats = await calculateUserStats(user.id);
      await updateUserProfile({ stats });
      const spots = await fetchNearbySurfSpots(46.7825, -92.0856);
      if (spots) {
        const spotsMap = spots.reduce((acc, spot) => {
          acc[spot.id] = spot;
          return acc;
        }, {} as Record<string, SurfSpot>);
        setSpots(spotsMap);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, updateUserProfile]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Please log in to view your profile</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: user?.profileImageUrl || 'https://via.placeholder.com/150' }} 
          style={styles.profileImage} 
        />
        <Text style={styles.profileName}>{user?.name || 'Surfer'}</Text>
        <Text style={styles.profileUsername}>@{user?.username || ''}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.stats?.totalSessions || 0}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(user?.stats?.averageSessionLength || 0)}
          </Text>
          <Text style={styles.statLabel}>Avg Session</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {user?.stats?.longestSession ? formatDuration(user.stats.longestSession) : '0h 0m'}
          </Text>
          <Text style={styles.statLabel}>Longest</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <TouchableOpacity 
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
            >
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionSpot}>
                  {spots[session.spotId]?.name || 'Unknown Spot'}
                </Text>
                <Text style={styles.sessionDate}>{formatShortDate(session.startTime)}</Text>
              </View>
              <View style={styles.sessionDetails}>
                <View style={styles.sessionDetail}>
                  <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.sessionDetailText}>
                    {formatDuration(session.duration || 0)}
                  </Text>
                </View>
                {session.conditions && (
                  <View style={styles.sessionDetail}>
                    <Ionicons name="water-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.sessionDetailText}>
                      {session.conditions.waveHeight}ft
                    </Text>
                  </View>
                )}
                <View style={styles.sessionDetail}>
                  <Ionicons name="sunny-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.sessionDetailText}>
                    {session.conditions?.quality || 'good'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No sessions logged yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('LogSession', { spotId: '' })}
            >
              <Text style={styles.emptyStateButtonText}>Log Your First Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('LogSession', { spotId: '' })}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Log Session</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Settings</Text>
        </TouchableOpacity>
      </View>
      
      {/* Debug Button - only visible in development */}
      {__DEV__ && (
        <View style={styles.debugSection}>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => navigation.navigate('Debug')}
          >
            <Ionicons name="bug-outline" size={20} color={COLORS.white} />
            <Text style={styles.debugButtonText}>Debug Panel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  profileUsername: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: COLORS.lightGray,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionSpot: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  sessionDate: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDetailText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  debugSection: {
    alignItems: 'center',
    padding: 16,
  },
  debugButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen; 