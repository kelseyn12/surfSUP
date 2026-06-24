import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { HeaderBar } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../services/auth';
import { RootStackScreenProps } from '../navigation/types';
import {
  firestoreFindUserIdByUsername,
  firestoreSendFriendRequest,
  firestoreGetIncomingFriendRequests,
  firestoreAcceptFriendRequest,
  firestoreDeclineFriendRequest,
  firestoreGetFriendIds,
  firestoreRemoveFriend,
  firestoreGetUserProfile,
} from '../services/firestore';

interface IncomingRequest {
  id: string;
  fromUserId: string;
  fromUsername?: string;
}

interface FriendEntry {
  id: string;
  username?: string;
}

const FriendsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<RootStackScreenProps<'Friends'>['navigation']>();
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ userId: string; username: string } | 'not_found' | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

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

  const loadLists = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingLists(true);
    try {
      const [requests, friendIds] = await Promise.all([
        firestoreGetIncomingFriendRequests(user.id),
        firestoreGetFriendIds(user.id),
      ]);

      const requestsWithNames = await Promise.all(
        requests.map(async (r) => {
          const profile = await firestoreGetUserProfile(r.fromUserId);
          return { id: r.id, fromUserId: r.fromUserId, fromUsername: profile.username };
        })
      );
      const friendsWithNames = await Promise.all(
        friendIds.map(async (id) => {
          const profile = await firestoreGetUserProfile(id);
          return { id, username: profile.username };
        })
      );

      setIncomingRequests(requestsWithNames);
      setFriends(friendsWithNames);
    } catch (err) {
      // Leave lists as-is; the screen still works, just possibly stale —
      // but never hide the real error, since a permission/index problem
      // here looks identical to "you just have no friends yet."
      console.error('[Friends] Failed to load lists:', err);
    } finally {
      setIsLoadingLists(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const handleSearch = useCallback(async () => {
    const query = searchText.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchResult(null);
    try {
      const userId = await firestoreFindUserIdByUsername(query);
      setSearchResult(userId ? { userId, username: query } : 'not_found');
    } catch (err) {
      // IMPORTANT: a real error here (permissions, missing index, network)
      // must not be silently presented as "no such user" — that's
      // misleading and indistinguishable from a genuine miss.
      console.error('[Friends] Username lookup failed:', err);
      Alert.alert('Error', 'Something went wrong searching for that username. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  const handleSendRequest = useCallback(async (toUserId: string, toUsername: string) => {
    if (!user?.id) return;
    if (toUserId === user.id) {
      Alert.alert("That's you!", "You can't send a friend request to yourself.");
      return;
    }

    setIsSendingRequest(true);
    try {
      const requestId = await firestoreSendFriendRequest(user.id, toUserId);
      if (requestId) {
        Alert.alert('Request sent', `Friend request sent to @${toUsername}.`);
        setSearchResult(null);
        setSearchText('');
      } else {
        Alert.alert('Already pending', `You and @${toUsername} already have a pending or accepted request.`);
      }
    } catch (err) {
      console.error('[Friends] Failed to send request:', err);
      Alert.alert('Error', 'Could not send the friend request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }
  }, [user?.id]);

  const handleAccept = useCallback(async (requestId: string) => {
    try {
      await firestoreAcceptFriendRequest(requestId);
      await loadLists();
    } catch (err) {
      console.error('[Friends] Failed to accept request:', err);
      Alert.alert('Error', 'Could not accept the request. Please try again.');
    }
  }, [loadLists]);

  const handleDecline = useCallback(async (requestId: string) => {
    try {
      await firestoreDeclineFriendRequest(requestId);
      await loadLists();
    } catch (err) {
      console.error('[Friends] Failed to decline request:', err);
      Alert.alert('Error', 'Could not decline the request. Please try again.');
    }
  }, [loadLists]);

  const handleRemoveFriend = useCallback((friendId: string, friendUsername?: string) => {
    if (!user?.id) return;
    Alert.alert(
      'Remove friend',
      `Remove @${friendUsername || 'this person'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestoreRemoveFriend(user.id, friendId);
              await loadLists();
            } catch (err) {
              console.error('[Friends] Failed to remove friend:', err);
              Alert.alert('Error', 'Could not remove this friend. Please try again.');
            }
          },
        },
      ]
    );
  }, [user?.id, loadLists]);

  return (
    <ScrollView style={styles.container}>
      <HeaderBar title="Friends" onBackPress={handleBack} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a Friend</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by @username"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="search" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {searchResult === 'not_found' && (
          <Text style={styles.notFoundText}>No one found with that username.</Text>
        )}
        {searchResult && searchResult !== 'not_found' && (
          <View style={styles.resultRow}>
            <Text style={styles.resultUsername}>@{searchResult.username}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleSendRequest(searchResult.userId, searchResult.username)}
              disabled={isSendingRequest}
            >
              {isSendingRequest ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.addButtonText}>Add Friend</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Friend Requests {incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''}
        </Text>
        {isLoadingLists ? (
          <ActivityIndicator color={colors.primary} />
        ) : incomingRequests.length === 0 ? (
          <Text style={styles.emptyText}>No pending requests.</Text>
        ) : (
          incomingRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Text style={styles.requestUsername}>@{req.fromUsername || 'unknown'}</Text>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(req.id)}>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton} onPress={() => handleDecline(req.id)}>
                  <Ionicons name="close" size={18} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Friends {friends.length > 0 ? `(${friends.length})` : ''}
        </Text>
        {isLoadingLists ? (
          <ActivityIndicator color={colors.primary} />
        ) : friends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet — search for someone above to get started.</Text>
        ) : (
          friends.map((friend) => (
            <View key={friend.id} style={styles.friendRow}>
              <Text style={styles.friendUsername}>@{friend.username || 'unknown'}</Text>
              <TouchableOpacity onPress={() => handleRemoveFriend(friend.id, friend.username)}>
                <Ionicons name="person-remove-outline" size={20} color={colors.gray} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    marginTop: 12,
    color: colors.text.secondary,
    fontSize: 14,
  },
  resultRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
  },
  resultUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default FriendsScreen;