/**
 * Firestore backend service
 *
 * All cross-device persistent data lives here:
 *   - Check-ins  →  collection: checkIns/{checkInId}
 *   - Surfer counts  →  collection: spotCounts/{spotId}
 *   - Sessions  →  collection: sessions/{sessionId}
 *   - Favorites  →  collection: users/{userId}  (field: favoriteSpotIds)
 *   - Spots      →  collection: spots/{spotId}
 */

import firestore from '@react-native-firebase/firestore';
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
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const checkInData: Record<string, any> = {
    userId,
    spotId,
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
  };
  if (data?.conditions) checkInData.conditions = data.conditions;
  if (data?.comment) checkInData.comment = data.comment;

  const docRef = await db.collection('checkIns').add(checkInData);

  // Atomically increment the spot's surfer count
  await db
    .collection('spotCounts')
    .doc(spotId)
    .set(
      {
        count: firestore.FieldValue.increment(1),
        lastUpdated: firestore.Timestamp.now(),
      },
      { merge: true }
    );

  return { id: docRef.id, ...checkInData } as CheckIn;
};

export const firestoreCheckOutFromSpot = async (checkInId: string): Promise<boolean> => {
  const doc = await db.collection('checkIns').doc(checkInId).get();
  const docData = doc.data();
  if (!docData) return false;

  const { spotId } = docData;
  await db.collection('checkIns').doc(checkInId).update({ isActive: false });

  // Decrement count, floor at 0 — use a transaction to avoid going negative
  const countRef = db.collection('spotCounts').doc(spotId);
  await db.runTransaction(async (tx) => {
    const countDoc = await tx.get(countRef);
    const current = countDoc.data()?.count ?? 0;
    tx.set(
      countRef,
      { count: Math.max(0, current - 1), lastUpdated: firestore.Timestamp.now() },
      { merge: true }
    );
  });

  return true;
};

/**
 * Returns the user's active check-in at a specific spot, or null.
 * NOTE: requires a Firestore composite index on checkIns(userId ASC, spotId ASC, isActive ASC).
 * Firestore will log a URL to create it automatically on first use.
 */
export const firestoreGetActiveCheckInForUser = async (
  userId: string,
  spotId: string
): Promise<CheckIn | null> => {
  const snapshot = await db
    .collection('checkIns')
    .where('userId', '==', userId)
    .where('spotId', '==', spotId)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as CheckIn;
};

/**
 * Returns the user's active check-in at ANY spot, or null.
 * Queries by userId only and filters isActive in JS so no composite index is required.
 * Falls back gracefully if Firestore throws for any reason.
 */
export const firestoreGetActiveCheckInAnywhere = async (userId: string): Promise<CheckIn | null> => {
  const snapshot = await db
    .collection('checkIns')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  if (snapshot.empty) return null;

  // Filter in JS — avoids requiring a composite index on (userId, isActive)
  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.isActive === true) {
      return { id: d.id, ...data } as CheckIn;
    }
  }
  return null;
};

/**
 * Returns the most recent check-ins for a spot (both active and expired),
 * sorted newest-first. Queries by spotId only to avoid composite index requirements.
 */
export const firestoreGetRecentCheckIns = async (
  spotId: string,
  limit = 10
): Promise<CheckIn[]> => {
  const snapshot = await db
    .collection('checkIns')
    .where('spotId', '==', spotId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn));
};

export const firestoreGetSurferCount = async (spotId: string): Promise<number> => {
  const doc = await db.collection('spotCounts').doc(spotId).get();
  return doc.data()?.count ?? 0;
};

