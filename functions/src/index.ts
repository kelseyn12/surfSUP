/**
 * surfSUP Cloud Functions
 *
 * getSurfOutlook — AI-powered regional surf outlook.
 *   Cache key: subregion (e.g. "superior-north-mn") — NOT spot-specific.
 *   All spots in the same subregion share one cached AI response for 6 hours.
 *
 *   Subregions defined:
 *     superior-north-mn  — North Shore MN (NE/ENE winds, DLH office)
 *     superior-south-wi  — South Shore WI (NW/WNW winds, DLH office)
 *     superior-mi        — Michigan UP Lake Superior (W/WNW winds, MQT office)
 *     michigan-west      — West Michigan / Lake Michigan (S/SE winds, GRR office)
 *     ocean-east         — future: East Coast ocean spots
 *     ocean-west         — future: West Coast ocean spots
 *
 *   Adding a new body of water = add one entry to SUBREGION_CONFIG below.
 *   No other code needs to change.
 */

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// ─── Subregion Config ─────────────────────────────────────────────────────────

/**
 * Single source of truth for all supported surf regions.
 * To add Lake Michigan or ocean: add a new entry here. Done.
 */
interface SubregionConfig {
  label: string;           // Human-readable label for UI + prompt
  office: string;          // NWS office for AFD
  product: string;         // NWS product type
  forecastLat: number;     // Representative coordinates for wave model fetch
  forecastLon: number;
  favorableWinds: string;  // Used in prompt
  fetchGeometry: string;   // Fetch direction + duration info for prompt
  waterTemp: string;       // Typical water temp range for safety context
  periodRange: string;     // Typical swell period range
}

const SUBREGION_CONFIG: Record<string, SubregionConfig> = {
  "superior-north-mn": {
    label: "Lake Superior — North Shore (MN)",
    office: "DLH",
    product: "AFD",
    forecastLat: 46.84,
    forecastLon: -91.90,
    favorableWinds: "NE, ENE, N (onshore to this shore). NW/W are offshore — cleaner but no swell.",
    fetchGeometry: "NE winds over 250+ miles of open water. Swell from NE quadrant arrives at Duluth-area breaks in ~10-12 hours. Wave periods typically 4-8 seconds.",
    waterTemp: "32-40°F in spring, up to 55°F late summer. Full wetsuit, boots, gloves, hood required spring/fall/winter.",
    periodRange: "4-8 seconds",
  },
  "superior-south-wi": {
    label: "Lake Superior — South Shore (WI)",
    office: "DLH",
    product: "AFD",
    forecastLat: 46.72,
    forecastLon: -91.00,
    favorableWinds: "NW, WNW, W (onshore to south shore). NE winds are offshore here — opposite of North Shore.",
    fetchGeometry: "NW winds fetch across the width of Lake Superior (~150 miles). Swell arrives quickly — within 4-6 hours of sustained NW winds. Wave periods typically 3-6 seconds.",
    waterTemp: "32-42°F in spring, up to 60°F late summer.",
    periodRange: "3-6 seconds",
  },
  "superior-mi": {
    label: "Lake Superior — Michigan Waters (UP)",
    office: "MQT",
    product: "AFD",
    forecastLat: 46.54,
    forecastLon: -87.40,
    favorableWinds: "W, WNW, SW (onshore to south-facing MI shore). NE winds are offshore.",
    fetchGeometry: "W/WNW winds fetch across the full width of Lake Superior (250+ miles). Wave periods typically 5-9 seconds in strong W wind events.",
    waterTemp: "32-45°F spring, up to 60°F late summer.",
    periodRange: "5-9 seconds",
  },
  "michigan-west": {
    label: "Lake Michigan — West Shore",
    office: "GRR",
    product: "AFD",
    forecastLat: 43.00,
    forecastLon: -86.30,
    favorableWinds: "S, SE, SSW (generate swell up the lake). N/NW winds are offshore.",
    fetchGeometry: "S/SE winds fetch up to 300 miles of Lake Michigan. Wave periods typically 4-8 seconds.",
    waterTemp: "35-65°F depending on season.",
    periodRange: "4-8 seconds",
  },
  // Future ocean regions — add office + coordinates when ready
  "ocean-east": {
    label: "East Coast Ocean",
    office: "MHX",
    product: "AFD",
    forecastLat: 34.70,
    forecastLon: -76.70,
    favorableWinds: "NE swells from offshore storms. Offshore winds (W/NW) clean up conditions.",
    fetchGeometry: "North Atlantic groundswell — periods 8-18 seconds. Wind swell 5-8 seconds from NE storms.",
    waterTemp: "Varies widely by location and season.",
    periodRange: "8-18 seconds (groundswell), 5-8 seconds (wind swell)",
  },
  "ocean-west": {
    label: "West Coast Ocean",
    office: "MTR",
    product: "AFD",
    forecastLat: 37.50,
    forecastLon: -122.50,
    favorableWinds: "NW groundswell year-round. Offshore winds (E/NE) clean up conditions.",
    fetchGeometry: "North Pacific groundswell — periods 12-20 seconds. Summer NW wind swell 8-12 seconds.",
    waterTemp: "Varies by location. Cold upwelling common.",
    periodRange: "12-20 seconds (groundswell), 8-12 seconds (wind swell)",
  },
};

