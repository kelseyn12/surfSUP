/**
 * Lake Superior surf spot configuration with wind direction logic
 */

export interface SurfSpotConfig {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  type: string[];
  amenities?: string[];
  description?: string;
  imageUrls?: string[];
  region: string;
  // Wind direction logic
  idealWindDirections: string[];           // e.g., ["NE", "ENE", "E"]
  marginalWindDirections?: string[];       // optional fallback (e.g., ["N"])
  blockedWindDirections?: string[];        // optional strong offshores (e.g., ["SW", "W"])
}

export const surfSpotsConfig: SurfSpotConfig[] = [
  {
    id: "stoneypoint",
    name: "Stoney Point",
    location: {
      latitude: 46.9419,
      longitude: -91.8061,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break", "point-break"],
    amenities: ["parking"],
    description: "Popular spot for Lake Superior surfers with consistent waves during NE winds.",
    imageUrls: ["https://example.com/stonypoint.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "ENE", "E", "NNE"],
    marginalWindDirections: ["N"],
    blockedWindDirections: ["SW", "W", "NW"]
  },
  {
    id: "parkpoint",
    name: "Park Point",
    location: {
      latitude: 46.7825,
      longitude: -92.0856,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "beginner",
    type: ["beach-break"],
    amenities: ["parking", "restrooms"],
    description: "Long sandy beach with gentle waves, perfect for beginners during calm conditions.",
    imageUrls: ["https://example.com/parkpoint.jpg"],
    region: "superior",
    idealWindDirections: ["E", "SE", "S"],
    marginalWindDirections: ["ENE", "SSE"],
    blockedWindDirections: ["NW", "N"]
  },
  {
    id: "lesterriver",
    name: "Lester River",
    location: {
      latitude: 46.8331,
      longitude: -92.0217,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "advanced",
    type: ["river-mouth", "reef"],
    amenities: ["parking"],
    description: "River mouth break that works well during strong winds and storms.",
    imageUrls: ["https://example.com/lesterriver.jpg"],
    region: "superior",
    idealWindDirections: ["E", "SE", "S"],
    marginalWindDirections: ["SSE"],
    blockedWindDirections: ["NW", "W", "N"]
  },
  {
    id: "brightonbeach",
    name: "Brighton Beach",
    location: {
      latitude: 46.8200,
      longitude: -92.0000,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "beginner",
    type: ["beach-break"],
    amenities: ["parking"],
    description: "Gentle beach break perfect for beginners during NE winds.",
    imageUrls: ["https://example.com/brightonbeach.jpg"],
    region: "superior",
    idealWindDirections: ["E", "NE"],
    marginalWindDirections: ["NNE", "ENE"],
    blockedWindDirections: ["SW", "W"]
  },
  {
    id: "frenchriver",
    name: "French River",
    location: {
      latitude: 46.8900,
      longitude: -91.8800,
      city: "Two Harbors",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["river-mouth", "beach-break"],
    amenities: ["parking"],
    description: "River mouth break that works well during NE winds.",
    imageUrls: ["https://example.com/frenchriver.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "ENE"],
    marginalWindDirections: ["E"],
    blockedWindDirections: ["SW", "W", "NW"]
  },
  {
    id: "boulders",
    name: "Boulders",
    location: {
      latitude: 46.8500,
      longitude: -91.9500,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "advanced",
    type: ["reef", "point-break"],
    amenities: ["parking"],
    description: "Rocky point break that works best during strong NE winds.",
    imageUrls: ["https://example.com/boulders.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "ENE", "E"],
    marginalWindDirections: ["N"],
    blockedWindDirections: ["W", "SW"]
  },
  {
    id: "guardrails",
    name: "Guardrails",
    location: {
      latitude: 46.8700,
      longitude: -91.9200,
      city: "Duluth",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["reef", "point-break"],
    amenities: ["parking"],
    description: "Consistent reef break with good wave shape during ENE winds.",
    imageUrls: ["https://example.com/guardrails.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "ENE", "E"],
    marginalWindDirections: ["NNE"],
    blockedWindDirections: ["W", "SW", "NW"]
  },
  {
    id: "superiorentry",
    name: "Superior Entry",
    location: {
      latitude: 46.7156,
      longitude: -92.0595,
      city: "Superior",
      state: "WI",
      country: "USA"
    },
    difficulty: "expert",
    type: ["point-break"],
    amenities: ["parking"],
    description: "Powerful break near the canal entrance. For experienced surfers only.",
    imageUrls: ["https://example.com/superiorentry.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "E", "ENE"],
    marginalWindDirections: ["NNE"],
    blockedWindDirections: ["W", "SW", "NW"]
  },
  {
    id: "floodbay",
    name: "Flood Bay",
    location: {
      latitude: 47.0200,
      longitude: -91.7500,
      city: "Two Harbors",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break"],
    amenities: ["parking"],
    description: "Protected bay with consistent waves during ESE winds.",
    imageUrls: ["https://example.com/floodbay.jpg"],
    region: "superior",
    idealWindDirections: ["NE", "E"],
    marginalWindDirections: ["ENE"],
    blockedWindDirections: ["SW", "W"]
  },
  {
    id: "beaverbay",
    name: "Beaver Bay",
    location: {
      latitude: 47.0500,
      longitude: -91.7000,
      city: "Beaver Bay",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break", "point-break"],
    amenities: ["parking"],
    description: "Mixed break with both beach and point sections during SE winds.",
    imageUrls: ["https://example.com/beaverbay.jpg"],
    region: "superior",
    idealWindDirections: ["E", "NE", "ENE"],
    marginalWindDirections: ["NNE"],
    blockedWindDirections: ["SW", "W", "NW"]
  },
  {
    id: "grandmaraismn",
    name: "Grand Marais, MN",
    location: {
      latitude: 47.7500,
      longitude: -90.3300,
      city: "Grand Marais",
      state: "MN",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break", "point-break"],
    amenities: ["parking", "restrooms"],
    description: "Northern Minnesota surf spot that works during SE winds.",
    imageUrls: ["https://example.com/grandmaraismn.jpg"],
    region: "superior",
    idealWindDirections: ["E", "SE"],
    marginalWindDirections: ["S"],
    blockedWindDirections: ["W", "NW"]
  },
  {
    id: "marquette",
    name: "Marquette",
    location: {
      latitude: 46.5400,
      longitude: -87.4000,
      city: "Marquette",
      state: "MI",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break", "point-break"],
    amenities: ["parking"],
    description: "Michigan's premier surf spot that works during W/WNW winds.",
    imageUrls: ["https://example.com/marquette.jpg"],
    region: "superior",
    idealWindDirections: ["W", "WNW"],
    marginalWindDirections: ["NW"],
    blockedWindDirections: ["E", "NE", "SE"]
  },
  {
    id: "ashland",
    name: "Ashland",
    location: {
      latitude: 46.5900,
      longitude: -90.8800,
      city: "Ashland",
      state: "WI",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break"],
    amenities: ["parking"],
    description: "Wisconsin surf spot that works during WNW/NW winds.",
    imageUrls: ["https://example.com/ashland.jpg"],
    region: "superior",
    idealWindDirections: ["WNW", "NW"],
    marginalWindDirections: ["W"],
    blockedWindDirections: ["E", "NE", "SE"]
  },
  {
    id: "cornucopia",
    name: "Cornucopia",
    location: {
      latitude: 46.8500,
      longitude: -91.1000,
      city: "Cornucopia",
      state: "WI",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break"],
    amenities: ["parking"],
    description: "Wisconsin surf spot that works during NW/WNW winds.",
    imageUrls: ["https://example.com/cornucopia.jpg"],
    region: "superior",
    idealWindDirections: ["NW", "WNW"],
    marginalWindDirections: ["W"],
    blockedWindDirections: ["E", "NE", "SE"]
  },
  {
    id: "grandmaraismi",
    name: "Grand Marais, MI",
    location: {
      latitude: 46.6700,
      longitude: -85.9800,
      city: "Grand Marais",
      state: "MI",
      country: "USA"
    },
    difficulty: "intermediate",
    type: ["beach-break", "point-break"],
    amenities: ["parking"],
    description: "Michigan surf spot that works during W/WNW winds.",
    imageUrls: ["https://example.com/grandmaraismi.jpg"],
    region: "superior",
    idealWindDirections: ["W", "WNW"],
    marginalWindDirections: ["NW"],
    blockedWindDirections: ["E", "NE", "SE"]
  }
];

/**
 * Helper function to get spot configuration by ID
 */
export const getSpotConfig = (spotId: string): SurfSpotConfig | undefined => {
  return surfSpotsConfig.find(spot => spot.id === spotId);
};

/**
 * Helper function to check wind direction favorability
 */
export const checkWindDirection = (spotId: string, windDirection: string): {
  isIdeal: boolean;
  isMarginal: boolean;
  isBlocked: boolean;
  note?: string;
} => {
  const spotConfig = getSpotConfig(spotId);
  
  if (!spotConfig) {
    return {
      isIdeal: true, // Default to favorable for unknown spots
      isMarginal: false,
      isBlocked: false
    };
  }
  
  const { idealWindDirections, marginalWindDirections = [], blockedWindDirections = [] } = spotConfig;
  
  const isIdeal = idealWindDirections.includes(windDirection);
  const isMarginal = marginalWindDirections.includes(windDirection);
  const isBlocked = blockedWindDirections.includes(windDirection);
  
  let note: string | undefined;
  
  if (isBlocked) {
    note = `Unfavorable wind direction (${windDirection}) for ${spotConfig.name}.`;
  } else if (isMarginal) {
    note = `Not ideal wind direction (${windDirection}) — may produce waves with enough fetch.`;
  }
  
  return {
    isIdeal,
    isMarginal,
    isBlocked,
    note
  };
}; 