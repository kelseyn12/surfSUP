# Glossary of Methods

This document details what methods are defined, where they are defined, and where they are used in the SurfSUP application.

## Table of Contents

- [Utility Functions](#utility-functions)
  - [Formatters](#formatters)
  - [Condition Calculators](#condition-calculators)
  - [Location Utilities](#location-utilities)
  - [Storage Utilities](#storage-utilities)
  - [General Utilities](#general-utilities)
- [API Services](#api-services)
- [Hooks](#hooks)
- [Components](#components)

## Utility Functions

### Formatters

Located in `src/utils/formatters.ts`

| Method | Description | Parameters | Return Value | Used In |
|--------|-------------|------------|--------------|---------|
| `formatWaveHeight` | Format wave height with appropriate units | `height: number, unit: 'ft' \| 'm', showUnit: boolean` | `string` | To be used in wave display components |
| `formatWaveHeightRange` | Format wave height range | `min: number, max: number, unit: 'ft' \| 'm'` | `string` | To be used in forecast displays |
| `formatWindSpeed` | Format wind speed with appropriate units | `speed: number, unit: 'mph' \| 'kts' \| 'kph'` | `string` | To be used in wind display components |
| `formatWindDirection` | Format wind direction in degrees to cardinal direction | `degrees: number` | `string` | To be used in wind display components |
| `formatWind` | Format combined wind information | `speed: number, degrees: number, unit: 'mph' \| 'kts' \| 'kph'` | `string` | To be used in wind display components |
| `formatTideHeight` | Format tide height with appropriate units | `height: number, unit: 'ft' \| 'm'` | `string` | To be used in tide display components |
| `formatTemperature` | Format temperature with appropriate units | `temp: number, unit: 'F' \| 'C'` | `string` | To be used in weather displays |
| `formatRelativeTime` | Format date as relative time | `date: string \| Date` | `string` | To be used in check-in and session displays |
| `formatDate` | Format a date for display | `date: string \| Date, format: 'short' \| 'medium' \| 'long' \| 'time'` | `string` | To be used in various date displays |
| `formatDuration` | Format duration in minutes to a human-readable string | `minutes: number` | `string` | To be used in session duration displays |

### Condition Calculators

Located in `src/utils/conditionCalculators.ts`

| Method | Description | Parameters | Return Value | Used In |
|--------|-------------|------------|--------------|---------|
| `calculateConditionRating` | Calculate the overall rating for surf conditions | `conditions: SurfConditions` | `number` | To be used in condition rating calculations |
| `calculateWaveScore` | Calculate the score for wave height | `minHeight: number, maxHeight: number` | `number` | Used by `calculateConditionRating` |
| `calculateWindScore` | Calculate the score for wind conditions | `speed: number, direction: string` | `number` | Used by `calculateConditionRating` |
| `calculateSwellScore` | Calculate score for swell conditions | `swells: Array<{ height: number; period: number; direction: string }>` | `number` | Used by `calculateConditionRating` |
| `calculatePeriodScore` | Calculate score for swell period | `period: number` | `number` | Used by `calculateSwellScore` |
| `calculateSwellHeightScore` | Calculate score for swell height | `height: number` | `number` | Used by `calculateSwellScore` |
| `calculateTideScore` | Calculate score for tide level | `currentTide: number` | `number` | Used by `calculateConditionRating` |
| `matchesUserPreferences` | Determine if conditions match user preferences | `conditions: SurfConditions, preferences: object` | `boolean` | To be used in notification/alert features |
| `getConditionLabel` | Get a descriptive label for surf conditions | `rating: number` | `string` | To be used in condition displays |
| `isDaylightHours` | Check if the current time is during daylight hours | `date: Date, latitude: number, longitude: number` | `boolean` | To be used in conditions/recommendations |

### Location Utilities

Located in `src/utils/location.ts`

| Method | Description | Parameters | Return Value | Used In |
|--------|-------------|------------|--------------|---------|
| `calculateDistance` | Calculate distance between two coordinates | `lat1: number, lon1: number, lat2: number, lon2: number` | `number` | To be used in nearby spots calculations |
| `degreesToRadians` | Convert degrees to radians | `degrees: number` | `number` | Used by `calculateDistance` |
| `findNearbySpots` | Find surf spots within a certain radius | `spots: SurfSpot[], latitude: number, longitude: number, radius: number` | `Array<SurfSpot & { distance: number }>` | To be used in nearby spots feature |
| `formatDistance` | Format distance for display | `distance: number, useImperial: boolean` | `string` | To be used in spot distance displays |
| `getDirectionBetweenPoints` | Determine cardinal direction between two points | `lat1: number, lon1: number, lat2: number, lon2: number` | `string` | To be used in navigation/directions |
| `getRegionForCoordinates` | Get a map region for a list of coordinates | `coordinates: Array<{ latitude: number; longitude: number }>, padding: number` | `object` | To be used in map displays |

### Storage Utilities

Located in `src/utils/storage.ts`

| Method | Description | Parameters | Return Value | Used In |
|--------|-------------|------------|--------------|---------|
| `saveData` | Save data to local storage | `key: string, data: T` | `Promise<void>` | Used by other storage utilities |
| `getData` | Retrieve data from local storage | `key: string` | `Promise<T \| null>` | Used by other storage utilities |
| `removeData` | Remove data from local storage | `key: string` | `Promise<void>` | Used by other storage utilities |
| `clearAllData` | Clear all app data from local storage | None | `Promise<void>` | To be used in log out or reset features |
| `saveUserProfile` | Save user profile to local storage | `userProfile: any` | `Promise<void>` | To be used in profile management |
| `getUserProfile` | Get user profile from local storage | None | `Promise<any \| null>` | To be used in profile management |
| `saveAuthToken` | Save authentication token to local storage | `token: string` | `Promise<void>` | To be used in authentication flow |
| `getAuthToken` | Get authentication token from local storage | None | `Promise<string \| null>` | To be used in authentication flow |
| `saveFavoriteSpots` | Save favorite spots to local storage | `spots: any[]` | `Promise<void>` | To be used in favorites management |
| `getFavoriteSpots` | Get favorite spots from local storage | None | `Promise<any[]>` | To be used in favorites displays |
| `addFavoriteSpot` | Add a spot to the user's favorites | `spot: any` | `Promise<void>` | To be used in favorites management |
| `removeFavoriteSpot` | Remove a spot from the user's favorites | `spotId: string` | `Promise<void>` | To be used in favorites management |
| `saveUserPreferences` | Save user preferences to local storage | `preferences: any` | `Promise<void>` | To be used in settings management |
| `getUserPreferences` | Get user preferences from local storage | None | `Promise<any>` | To be used throughout the app |
| `cacheForecastData` | Save cached forecast data with timestamp | `spotId: string, forecastData: any` | `Promise<void>` | To be used in forecast data handling |
| `getCachedForecast` | Get cached forecast data if not expired | `spotId: string, maxAge: number` | `Promise<any \| null>` | To be used in forecast displays |
| `clearExpiredCache` | Clear expired cache entries | `maxAge: number` | `Promise<void>` | To be used in app initialization |

### General Utilities

Located in `src/utils/index.ts`

| Method | Description | Parameters | Return Value | Used In |
|--------|-------------|------------|--------------|---------|
| `debounce` | Debounce a function call | `func: T, wait: number` | `(...args: Parameters<T>) => void` | To be used in search inputs or other frequent events |
| `throttle` | Throttle a function call | `func: T, limit: number` | `(...args: Parameters<T>) => void` | To be used in scrolling or dragging events |
| `generateId` | Generate a unique ID | None | `string` | To be used when creating new records |
| `deepClone` | Deep clone an object | `obj: T` | `T` | To be used when copying complex objects |
| `isNullOrUndefined` | Check if a value is null or undefined | `value: any` | `boolean` | To be used in validation checks |
| `isDevelopment` | Check if running in development environment | None | `boolean` | To be used for development-only features |
| `safeJsonParse` | Safely parse JSON without throwing errors | `json: string, fallback: T` | `T` | To be used when parsing potentially invalid JSON |

## API Services

*No API services have been defined yet. This section will be populated as they are created.*

## Hooks

*No custom hooks have been defined yet. This section will be populated as they are created.*

## Components

*No components have been defined yet. This section will be populated as they are created.* 