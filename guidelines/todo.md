# SurfSUP App To-Do List

This document maintains a running list of tasks, enhancements, bug fixes, and technical debt items for the SurfSUP application.

---

## Where we are (April 2026)

| Phase | Goal | Status |
|-------|------|--------|
| **1 — Demo** | Screens + mock data | Done |
| **2 — Real MVP** | Auth, map, conditions, check-ins, AI outlook | **~85%** |
| **3 — Trustworthy** | Photos, stable builds, security, monitoring | **In progress** |
| **4 — Awesome** | Alerts, community loop, ocean / Lake Michigan | Planned |

**You are here:** finishing **Phase 2** and starting **Phase 3**. The hard surf/weather engine exists; focus is polish, trust, and ship confidence.

### Current focus (do in order)

1. [ ] **Ship confidence** — reliable `expo run:ios` / EAS; see `guidelines/BUILD.md`
2. [ ] **Trust at a glance** — real spot photos in `spots.json` (Firebase Storage URLs), remove placeholders
3. [ ] **Trust in data** — validate 3–5 spots vs buoys; tune `surfConfig` when wrong
4. [ ] **Firestore security rules** — users only read/write their own check-ins
5. [ ] **Production hygiene** — enable Sentry (`@sentry/react-native` + DSN), minimal GitHub CI (lint + tests)

### Recently done (sync with code)

- [X] Windy API removed (Open-Meteo + NOAA + NDBC only)
- [X] Check-ins / surfer counts → Firestore (`checkInService.ts`)
- [X] Home surfer-count poll 5s → 30s (`TIMEOUTS.SURFER_COUNT_POLL`)
- [X] `mockBackend.ts` removed (unused)

---

## 🎯 Major Milestone Achieved: Sophisticated Lake Superior Surf Forecasting System

**Status: COMPLETED** ✅

We have successfully implemented a comprehensive surf forecasting system for Lake Superior conditions. This system includes:

- **Multi-source data aggregation** from NDBC buoys, Open-Meteo Marine, NOAA marine products, and NWS AFD (via Cloud Function)
- **Lake Superior-specific surf likelihood calculations** with conservative wave height gates
- **Spot-specific wind direction logic** for North Shore vs South Shore spots (Park Point, Lester, Stoney, Brighton, Marquette, Ashland, etc.)
- **Sophisticated wind logic** that separates swell-building winds from local grooming winds
- **Intelligent rating adjustments** based on wind quality (clean, onshore, strong)
- **Advanced data processing** with floating-point precision fixes and realistic wave height ranges
- **Clean architecture** with single source of truth for all wind logic

**Code Quality**: Resolved 58 linting issues, eliminated duplicate code, and improved maintainability to production standards.

## Legend
- [ ] Todo
- [X] Completed
- [P] In Progress
- [H] On Hold

## Project Setup

- [X] Create project structure and directories
- [X] Set up TypeScript and configuration
- [X] Create data models/interfaces
- [X] Set up utility functions
- [X] Create mock data for development
- [X] Set up project documentation in guidelines folder
- [X] Install and configure necessary dependencies
- [X] Set up linting and code formatting

## Core Features

### Authentication

- [X] Using a fake auth context for Expo Go development. Replace with real Firebase Auth integration before production or when moving to a custom dev client.
- [X] Implement user registration screen
  - X Added registration form with name, email, and password fields
  - X Implemented form validation
  - X Added toggle between login and registration modes
- [X] Implement login screen
  - X Added email and password login
  - X Implemented form validation
  - X Added error handling and loading states
- [X] Set up authentication flow
  - X Implemented basic auth state management
  - X Added navigation flow between auth and main app
- [X] Implement password reset
  - [X] ForgotPasswordScreen + Firebase email flow
  - [X] PasswordResetSuccessScreen
- [X] Add social media login options
  - [X] Google and Apple sign-in (`socialAuth.ts`, native modules)
- [ ] Add biometric authentication for app access
  - [ ] Add biometric login option
  - [ ] Implement secure storage for biometric credentials
  - [ ] Add fallback to password login

### Surf Spot Features

