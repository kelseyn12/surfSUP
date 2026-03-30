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

  const docRef = await addDoc(collection(db, 'checkIns'), checkInData);

  await setDoc(
    doc(db, 'spotCounts', spotId),
    { count: increment(1), lastUpdated: serverTimestamp() },
    { merge: true }
  );

  return { id: docRef.id, ...checkInData } as CheckIn;
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
  if (!snap.exists) return [];
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