const DEFAULT_SUBREGION = "superior-north-mn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurfOutlookRequest {
  spotId: string;
  spotName: string;
  lat: number;
  lon: number;
  description?: string;
  state: string;
  region?: string;
  subregion?: string;
}

interface SurfOutlookResponse {
  outlook: string;
  office: string;
  regionLabel: string;
  model: string;
  cachedAt: string;
  fromCache: boolean;
}

// 6-hour cache per subregion — one Claude call per subregion per AFD issuance
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── Main Function ────────────────────────────────────────────────────────────

export const getSurfOutlook = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request): Promise<SurfOutlookResponse> => {
    const data = request.data as SurfOutlookRequest;

    if (!data?.lat || !data?.lon) {
      throw new HttpsError("invalid-argument", "lat and lon are required");
    }

    // Resolve subregion — fall back gracefully
    const subregionKey = data.subregion && SUBREGION_CONFIG[data.subregion]
      ? data.subregion
      : DEFAULT_SUBREGION;
    const config = SUBREGION_CONFIG[subregionKey];

    // Cache key: subregion + 6-hour window
    const cacheWindow = Math.floor(Date.now() / CACHE_TTL_MS);
    const cacheKey = `${subregionKey}_${cacheWindow}`;
    const cacheRef = db.collection("surfOutlookCache").doc(cacheKey);
    const cached = await cacheRef.get();

    if (cached.exists) {
      const d = cached.data()!;
      return {
        outlook:     d.outlook,
        office:      config.office,
        regionLabel: config.label,
        model:       d.model,
        cachedAt:    d.cachedAt,
        fromCache:   true,
      };
    }

    // Fetch AFD + wave model in parallel
    const [afdText, forecastSummary] = await Promise.all([
      fetchAFD(config.office, config.product),
      fetchForecastSummary(config.forecastLat, config.forecastLon),
    ]);

    const outlook = await generateOutlook(config, afdText, forecastSummary, ANTHROPIC_API_KEY.value());

    const now = new Date().toISOString();
    await cacheRef.set({ outlook, model: "claude-sonnet-4-6", cachedAt: now });

    return {
      outlook,
      office:      config.office,
      regionLabel: config.label,
      model:       "claude-sonnet-4-6",
      cachedAt:    now,
      fromCache:   false,
    };
  }
);

// ─── NWS AFD Fetch ────────────────────────────────────────────────────────────

const fetchAFD = async (office: string, product: string): Promise<string> => {
  try {
    const listRes = await fetch(`https://api.weather.gov/products/types/${product}/locations/${office}`);
    if (!listRes.ok) return "";
    const listJson = await listRes.json() as any;
    const latest = listJson?.["@graph"]?.[0];
    if (!latest?.["@id"]) return "";
    const productRes = await fetch(latest["@id"]);
    if (!productRes.ok) return "";
    const productJson = await productRes.json() as any;
    return productJson?.productText ?? "";
  } catch {
    return "";
  }
};

// ─── Open-Meteo Forecast Summary ──────────────────────────────────────────────