- [X] Create surf spot list component
- [X] Implement surf spot detail screen
- [X] Add map view of surf spots (mock only)
- [X] Implement interactive MapView for surf spots (replace mock with real map component showing surf spots)
- [ ] Improve map performance (e.g. memoization, avoid unnecessary re-renders)
- [ ] Add marker clustering when zoomed out (optional)
- [X] Implement search and filtering for spots
  - X Created comprehensive SearchScreen with text search and multiple filter options
  - X Added difficulty, wave type, and amenities filters with visual chips
  - X Integrated search functionality into navigation and HomeScreen
- [X] Add favorites functionality
- [X] Create check-in feature for spots
- [X] Implement surf session logging (`LogSessionScreen`, `SessionLogScreen`, `sessions.ts`)

### Surf Reports & Forecasts

- [X] Create current conditions component
- [X] Implement forecast display
- [X] Set up API services for forecast data
- [X] Create tide chart component
  - X Created WaterLevelChart component for Great Lakes surfing
  - X Implemented Lake Superior water level tracking (not traditional tides)
  - X Added NDBC buoy data integration with wave height/period analysis
  - X Integrated into SpotDetailsScreen for comprehensive spot information
- [X] Add swell information display
- [X] Implement wind information display
- [X] Implement intelligent data blending system
  - X Created comprehensive data aggregation that uses ALL API sources simultaneously
  - X Implemented weighted averaging with confidence scoring for wave height and wind data
  - X Added conflict detection when sources disagree significantly (>2ft for waves, >15mph for wind)
  - X Added detailed debug logging showing how final values are derived from multiple sources
  - X Enhanced buoy reliability detection (out-of-water, damaged, not reporting)
  - X Improved fallback strategy when buoys are unavailable
  - X Fixed NDBC buoy data parsing to match current format (columns reordered)
  - X Cleaned up excessive logging - moved most logs to development-only
  - X Removed all debug logging for clean production experience
- [X] Implement sophisticated Lake Superior surf forecasting system
  - X Multi-source data aggregation (NOAA Weather.gov, NOAA Marine Products, NDBC Buoys, Windy API)
  - X Lake Superior-specific surf likelihood calculations with conservative wave height gates
  - X Spot-specific wind direction logic for North Shore vs South Shore spots
  - X Sophisticated wind logic separating swell-building winds from local grooming winds
  - X Intelligent rating adjustments based on wind quality (clean, onshore, strong)
  - X Floating-point precision fixes for wave height display
  - X Realistic wave height ranges based on data confidence
  - X Clean architecture with single source of truth for wind logic

### User Profile

- [X] Create user profile screen (`ProfileScreen`)
- [X] Implement profile editing (`EditProfileScreen`)
- [X] Add user preferences settings (board type, units, home spot)
- [X] Create session history view (`StatsDashboardScreen`, session list)
- [ ] Add achievements/statistics (beyond basic stats dashboard)

## UI/UX Components

- [X] Create app navigation structure
- [X] Design and implement app theme
- [X] Create common UI components
  - [X] Wave height indicator
  - [X] Wind direction indicator
  - [X] Tide indicator
  - [X] Rating stars
  - [X] Weather icon set
- [ ] Implement light/dark mode
- [ ] Add animations and transitions
- [ ] Implement pull-to-refresh functionality
- [X] Add WebSocket connection status indicators in UI
  - X Subtle status dot added to HeaderBar, powered by a global context for real-time connection state.

## Data Management

- [X] Set up API service layer
- [ ] Implement data caching strategy
- [X] Create local storage utilities
- [ ] Set up state management
- [ ] Implement offline support
- [ ] Add synchronization for offline changes

## Testing & Quality Assurance

- [X] Set up testing framework
- [X] Write unit tests for utilities
- [ ] Create component tests
- [ ] Implement integration tests
- [ ] Set up CI/CD pipeline
- [ ] Perform security audit
- [ ] Conduct performance testing

## Code Quality & Maintenance

- [X] Complete codebase cleanup and refactoring
  - X Resolved 58 linting issues (0 errors, 0 warnings)
  - X Eliminated duplicate wind logic systems
  - X Removed unused imports, variables, and functions
  - X Fixed Array type syntax consistency
  - X Cleaned up unused legacy functions
  - X Improved code architecture and maintainability
  - X Single source of truth for all wind direction logic

## Deployment & Infrastructure

