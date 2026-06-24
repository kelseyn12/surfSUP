/**
 * Firestore backend service
 *
 * All cross-device persistent data lives here:
 *   - Check-ins  →  collection: checkIns/{checkInId}
 *   - Surfer counts  →  collection: spotCounts/{spotId}
 *   - Sessions  →  collection: sessions/{sessionId}
 *   - Favorites  →  collection: users/{userId}  (field: favoriteSpotIds)
 *   - Spots      →  collection: spots/{spotId}
 *   - Spot photos →  collection: spotPhotos/{spotId}/photos
 */

import firestore, {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  runTransaction,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { CheckIn, SurfSession, SurfSpot } from '../types';
import { getSpotById } from '../utils/spotHelpers';

// ─── CHECK-INS ──────────────────────────────────────────────────────────────

export const firestoreCheckInToSpot = async (
  userId: string,
  spotId: string,
  data?: Partial<CheckIn>
): Promise<CheckIn | null> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  const checkInData: Record<string, any> = {
    userId,
    spotId,
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
  };
  if (data?.conditions) checkInData.conditions = data.conditions;
  if (data?.comment) checkInData.comment = data.comment;
  if (data?.imageUrls?.length) checkInData.imageUrls = data.imageUrls;

  const docRef = await addDoc(collection(db, 'checkIns'), checkInData);

  await setDoc(
    doc(db, 'spotCounts', spotId),
    { count: increment(1), lastUpdated: serverTimestamp() },
    { merge: true }
  );

  return { id: docRef.id, ...checkInData } as CheckIn;
};

/**
 * Attaches a photo URL to an existing check-in. Called after
 * checkInToSpot has already created the document and returned its real
 * ID — uploads need that ID for the storage path, so this is necessarily
 * a separate step rather than part of the initial create.
 */
export const firestoreAddCheckInPhoto = async (checkInId: string, photoUrl: string): Promise<void> => {
  await updateDoc(doc(db, 'checkIns', checkInId), { imageUrls: arrayUnion(photoUrl) });
};

export const firestoreCheckOutFromSpot = async (checkInId: string): Promise<boolean> => {
  const checkInRef = doc(db, 'checkIns', checkInId);
  const snap = await getDoc(checkInRef);
  const snapData = snap.data();
  if (!snapData) return false;

  const { spotId } = snapData;
  await updateDoc(checkInRef, { isActive: false });

  const countRef = doc(db, 'spotCounts', spotId);
  await runTransaction(db, async (tx) => {
    const countDoc = await tx.get(countRef);
    const current = countDoc.data()?.count ?? 0;
    tx.set(
      countRef,
      { count: Math.max(0, current - 1), lastUpdated: serverTimestamp() },
      { merge: true }
    );
  });

  return true;
};

/**
 * Returns the user's active check-in at a specific spot, or null.
 * NOTE: requires a Firestore composite index on checkIns(userId ASC, spotId ASC, isActive ASC).
 */