const fetchForecastSummary = async (lat: number, lon: number): Promise<string> => {
  try {
    const marineParams = new URLSearchParams({
      latitude: String(lat), longitude: String(lon),
      hourly: "wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period",
      length_unit: "imperial", wind_speed_unit: "mph", timezone: "auto", forecast_days: "3",
    });
    const weatherParams = new URLSearchParams({
      latitude: String(lat), longitude: String(lon),
      hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      wind_speed_unit: "mph", timezone: "auto", forecast_days: "3",
    });

    const [marineRes, weatherRes] = await Promise.allSettled([
      fetch(`https://marine-api.open-meteo.com/v1/marine?${marineParams}`),
      fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
    ]);

    const marine = marineRes.status === "fulfilled" && marineRes.value.ok ? await marineRes.value.json() as any : null;
    const weather = weatherRes.status === "fulfilled" && weatherRes.value.ok ? await weatherRes.value.json() as any : null;
    if (!marine && !weather) return "Forecast model data unavailable.";

    const lines = ["Time (local) | Wave Ht | Wave Period | Wave Dir | Wind | Gusts | Wind Dir"];
    const times: string[] = marine?.hourly?.time ?? weather?.hourly?.time ?? [];
    times.forEach((t: string, i: number) => {
      if (i % 6 !== 0 || i > 48) return;
      const waveH = marine?.hourly?.wave_height?.[i]?.toFixed(1) ?? "–";
      const waveP = marine?.hourly?.wave_period?.[i]?.toFixed(1) ?? "–";
      const waveD = degreesToCompass(marine?.hourly?.wave_direction?.[i] ?? null);
      const windS = weather?.hourly?.wind_speed_10m?.[i]?.toFixed(0) ?? "–";
      const gustS = weather?.hourly?.wind_gusts_10m?.[i]?.toFixed(0) ?? "–";
      const windD = degreesToCompass(weather?.hourly?.wind_direction_10m?.[i] ?? null);
      lines.push(`${t.replace("T", " ").slice(0, 16)} | ${waveH}ft | ${waveP}s | ${waveD} | ${windS}mph | ${gustS}mph | ${windD}`);
    });
    return lines.join("\n");
  } catch {
    return "Forecast model data unavailable.";
  }
};

const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const degreesToCompass = (deg: number | null): string => {
  if (deg == null || isNaN(deg)) return "–";
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
};

// ─── Claude Prompt ────────────────────────────────────────────────────────────

const generateOutlook = async (
  config: SubregionConfig,
  afdText: string,
  forecastSummary: string,
  apiKey: string
): Promise<string> => {
  const client = new Anthropic({ apiKey });
  const afdExcerpt = extractRelevantAFD(afdText);

  const prompt = `You are a Great Lakes surf forecaster — think Brandon Pham from KBJR-TV. You understand fetch geometry, wave period development, and how lake surf breaks work. Be specific, conversational, and useful to someone deciding whether to paddle out.

REGION: ${config.label}
FAVORABLE WINDS FOR THIS SHORE: ${config.favorableWinds}
FETCH + SWELL CONTEXT: ${config.fetchGeometry}
WATER TEMP / SAFETY: ${config.waterTemp}
TYPICAL PERIOD RANGE: ${config.periodRange}

NWS FORECASTER DISCUSSION (${config.office}):
${afdExcerpt || "Not available."}

48-HOUR WAVE + WIND MODEL FORECAST (GFS-Wave via Open-Meteo, at representative coordinates for this region):
${forecastSummary}

Write a regional surf outlook for ${config.label} in 3-5 sentences. Do NOT name any specific break. Cover:
1. Whether surf is worth it and the best window (specific hours/days if possible)
2. Expected wave size and period
3. Wind direction relative to this shore (onshore/offshore, favorable/unfavorable)
4. Any hazards (ice, water temp, dangerous wind shifts)

Be direct. Use real numbers from the forecast table. No filler phrases.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text.trim() : "Outlook unavailable.";
};

// ─── AFD Text Extraction ──────────────────────────────────────────────────────

const extractRelevantAFD = (text: string): string => {
  if (!text) return "";
  const patterns = [
    /\.LAKE SUPERIOR\.{2,3}([\s\S]{0,1500})(?=\n\.\w|\n&&|\$\$)/i,
    /lake superior([\s\S]{0,1200})(?=\n\.\w|\n&&|\$\$)/i,
    /\.SHORT TERM\.{2,3}([\s\S]{0,1000})(?=\n\.\w|\n&&|\$\$)/i,
    /\.SYNOPSIS\.{2,3}([\s\S]{0,800})(?=\n\.\w|\n&&|\$\$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().replace(/\s{2,}/g, " ").slice(0, 1500);
  }
  return text.slice(0, 800).replace(/\s{2,}/g, " ");
};