- [ ] Configure build process
- [ ] Set up environment configurations
- [ ] Create deployment pipelines
- [ ] Set up monitoring and analytics
- [ ] Implement crash reporting

## Future Enhancements

- [ ] Add social features (sharing, friends, etc.)
- [ ] Implement notifications for ideal surf conditions
- [ ] Create community reports/check-ins
- [ ] Add photo/video upload for sessions
- [ ] Integrate weather radar
- [ ] Add webcam viewing for popular spots
- [ ] Create surf trip planning feature
- [ ] Implement gear tracking and recommendations

## Completed Tasks
- [X] Implement WebSocket service for real-time updates
  - Implemented mock WebSocket service
  - Added real-time surfer count updates
  - Implemented check-in status notifications
  - Tested across all platforms

## Current Tasks
- [X] Implement comprehensive error handling for WebSocket
  - Persistent error banner and live countdown now appear in the UI if the WebSocket connection is lost or unstable.
- [X] Add reconnection strategies
  - Exponential backoff and live UI feedback implemented. All test/mock code removed; service is production-ready.
- [H] Integrate with real backend WebSocket server
  - Deferred until after Firebase authentication and user flows are complete. Will revisit real-time backend after core auth is in place.

## Recently Completed (Sophisticated Surf Forecasting System)
- [X] Implement multi-source data aggregation (NOAA, buoys, Windy API)
- [X] Create Lake Superior-specific surf likelihood calculations
- [X] Add sophisticated wind direction logic for spot-specific conditions
- [X] Implement intelligent rating adjustments based on wind quality
- [X] Fix floating-point precision issues in wave height display
- [X] Add conservative wave height gates to prevent rating inflation
- [X] Consolidate all wind logic into single source of truth
- [X] Complete codebase cleanup (58 linting issues resolved)

## Recently Completed (Firebase Auth Implementation)
- [X] Set up Firebase project and configuration
- [X] Implement Firebase authentication with React Native Firebase
- [X] Create proper user type conversion between Firebase and app User types
- [X] Set up Zustand auth store with persistence
- [X] Configure iOS and Android Firebase setup
- [X] Fix native module linking issues
- [X] Clean up duplicate files and project structure
- [X] Test authentication flow (login/register/logout)

## Recently Completed (User Profile Implementation)
- [X] Create comprehensive EditProfileScreen with form validation
- [X] Add profile editing functionality (name, username, profile image, preferences)
- [X] Implement surfing preferences (board type, units, home spot)
- [X] Enhance ProfileScreen with edit button and preferences display
- [X] Add navigation integration for profile editing
- [X] Update SettingsScreen to link to EditProfileScreen

## Recently Completed (Map & Pins)
- [X] Replace mock map with real MapView (react-native-maps, iOS/Android)
- [X] Show surf spot pins with surfer-count colors (gray/green/orange/red)
- [X] Custom callout: spot name, surfer count, Low/Active/Crowded, "Go to details" button
- [X] Fix surfer count on map (globalSurferCounts sync on check-in/check-out; getSurferCount export from api)
- [X] iOS: location permissions, legacy pin view for colors, scripts for dev build

## Recently Completed (Password Reset Implementation)
- [X] Implement Firebase password reset functionality
- [X] Add email validation and error handling
- [X] Create PasswordResetSuccessScreen with helpful tips
- [X] Add navigation flow from AuthScreen to ForgotPasswordScreen
- [X] Handle specific Firebase error codes with user-friendly messages

## Recently Completed (Sophisticated Surf Forecasting System)
- [X] Implement multi-source data aggregation (NOAA, buoys, Windy API)
- [X] Create Lake Superior-specific surf likelihood calculations
- [X] Add sophisticated wind direction logic for spot-specific conditions
- [X] Implement intelligent rating adjustments based on wind quality
- [X] Fix floating-point precision issues in wave height display
- [X] Add conservative wave height gates to prevent rating inflation
- [X] Consolidate all wind logic into single source of truth
- [X] Complete codebase cleanup (58 linting issues resolved)

## Recently Completed (Data Pipeline + AI Surf Outlook — March 2026)