export const firestoreGetActiveCheckInForUser = async (
  userId: string,
  spotId: string
): Promise<CheckIn | null> => {
  const q = query(
    collection(db, 'checkIns'),
    where('userId', '==', userId),
    where('spotId', '==', spotId),
    where('isActive', '==', true),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as CheckIn;
};

/**
 * Returns the user's active check-in at ANY spot, or null.
 * Filters isActive in JS to avoid requiring a composite index.
 */
export const firestoreGetActiveCheckInAnywhere = async (userId: string): Promise<CheckIn | null> => {
  const q = query(
    collection(db, 'checkIns'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.isActive === true) {
      return { id: d.id, ...data } as CheckIn;
    }
  }
  return null;
};

/**
 * Returns the most recent check-ins for a spot, sorted newest-first.
 */
export const firestoreGetRecentCheckIns = async (
  spotId: string,
  limitCount = 10
): Promise<CheckIn[]> => {
  const q = query(
    collection(db, 'checkIns'),
    where('spotId', '==', spotId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn));
};

export const firestoreGetSurferCount = async (spotId: string): Promise<number> => {
  const snap = await getDoc(doc(db, 'spotCounts', spotId));
  return snap.data()?.count ?? 0;
};

/**
 * Real-time listener for a spot's surfer count.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export const firestoreSubscribeSurferCount = (
  spotId: string,
  callback: (count: number) => void
): (() => void) => {
  return onSnapshot(doc(db, 'spotCounts', spotId), (snap) => {
    callback(snap.data()?.count ?? 0);
  });
};

// ─── SESSIONS ────────────────────────────────────────────────────────────────

export const firestoreSaveSession = async (
  session: Omit<SurfSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SurfSession> => {
  const now = new Date().toISOString();
  const data = { ...session, createdAt: now, updatedAt: now };
  const docRef = await addDoc(collection(db, 'sessions'), data);
  return { id: docRef.id, ...data };
};

export const firestoreGetUserSessions = async (userId: string): Promise<SurfSession[]> => {
  const q = query(collection(db, 'sessions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SurfSession));
  return sessions.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
};

export const firestoreUpdateSession = async (
  sessionId: string,
  updates: Partial<SurfSession>
): Promise<void> => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const firestoreDeleteSession = async (sessionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'sessions', sessionId));
};

// ─── FAVORITES ───────────────────────────────────────────────────────────────

export const firestoreAddFavoriteSpot = async (userId: string, spot: SurfSpot): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId),
    { favoriteSpotIds: arrayUnion(spot.id) },
    { merge: true }
  );
};

export const firestoreRemoveFavoriteSpot = async (userId: string, spotId: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', userId),
    { favoriteSpotIds: arrayRemove(spotId) },
    { merge: true }
  );
};

export const firestoreGetFavoriteSpots = async (userId: string): Promise<SurfSpot[]> => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return [];
  const ids: string[] = snap.data()?.favoriteSpotIds ?? [];
  return ids.map((id) => getSpotById(id)).filter((s): s is SurfSpot => s !== undefined);
};

// ─── SPOTS ───────────────────────────────────────────────────────────────────

export const firestoreGetSpots = async (): Promise<SurfSpot[]> => {
  const snapshot = await getDocs(collection(db, 'spots'));
  if (snapshot.empty) return [];
  return snapshot.docs.map((d) => ({ ...d.data() } as SurfSpot));
};

export const firestoreUpsertSpot = async (spot: SurfSpot): Promise<void> => {
  await setDoc(doc(db, 'spots', spot.id), spot);
};

// ─── FRIENDS ─────────────────────────────────────────────────────────────────
//
// Data model:
//   usernames/{usernameLowercase}      → { userId }   (uniqueness + lookup index)
//   friendRequests/{requestId}         → { fromUserId, toUserId, status, createdAt }
//   users/{userId}.friendIds: string[] → mutual friends, written to BOTH users'
//                                        docs only after a request is accepted
//
// Friend requests need their own collection (not just a field on the request-
// recipient's user doc) because Firestore rules only let a user write their
// OWN /users/{userId} document — person A can't write into person B's doc to
// send a request. A separate collection lets A create a doc that B can read
// and update, without either needing write access to the other's profile.
//
// IMPORTANT: firestoreAcceptFriendRequest below writes into BOTH users' docs,
// including a doc that may belong to someone other than the caller. Firestore
// treats a write to a non-existent doc as a CREATE, and the security rules
// only grant that cross-user exception for UPDATEs — so the target user's
// /users/{userId} doc must already exist before they can be friended. That's
// why firestoreEnsureUserDoc exists and is called on every sign-in (see
// auth.ts) — it guarantees the doc exists as early as possible, using a
// same-user write that's always safe under the normal owner rule.

/**
 * Creates a users/{userId} doc with safe defaults if it doesn't already
 * exist. Idempotent and non-destructive — never overwrites existing fields.
 * Call this on every successful sign-in.
 */
export const firestoreEnsureUserDoc = async (userId: string): Promise<void> => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, { friendIds: [] });
};