/**
 * Real-time listener for a spot's surfer count.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export const firestoreSubscribeSurferCount = (
  spotId: string,
  callback: (count: number) => void
): (() => void) => {
  return db
    .collection('spotCounts')
    .doc(spotId)
    .onSnapshot((doc) => {
      callback(doc.data()?.count ?? 0);
    });
};

// ─── SESSIONS ────────────────────────────────────────────────────────────────

export const firestoreSaveSession = async (
  session: Omit<SurfSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SurfSession> => {
  const now = new Date().toISOString();
  const data = { ...session, createdAt: now, updatedAt: now };
  const docRef = await db.collection('sessions').add(data);
  return { id: docRef.id, ...data };
};

export const firestoreGetUserSessions = async (userId: string): Promise<SurfSession[]> => {
  // No .orderBy() here — Firestore requires a composite index for where+orderBy on different
  // fields. Since a user's session count is small, we sort client-side to avoid the index.
  const snapshot = await db
    .collection('sessions')
    .where('userId', '==', userId)
    .get();
  const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SurfSession));
  return sessions.sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
};

export const firestoreUpdateSession = async (
  sessionId: string,
  updates: Partial<SurfSession>
): Promise<void> => {
  await db
    .collection('sessions')
    .doc(sessionId)
    .update({ ...updates, updatedAt: new Date().toISOString() });
};

export const firestoreDeleteSession = async (sessionId: string): Promise<void> => {
  await db.collection('sessions').doc(sessionId).delete();
};

// ─── FAVORITES ───────────────────────────────────────────────────────────────

export const firestoreAddFavoriteSpot = async (userId: string, spot: SurfSpot): Promise<void> => {
  await db
    .collection('users')
    .doc(userId)
    .set(
      { favoriteSpotIds: firestore.FieldValue.arrayUnion(spot.id) },
      { merge: true }
    );
};

export const firestoreRemoveFavoriteSpot = async (userId: string, spotId: string): Promise<void> => {
  await db
    .collection('users')
    .doc(userId)
    .set(
      { favoriteSpotIds: firestore.FieldValue.arrayRemove(spotId) },
      { merge: true }
    );
};

/**
 * Returns full SurfSpot objects for the user's saved favorites.
 * Spot data is resolved from the local spots registry (spots.json) since
 * spot definitions are bundled with the app — only IDs are stored in Firestore.
 */
export const firestoreGetFavoriteSpots = async (userId: string): Promise<SurfSpot[]> => {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return [];

  const ids: string[] = doc.data()?.favoriteSpotIds ?? [];
  return ids.map((id) => getSpotById(id)).filter((s): s is SurfSpot => s !== undefined);
};

// ─── SPOTS ────────────────────────────────────────────────────────────────────

/**
 * Fetch all spots from Firestore.
 * Returns an empty array if the collection doesn't exist yet.
 */
export const firestoreGetSpots = async (): Promise<SurfSpot[]> => {
  const snapshot = await db.collection('spots').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map((d) => ({ ...d.data() } as SurfSpot));
};

/**
 * Write a spot document to Firestore (create or overwrite).
 * Uses the spot's id as the document ID.
 */
export const firestoreUpsertSpot = async (spot: SurfSpot): Promise<void> => {
  await db.collection('spots').doc(spot.id).set(spot);
};

// ─── SPOT PHOTOS ─────────────────────────────────────────────────────────────

export interface SpotPhoto {
  url: string;
  uploadedBy: string; // userId
  createdAt: string;
}

/**
 * Returns community-uploaded photos for a spot, newest first.
 */
export const firestoreGetSpotPhotos = async (spotId: string): Promise<SpotPhoto[]> => {
  const snapshot = await db
    .collection('spotPhotos')
    .doc(spotId)
    .collection('photos')
    .orderBy('createdAt', 'desc')
    .get();
  if (snapshot.empty) return [];
  return snapshot.docs.map((d) => d.data() as SpotPhoto);
};

/**
 * Saves a photo URL (after upload to Firebase Storage) to the spot's photo list.
 */
export const firestoreAddSpotPhoto = async (
  spotId: string,
  photo: Omit<SpotPhoto, 'createdAt'>
): Promise<void> => {
  await db
    .collection('spotPhotos')
    .doc(spotId)
    .collection('photos')
    .add({ ...photo, createdAt: new Date().toISOString() });
};

// ─── FORECAST FEEDBACK ───────────────────────────────────────────────────────

export type ForecastAccuracy = 'off' | 'close' | 'spot-on';

export interface ForecastFeedback {
  id: string;
  sessionId: string;
  spotId: string;
  userId: string;
  sessionDate: string; // ISO startTime of the session
  accuracy: ForecastAccuracy;
  createdAt: string;
}

export const firestoreSaveForecastFeedback = async (
  data: Omit<ForecastFeedback, 'id' | 'createdAt'>
): Promise<void> => {
  const now = new Date().toISOString();
  await db.collection('forecastFeedback').add({ ...data, createdAt: now });
};
