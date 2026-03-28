/**
 * Spot service — loads spots from Firestore with AsyncStorage cache fallback,
 * then seeds the in-memory registry in spotHelpers.ts.
 *
 * Load order:
 *   1. AsyncStorage cache (if < 24 hours old)
 *   2. Firestore  (updates cache on success)
 *   3. Bundled spots.json (always available, no async needed)
 *
 * Call initializeSpotService() once from App.tsx on startup.
 * All synchronous callers (getSpotById, getAllSpots) will benefit automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SurfSpot } from '../types';
import { initializeSpots, getAllSpots } from '../utils/spotHelpers';
import { firestoreGetSpots, firestoreUpsertSpot } from './firestore';

const CACHE_KEY = 'spots_cache_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface SpotsCache {
  spots: SurfSpot[];
  cachedAt: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initializes the in-memory spot registry.
 * Safe to call without await — the app works with bundled JSON while loading.
 */
export const initializeSpotService = async (): Promise<void> => {
  try {
    const spots = await loadSpots();
    initializeSpots(spots);
    if (__DEV__) console.log(`[SpotService] Loaded ${spots.length} spots`);
  } catch (error) {
    console.error('[SpotService] Failed to initialize, using bundled spots.json:', error);
  }
};

/**
 * One-time migration: writes all spots from spots.json to Firestore.
 * Run this once from a dev screen or admin panel.
 */
export const seedSpotsToFirestore = async (): Promise<void> => {
  const spots = getAllSpots();
  if (__DEV__) console.log(`[SpotService] Seeding ${spots.length} spots to Firestore...`);

  const writes = spots.map((spot) => firestoreUpsertSpot(spot));
  await Promise.all(writes);

  if (__DEV__) console.log('[SpotService] Seeding complete');
};

// ─── Internal ─────────────────────────────────────────────────────────────────

const loadSpots = async (): Promise<SurfSpot[]> => {
  // 1. Check AsyncStorage cache
  const cached = await readCache();
  if (cached) return cached;

  // 2. Try Firestore
  try {
    const spots = await firestoreGetSpots();
    if (spots.length > 0) {
      await writeCache(spots);
      return spots;
    }
  } catch (error) {
    console.error('[SpotService] Firestore fetch failed, falling back to JSON:', error);
  }

  // 3. Bundled JSON (already loaded into spotHelpers at module init)
  return [];
};

const readCache = async (): Promise<SurfSpot[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: SpotsCache = JSON.parse(raw);
    if (Date.now() - cache.cachedAt > CACHE_TTL) return null; // stale
    return cache.spots;
  } catch {
    return null;
  }
};

const writeCache = async (spots: SurfSpot[]): Promise<void> => {
  try {
    const cache: SpotsCache = { spots, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('[SpotService] Failed to write cache:', error);
  }
};
