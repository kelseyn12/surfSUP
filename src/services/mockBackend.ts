/**
 * Backend service — check-ins and surfer counts.
 *
 * All operations now persist to Firestore. The function signatures are unchanged
 * so no callers need to be updated.
 */

import { CheckIn } from '../types';
import {
  firestoreCheckInToSpot,
  firestoreCheckOutFromSpot,
  firestoreGetActiveCheckInForUser,
  firestoreGetActiveCheckInAnywhere,
  firestoreGetSurferCount,
} from './firestore';
import { updateGlobalSurferCount, updateUserCheckedInStatus } from './globalState';
import webSocketService, {
  WebSocketMessageType,
  SurferCountUpdateMessage,
  CheckInStatusMessage,
} from './websocket';
import { emitSurferCountUpdated, emitCheckInStatusChanged } from './events';

// ─── Initialization ──────────────────────────────────────────────────────────

/** Called on app startup. No-op now that data lives in Firestore. */
export const initializeMockBackend = () => {};

/** Kept for the dev reset button in HomeScreen (DEV only). */
export const resetAllCheckInsAndCounts = () => {
  if (__DEV__) console.warn('[DEV] resetAllCheckInsAndCounts — no-op in Firestore mode.');
};

// ─── Surfer Count ────────────────────────────────────────────────────────────

export const getSurferCount = async (spotId: string): Promise<number> => {
  try {
    const count = await firestoreGetSurferCount(spotId);
    updateGlobalSurferCount(spotId, count);
    return count;
  } catch (error) {
    console.error('Error getting surfer count:', error);
    return 0;
  }
};

// ─── Check-In ────────────────────────────────────────────────────────────────

export const checkInToSpot = async (
  userId: string,
  spotId: string,
  data?: Partial<CheckIn>
): Promise<CheckIn | null> => {
  try {
    const checkIn = await firestoreCheckInToSpot(userId, spotId, data);
    if (!checkIn) return null;

    const count = await firestoreGetSurferCount(spotId);
    updateGlobalSurferCount(spotId, count);
    updateUserCheckedInStatus(spotId, true);

    const now = new Date().toISOString();
    const surferCountMsg: SurferCountUpdateMessage = { spotId, count, lastUpdated: now };
    const checkInStatusMsg: CheckInStatusMessage = { userId, spotId, isCheckedIn: true, timestamp: now };

    webSocketService.send({ type: WebSocketMessageType.SURFER_COUNT_UPDATE, payload: surferCountMsg });
    webSocketService.send({ type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE, payload: checkInStatusMsg });
    emitCheckInStatusChanged(spotId, true);
    emitSurferCountUpdated(spotId, count);

    return checkIn;
  } catch (error) {
    console.error('Error checking in to spot:', error);
    return null;
  }
};

// ─── Check-Out ───────────────────────────────────────────────────────────────

export const checkOutFromSpot = async (checkInId: string): Promise<boolean> => {
  try {
    // Need the spotId + userId before the check-in is deactivated
    const { db } = await import('../config/firebase');
    const doc = await db.collection('checkIns').doc(checkInId).get();
    if (!doc.exists) return false;
    const { spotId, userId } = doc.data()!;

    const success = await firestoreCheckOutFromSpot(checkInId);
    if (!success) return false;

    const count = await firestoreGetSurferCount(spotId);
    updateGlobalSurferCount(spotId, count);
    updateUserCheckedInStatus(spotId, false);

    const now = new Date().toISOString();
    const surferCountMsg: SurferCountUpdateMessage = { spotId, count, lastUpdated: now };
    const checkInStatusMsg: CheckInStatusMessage = { userId, spotId, isCheckedIn: false, timestamp: now };

    webSocketService.send({ type: WebSocketMessageType.SURFER_COUNT_UPDATE, payload: surferCountMsg });
    webSocketService.send({ type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE, payload: checkInStatusMsg });
    emitCheckInStatusChanged(spotId, false);
    emitSurferCountUpdated(spotId, count);

    return true;
  } catch (error) {
    console.error('Error checking out from spot:', error);
    return false;
  }
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getActiveCheckInForUser = async (
  userId: string,
  spotId: string
): Promise<CheckIn | null> => {
  try {
    return await firestoreGetActiveCheckInForUser(userId, spotId);
  } catch (error) {
    console.error('Error getting active check-in:', error);
    return null;
  }
};

export const getActiveCheckInForUserAnywhere = async (userId: string): Promise<CheckIn | null> => {
  try {
    return await firestoreGetActiveCheckInAnywhere(userId);
  } catch (error) {
    console.error('Error getting active check-in anywhere:', error);
    return null;
  }
};