### Forecast Data
- [X] Replaced NOAA text-parsing with Open-Meteo Marine API (GFS-Wave model) as primary forecast source
  - Hourly wave height, period, and direction for 7 days — real numbers, no regex
  - NOAA text product kept as fallback only
  - Forecast cards now show Today/Tomorrow/weekday labels grouped by calendar day, noon as representative period
- [X] Parallelized buoy fetches in buoyApi.ts (was sequential for-loops → Promise.allSettled)
- [X] Parallelized SpotDetailsScreen loadData (4 sequential awaits → single Promise.all)
- [X] Expanded nearby spots radius 50km → 150km, sorted closest-first

### AI Regional Surf Outlook (Cloud Function)
- [X] Built Firebase Cloud Function `getSurfOutlook` (Node 24, us-central1)
  - Fetches NWS AFD + Open-Meteo 48h wave/wind model data
  - Calls Claude claude-sonnet-4-6 to generate a Brandon Pham-style surf outlook
  - 6-hour Firestore cache per subregion — ~3 Claude calls/day total (~$1-2/month)
  - Anthropic API key stored as Firebase Secret (never in code)
- [X] Implemented subregion architecture — single config object drives everything:
  - `superior-north-mn` — NE/ENE winds, 250mi fetch, DLH office, Duluth-area coords
  - `superior-south-wi` — NW/WNW winds, opposite shore, DLH office, Ashland coords
  - `superior-mi` — W/WNW winds, MQT office, Marquette coords
  - `michigan-west` — S/SE winds, GRR office (config ready, no spots yet)
  - `ocean-east` / `ocean-west` — config skeletons ready for future expansion
- [X] Added `subregion` field to all spots in spots.json and SurfSpot type
- [X] Outlook section title shows region label (e.g. "Lake Superior — North Shore (MN)")
- [X] Fixed stale spot name bug — forecasterNotes cleared on spot navigation
- [X] Installed @react-native-firebase/functions@22.4.0, added RNFBFunctions + FirebaseFunctions to Podfile

### Infrastructure
- [X] Upgraded Firebase project (surfsup-8e5ae) to Blaze plan
- [X] Firebase CLI configured, functions deployed
- [X] Artifact cleanup policy set (1-day retention)

## Pending / Future Work

### Expanding Regions
- [ ] Add Lake Michigan spots (subregion: `michigan-west`) — config already exists in Cloud Function
- [ ] Add ocean spots when Ocean tab is built — config skeletons exist for `ocean-east` / `ocean-west`
  - Only requires: correct NWS office per coastline, spot lat/lon, `subregion` field in spots.json
  - Prompt already handles ocean context (groundswell periods 8-18s, tides, offshore wind quality)

### Spot Details Improvements
- [ ] Community photo upload — Firebase Storage + expo-image-picker (photoService.ts built, needs iOS build with RNFBStorage pod)
- [ ] Push notifications for surf alerts (surf likelihood hits "Good" or "Firing" at a favorited spot)
- [X] Surfer count polling interval: 30s on Home (`TIMEOUTS.SURFER_COUNT_POLL`)

### Data Quality
- [ ] Water temp source: currently from buoys/NOAA — consider GLERL CoastWatch for basin-wide temp map
- [ ] Ice extent: no data source yet — relevant for spring safety warnings (Brandon references National Ice Center)
- [ ] Flood Bay / Beaver Bay / Grand Marais MN: these spots need ENE or ESE wind logic reviewed — they face differently than Duluth-area breaks

## Next Priority Tasks
- [X] Implement password reset functionality
- [X] Add social media login (Google, Apple)
- [X] Create user profile screen and editing
- [X] Implement session history and statistics
- [X] Add favorites functionality for surf spots
- [X] Implement search and filtering for spots
  - X Created comprehensive SearchScreen with text search and multiple filter options
  - X Added difficulty, wave type, and amenities filters with visual chips
  - X Integrated search functionality into navigation and HomeScreen
- [X] Implement sophisticated Lake Superior surf forecasting system
  - X Multi-source data aggregation and intelligent blending
  - X Spot-specific wind direction logic and surf likelihood calculations
  - X Advanced wave height processing and rating adjustments
- [X] Complete codebase cleanup and refactoring
  - X Resolved all linting issues and improved code quality
- [ ] Add photo upload capability for session logs
- [X] Implement real Great Lakes APIs
  - X NOAA Water Level API integration
  - X NDBC Buoy Data API integration
  - X Replace mock data with real-time data
  - X Add error handling and fallback to mock data