/**
 * Reads the durable profile fields stored on a user's Firestore doc.
 * Currently just `username` — this is the source of truth for username,
 * NOT Firebase Auth's displayName. (displayName is derived FROM username
 * when set, for backward display purposes only; see auth.ts.)
 */
export const firestoreGetUserProfile = async (
  userId: string
): Promise<{ username?: string }> => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return {};
  return { username: snap.data()?.username };
};

/**
 * Checks whether a username is available, case-insensitively.
 */
export const firestoreIsUsernameAvailable = async (username: string): Promise<boolean> => {
  const key = username.trim().toLowerCase();
  if (!key) return false;
  const snap = await getDoc(doc(db, 'usernames', key));
  if (__DEV__) {
    console.log(`[Username check] key="${key}" exists=${snap.exists()} data=`, snap.exists() ? snap.data() : null);
  }
  return !snap.exists();
};

/**
 * Claims a username for a user, releasing any previous username they held.
 * Throws if the username is already taken by someone else.
 */
export const firestoreSetUsername = async (
  userId: string,
  newUsername: string,
  previousUsername?: string
): Promise<void> => {
  const newKey = newUsername.trim().toLowerCase();
  if (!newKey) throw new Error('Username cannot be empty');

  await runTransaction(db, async (tx) => {
    const newRef = doc(db, 'usernames', newKey);
    const existing = await tx.get(newRef);
    if (existing.exists() && existing.data()?.userId !== userId) {
      throw new Error('Username is already taken');
    }
    tx.set(newRef, { userId });
    tx.set(doc(db, 'users', userId), { username: newUsername.trim() }, { merge: true });

    const prevKey = previousUsername?.trim().toLowerCase();
    if (prevKey && prevKey !== newKey) {
      tx.delete(doc(db, 'usernames', prevKey));
    }
  });
};

/**
 * Looks up a userId by exact username (case-insensitive). Returns null if
 * no user has claimed that username.
 */
export const firestoreFindUserIdByUsername = async (username: string): Promise<string | null> => {
  const key = username.trim().toLowerCase();
  if (!key) return null;
  const snap = await getDoc(doc(db, 'usernames', key));
  return snap.exists() ? (snap.data()?.userId ?? null) : null;
};

/**
 * Sends a friend request. Returns the new request's ID, or null if a
 * pending or accepted request already exists between these two users.
 */
export const firestoreSendFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<string | null> => {
  if (fromUserId === toUserId) return null;

  const existing = await firestoreGetFriendRequestBetween(fromUserId, toUserId);
  if (existing && existing.status !== 'declined') return null;

  const docRef = await addDoc(collection(db, 'friendRequests'), {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Finds any existing friend request (in either direction) between two users.
 */
export const firestoreGetFriendRequestBetween = async (
  userA: string,
  userB: string
): Promise<{ id: string; fromUserId: string; toUserId: string; status: string } | null> => {
  const q1 = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', userA),
    where('toUserId', '==', userB)
  );
  const q2 = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', userB),
    where('toUserId', '==', userA)
  );
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const d = snap1.docs[0] ?? snap2.docs[0];
  if (!d) return null;
  return { id: d.id, ...d.data() } as any;
};

/**
 * Lists incoming pending friend requests for a user (people who want to add them).
 */
export const firestoreGetIncomingFriendRequests = async (
  userId: string
): Promise<{ id: string; fromUserId: string; createdAt: any }[]> => {
  const q = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as any));
};

/**
 * Accepts a friend request: marks it accepted and adds each user to the
 * other's friendIds array. Both writes happen in a batch so they can't
 * partially succeed.
 */
