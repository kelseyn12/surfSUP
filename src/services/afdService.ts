/**
 * Surf Outlook service — calls the getSurfOutlook Cloud Function.
 *
 * The function handles:
 *   - NWS AFD fetching (region-aware: DLH for MN/WI, MQT for MI)
 *   - Open-Meteo 48h wave+wind model data
 *   - Claude AI surf interpretation
 *   - 6-hour Firestore cache (one entry per NWS office)
 *
 * Adding a new body of water only requires passing the correct `region` field.
 * The Cloud Function's resolveNWSOffice() handles the rest.
 */

import functions from '@react-native-firebase/functions';
import { SurfSpot } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecasterNotes {
  summary: string;
  office: string;
  regionLabel: string;
  model: string;
  issuedAt: string;
  fromCache: boolean;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export const fetchForecasterNotes = async (
  lat: number,
  lon: number,
  spot?: Partial<SurfSpot>
): Promise<ForecasterNotes | null> => {
  try {
    const callable = functions().httpsCallable('getSurfOutlook');
    const result = await callable({
      spotId:      spot?.id      ?? 'unknown',
      spotName:    spot?.name    ?? 'Lake Superior Surf Spot',
      lat,
      lon,
      description: spot?.description,
      state:       spot?.location?.state  ?? 'MN',
      region:      spot?.region           ?? 'superior',
      subregion:   spot?.subregion        ?? 'superior-north-mn',
    });

    const data = result.data as {
      outlook: string;
      office: string;
      regionLabel: string;
      model: string;
      cachedAt: string;
      fromCache: boolean;
    };

    return {
      summary:     data.outlook,
      office:      data.office,
      regionLabel: data.regionLabel,
      model:       data.model,
      issuedAt:    data.cachedAt,
      fromCache:   data.fromCache,
    };
  } catch (err) {
    if (__DEV__) console.warn('[SurfOutlook] Cloud Function failed:', err);
    return null;
  }
};