- [P] Firebase Firestore (check-ins live; rules + offline pending)
  - [X] Check-ins and surfer counts via `firestore.ts` / `checkInService.ts`
  - [ ] Firestore security rules (audit + deploy)
  - [ ] Real-time listeners where polling is still used
  - [ ] Offline persistence for check-ins

To-Do List: Building SurfSUP
Phase 1: Planning
Goal: Establish the foundation for development.

X Define Team & Roles - Decided to build solo with support from AI tools.
X Finalize Tech Stack - Confirmed: React Native (mobile), Node.js, PostgreSQL, Git, Expo and React Native libraries.
X Set Up Project Management - Using GitHub for tracking issues and features.
X API Access & Documentation - Selected APIs for surf conditions data.
X Budget & Timeline - Established project timeline with milestones.
X Wireframes & Design - Created basic design with color palette and component styles.

Phase 2: Development
Goal: Build the MVP with core features.

X Set Up Development Environment
  X Install React Native, Node.js, Git locally.
  X Initialize Git repository with proper structure.
  X Create project structure.
  X Set up linting and code formatting.
  X Set up testing framework.

X Backend Setup (Partial - Mock Implementation)
  X Build data models with TypeScript interfaces.
  X Create mock API endpoints for conditions data.
  X Implement data fetching for surf spots.
  X Add local storage utilities for persisting favorites and sessions.

X Core Components
  X Set up navigation system.
  X Create reusable components (buttons, cards, badges).
  X Implement location services.
  X Add formatters and utility functions.
  X Add surfer count display to SurfSpotCard component.

Real-Time Surfer Count Feature
  X Implement check-in mechanism in SpotDetailsScreen.
  X Add surfer activity indicator to map pins (colored pins + callout surfer count).
  X Create check-out functionality with auto-expiration timer.
  □ Add privacy settings for check-ins.
  □ Implement surfer count history.

Real-Time WebSocket Architecture
  X Create mock WebSocket service for real-time updates.
  □ Connect WebSocket service to API endpoints for check-ins/outs.
  X Update components to subscribe to WebSocket events instead of polling.
  □ Add connection status indicator and reconnection logic.
  □ Implement message queuing for offline/reconnection scenarios.
  □ Add server-side WebSocket implementation (future).
  □ Implement scaling solution for thousands of concurrent connections (future).

Session Logging
  X Create interface for logging surf sessions after check-out.
  X Implement session details form with board type, conditions, etc.
  X Connect session logging to API service.
  □ Add photo upload capability for session logs.
  □ Create session history view.
  □ Implement stats and analytics based on session history.

Frontend Screens
  X Home Screen - Implement surf conditions view.
  X Map View - Implement map with surf spot pins.
  □ Favorites Screen - Implement favorite spots list.
  □ Profile Screen - Implement user profile.
  X Detail Screens - Implement spot details and sessions.
  X Check-in & Log Screens - Implement session logging.

Authentication & User Management
  X Build authentication screens.
  X Implement Firebase authentication with proper user management.
  X Add user preferences and profile management.

Phase 3: Testing
Goal: Ensure functionality, performance, and usability.

X Write unit tests for utilities - Created tests for formatters and location utilities.
□ Test navigation flows.
□ Test API failure handling.
□ Test offline functionality.
□ Test surfer count check-in/check-out system.
□ Conduct user testing.

Phase 4: Launch
Goal: Release MVP and grow initial user base.

□ Package app for iOS/Android.
□ Prepare for app store submission.
□ Create promotional materials.
□ Design onboarding experience.

Ongoing: Post-MVP
Goal: Iterate and scale beyond Lake Superior.

□ Add push notifications.
□ Implement social features.
□ Add premium features.
□ Expand to more locations.

- [X] jsEngine was set back to Hermes in app.json after switching to mock authentication. Revisit this if real Firebase Auth is reintroduced or if native module compatibility issues arise.
- [X] Hermes was disabled in app.json (set jsEngine to 'jsc') to allow Firebase Auth to work in Expo Go. If you need Hermes or native Firebase features in the future, revisit this decision and consider migrating to a custom dev client or bare workflow. 