export const firestoreAcceptFriendRequest = async (requestId: string): Promise<void> => {
  const reqRef = doc(db, 'friendRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;
  const { fromUserId, toUserId } = reqSnap.data() as { fromUserId: string; toUserId: string };

  const batch = writeBatch(db);
  batch.update(reqRef, { status: 'accepted' });
  batch.set(doc(db, 'users', fromUserId), { friendIds: arrayUnion(toUserId) }, { merge: true });
  batch.set(doc(db, 'users', toUserId), { friendIds: arrayUnion(fromUserId) }, { merge: true });
  await batch.commit();
};

/**
 * Declines a friend request. Left in the collection (status updated, not
 * deleted) so the requester isn't silently blocked from ever trying again
 * — firestoreSendFriendRequest only re-checks status, not history.
 */
export const firestoreDeclineFriendRequest = async (requestId: string): Promise<void> => {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
};

/**
 * Removes a mutual friendship from both users' friendIds arrays.
 */
export const firestoreRemoveFriend = async (userId: string, friendId: string): Promise<void> => {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', userId), { friendIds: arrayRemove(friendId) }, { merge: true });
  batch.set(doc(db, 'users', friendId), { friendIds: arrayRemove(userId) }, { merge: true });
  await batch.commit();
};

/**
 * Returns the list of friend userIds for a user.
 */
export const firestoreGetFriendIds = async (userId: string): Promise<string[]> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data()?.friendIds ?? []) : [];
};

/**
 * Recent check-ins from a user's friends, across all spots, for a feed view.
 * Firestore's `in` operator supports up to 30 values — fine at this app's
 * scale; if the friends list ever needs to exceed that, this will need to
 * be split into batched queries.
 */
export const firestoreGetFriendsFeed = async (
  friendIds: string[],
  limitCount = 30
): Promise<CheckIn[]> => {
  if (friendIds.length === 0) return [];
  const q = query(
    collection(db, 'checkIns'),
    where('userId', 'in', friendIds.slice(0, 30)),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn));
};

// ─── STALE CHECK-IN CLEANUP ──────────────────────────────────────────────────

/**
 * Finds all active check-ins whose expiresAt is in the past and checks them
 * out, decrementing the spot count for each. Safe to call on app startup.
 */
export const firestoreCleanupStaleCheckIns = async (): Promise<void> => {
  const now = new Date().toISOString();
  try {
    const q = query(
      collection(db, 'checkIns'),
      where('isActive', '==', true),
      where('expiresAt', '<', now)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    const spotDecrements: Record<string, number> = {};

    snapshot.docs.forEach((d) => {
      const data = d.data();
      batch.update(d.ref, { isActive: false, checkOutTime: now });
      if (data.spotId) {
        spotDecrements[data.spotId] = (spotDecrements[data.spotId] ?? 0) + 1;
      }
    });

    Object.entries(spotDecrements).forEach(([spotId, count]) => {
      batch.update(doc(db, 'spotCounts', spotId), {
        count: increment(-count),
        lastUpdated: serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`[Firestore] Cleaned up ${snapshot.size} stale check-in(s)`);
  } catch (err) {
    console.warn('[Firestore] Stale check-in cleanup failed:', err);
  }
};

// ─── SPOT PHOTOS ─────────────────────────────────────────────────────────────

export interface SpotPhoto {
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export const firestoreGetSpotPhotos = async (spotId: string): Promise<SpotPhoto[]> => {
  const q = query(
    collection(db, 'spotPhotos', spotId, 'photos'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return [];
  return snapshot.docs.map((d) => d.data() as SpotPhoto);
};

export const firestoreAddSpotPhoto = async (
  spotId: string,
  photo: Omit<SpotPhoto, 'createdAt'>
): Promise<void> => {
  await addDoc(collection(db, 'spotPhotos', spotId, 'photos'), {
    ...photo,
    createdAt: new Date().toISOString(),
  });
};

// ─── FORECAST FEEDBACK ───────────────────────────────────────────────────────

export type ForecastAccuracy = 'off' | 'close' | 'spot-on';

export interface ForecastFeedback {
  id: string;
  sessionId: string;
  spotId: string;
  userId: string;
  sessionDate: string;
  accuracy: ForecastAccuracy;
  createdAt: string;
}

export const firestoreSaveForecastFeedback = async (
  data: Omit<ForecastFeedback, 'id' | 'createdAt'>
): Promise<void> => {
  await addDoc(collection(db, 'forecastFeedback'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
};