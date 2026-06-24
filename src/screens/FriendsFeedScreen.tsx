import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { HeaderBar } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../services/auth';
import { RootStackScreenProps } from '../navigation/types';
import { firestoreGetFriendIds, firestoreGetFriendsFeed, firestoreGetUserProfile } from '../services/firestore';
import { getSpotById } from '../utils/spotHelpers';
import type { CheckIn } from '../types';

interface FeedItem extends CheckIn {
  authorUsername?: string;
  spotName: string;
}

const formatTimeAgo = (timestamp: string): string => {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const CROWD_EMOJI: Record<string, string> = {
  empty: '🏝️', uncrowded: '😊', moderate: '🤙', crowded: '😤', 'very-crowded': '🚫',
};

const FriendsFeedScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<RootStackScreenProps<'FriendsFeed'>['navigation']>();
  const { user } = useAuthStore();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoFriends, setHasNoFriends] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      if (Platform.OS === 'android') {
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
      }
    }, [navigation])
  );

  const loadFeed = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const friendIds = await firestoreGetFriendIds(user.id);
      if (friendIds.length === 0) {
        setHasNoFriends(true);
        setFeedItems([]);
        return;
      }
      setHasNoFriends(false);

      const checkIns = await firestoreGetFriendsFeed(friendIds);

      // Resolve each author's username once per unique userId, not once per
      // check-in — a friend with several recent check-ins shouldn't trigger
      // a repeat lookup for the same profile.
      const usernameCache = new Map<string, string | undefined>();
      const items: FeedItem[] = [];
      for (const checkIn of checkIns) {
        if (!usernameCache.has(checkIn.userId)) {
          const profile = await firestoreGetUserProfile(checkIn.userId);
          usernameCache.set(checkIn.userId, profile.username);
        }
        items.push({
          ...checkIn,
          authorUsername: usernameCache.get(checkIn.userId),
          spotName: getSpotById(checkIn.spotId)?.name ?? 'Unknown Spot',
        });
      }
      setFeedItems(items);
    } catch (err) {
      // Leave feed empty/stale rather than crash the screen, but never
      // hide the real error — a silently-swallowed index/permission error
      // here looks identical to "no friends posted anything," which is
      // actively misleading.
      console.error('[FriendsFeed] Failed to load feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <ScrollView style={styles.container}>
      <HeaderBar title="Friends Feed" onBackPress={handleBack} />

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : hasNoFriends ? (
        <View style={styles.centeredState}>
          <Ionicons name="people-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Add friends to see their check-ins and photos here.
          </Text>
          <TouchableOpacity style={styles.findFriendsButton} onPress={() => navigation.navigate('Friends')}>
            <Text style={styles.findFriendsButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : feedItems.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="water-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyTitle}>No recent activity</Text>
          <Text style={styles.emptySubtitle}>
            Nothing from your friends yet — check back after their next session.
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          {feedItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.feedCard}
              onPress={() => navigation.navigate('SpotDetails', { spotId: item.spotId })}
            >
              <View style={styles.feedCardHeader}>
                <Text style={styles.feedCardAuthor}>@{item.authorUsername || 'unknown'}</Text>
                <Text style={styles.feedCardTime}>{formatTimeAgo(item.timestamp)}</Text>
              </View>
              <Text style={styles.feedCardSpot}>{item.spotName}</Text>

              {item.conditions && (
                <View style={styles.feedCardConditions}>
                  <Text style={styles.feedCardConditionItem}>
                    {item.conditions.waveHeight.toFixed(1)} ft
                  </Text>
                  <Text style={styles.feedCardConditionItem}>
                    {CROWD_EMOJI[item.conditions.crowdLevel] ?? ''} {item.conditions.crowdLevel.replace('-', ' ')}
                  </Text>
                </View>
              )}

              {item.comment && (
                <Text style={styles.feedCardComment} numberOfLines={3}>
                  "{item.comment}"
                </Text>
              )}

              {item.imageUrls && item.imageUrls.length > 0 && (
                <Image source={{ uri: item.imageUrls[0] }} style={styles.feedCardPhoto} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 16,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  findFriendsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findFriendsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  feedCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  feedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedCardAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  feedCardTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  feedCardSpot: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedCardConditions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  feedCardConditionItem: {
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  feedCardComment: {
    fontSize: 14,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  feedCardPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});

export default FriendsFeedScreen;