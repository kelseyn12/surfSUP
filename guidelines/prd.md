Product Requirements Document (PRD): SurfSUP
1. Overview
1.1 Product Name
SurfSUP

1.2 Purpose
SurfSUP is a specialized app for Lake Superior surfers that provides real-time conditions, forecasts, and a community platform to connect with fellow surfers. The app's primary goal is to help users find optimal surf conditions, track their sessions, and build a community of Great Lakes surfers.

1.3 Target Audience
Experienced Lake Superior surfers (primary)
Beginner/intermediate surfers curious about Lake Superior
Surfing enthusiasts visiting the Duluth area
Kitesurfers, windsurfers, and other wave sport enthusiasts
1.4 Platform
Mobile-first (iOS/Android) using React Native.
Responsive web version using React.
1.5 Launch Timeline
Target: Summer 2025 (aligns with Lake Superior buoy season).
1.6 Success Metrics
MVP Goal: 50% of Lake Superior surfing community.
Engagement: Average of 2 sessions logged per active user per month.
Retention: 80% monthly active user retention.
Accuracy: Conditions matching user reports at least 85% of the time.
Growth: 25% user base increase year-over-year.
2. Objectives
2.1 Business Objectives
Build a loyal Lake Superior surf community.
Establish a scalable foundation for global surfing markets.
Drive engagement through real-time data and social features.
2.2 User Objectives
Access accurate, location-specific surf conditions.
Share plans and connect with friends (or public) easily.
Track and analyze personal surf sessions.
3. Features
3.1 Home Screen (Dashboard)
Description
Central hub for surf conditions, check-ins, and navigation.

Requirements
Surf Conditions:
Display real-time data: wave height, wind speed/direction, water temp, ice coverage.
Sources: Windy API, NOAA, local buoys (e.g., NDBC 45027 when active May-Nov).
Default to nearest spot; user can select manually.
"I'm Heading Out" Button:
One-tap action to post status (e.g., "Heading to Park Point, 2-3ft").
Visibility: Defaults to Friends; toggle for Public.
Spot selection from pre-loaded or user-added list.
Initiates 3-hour "Surfers in Water" count.
Surfers in Water:
Shows total surfers checked in across region (publicly visible).
Aggregates from "I'm Heading Out" check-ins.
Quick Access:
Buttons: Logbook, Map, Profile.
Wireframe
[Surf Conditions: Wave: 2-3ft | Wind: 12mph SW | Temp: 41°F | Ice: 10%]
[I'm Heading Out] (Friends ✓ | Public ☐) [Spot: Park Point]
[Surfers in Water: 5]
[Logbook] [Map] [Profile]
Acceptance Criteria
Conditions update every 15 minutes.
"I'm Heading Out" posts status and increments count instantly.
Total count visible to all users.
3.2 Map View (Live Surf Activity)
Description
Interactive map showing surf spot activity.

Requirements
Map:
Pre-loaded spots: Park Point, Lester River, French River, GuardRails, Boulders, Stoney Point.
User-submitted spots (moderated).
Pins show surfer count (e.g., green = 1-3, yellow = 4-6).
Surfers in Water:
Per-spot count from "I'm Heading Out" check-ins.
Updates when users mark "Out of Water" or 3 hours elapse.
Visibility:
Friends default; Public toggle.
Condition Updates:
Status posts visible per visibility setting.
Wireframe
[Map]
    - [2 Surfers] "Park Point"
    - [1 Surfer] "Stoney Point"
[Toggle: Friends | Public]
Acceptance Criteria
Map loads in <2 seconds.
Counts reflect real-time check-ins/outs.
Toggle filters statuses correctly.
3.3 Personal Logbook
Description
Tool for tracking and analyzing surf sessions.

Requirements
Log Sessions:
Fields: date, spot, conditions (auto-filled), notes, photo.
Winter fields: ice thickness, wetsuit type.
"Out of Water" Button:
Ends session, removes user from "Surfers in Water" count.
Notification after 3 hours: "Are you out of the water?" links here.
Visibility: Private default; Friends toggle.
Analytics: Total sessions, top spots, best wave days.
Wireframe
[Past Sessions]
    - "03/30/25 - Stoney Point - 3ft - Icy"
    - "03/15/25 - Boulders - 2ft - 5mm"
[Add Session] [Out of Water]
[Analytics: 10 sessions | Top: Park Point]
[Private | Friends]
Acceptance Criteria
Logs save instantly; photos upload in <5 seconds.
"Out of Water" updates count and logs session.
Notification triggers at 3 hours.
3.4 Community & Social Features
Description
Connects surfers through statuses and friend lists.

Requirements
Find Buddies: List of Friends (region-filtered initially).
Heading Out Feed: Shows Friends' statuses; Public optional.
Updates: Status posts tied to "I'm Heading Out".
Wireframe
[Buddies: 4 Nearby]
[Feed]
    - "Lisa - Lester River - 9:45 AM"
    - "Tom - GuardRails - 10:00 AM" (Public)
["Waves up!"]
Acceptance Criteria
Feed updates in real-time.
Friends added via invite codes.
3.5 Settings & Privacy
Description
User controls for data and notifications.

Requirements
Location: On/Off toggle.
Logbook: Private/Friends default.
Notifications: Friends out, big waves, "Out of Water" prompt.
Acceptance Criteria
Settings persist across sessions.
Notifications configurable per type.
4. Technical Requirements
4.1 Tech Stack
Frontend: React Native (mobile), React (web).
Backend: Node.js, PostgreSQL (scalable database).
Version Control: Git (hosted on GitHub or similar) for source code management, collaboration, and deployment tracking.
APIs:
Windy (conditions).
NOAA (weather).
NDBC buoys (Lake Superior, seasonal).
Mapbox (mapping, scalable).
Future: Surfline slot-in.
Hosting: AWS or Firebase (scalable infrastructure).

4.2 Real-Time Architecture
WebSocket Infrastructure:
- WebSocket server for bidirectional real-time communication
- Maintains persistent connections for instant updates
- Enables push notifications for surfer count changes
- Reduces polling frequency and network overhead

Real-Time Use Cases:
- Surfer count updates: When users check in/out, all connected clients receive immediate updates
- Check-in status changes: User's status is broadcast to all relevant users
- Activity notifications: Push notifications when friends check in nearby

Scalability Considerations:
- Connection pooling to handle thousands of simultaneous connections
- Message queueing to manage high-volume update scenarios
- Fallback to HTTP polling if WebSocket connection fails
- AWS ElastiCache for distributed state management across multiple server instances

4.3 Performance
API calls: <500ms latency.
Map load: <2 seconds.
Real-time updates: <1-second delay.
WebSocket message delivery: <200ms latency.
4.4 Scalability
Supports 100-1,000+ users.
Modular spot database for global expansion.
API framework extensible to new sources.
5. Design Guidelines
5.1 Visual Style
Colors: Blue palette (scalable beyond Lake Superior's icy tones).
Icons: Wave, wetsuit, pin (simple, universal).
5.2 Usability
Mobile-first: Swipe gestures, one-tap actions.
Accessibility: High-contrast mode, screen reader support.
6. Monetization
6.1 Initial Phase
Free MVP to grow Lake Superior user base.
6.2 Future Premium
Wave forecasts (e.g., Surfline integration).
Offline mode for remote spots.
Custom alerts (e.g., "さえ3ft+ at Park Point").
7. Launch Plan
7.1 Timeline
MVP Launch: Summer 2025.
7.2 Initial Rollout
Region: Lake Superior (Park Point, Lester River, etc.).
Outreach: Local surf shops, Duluth/North Shore social media (e.g., "Lake Superior Surfing" group).
7.3 Growth Strategy
Word of mouth for MVP.
Scale to other regions post-MVP (e.g., Great Lakes, coastal areas).
8. Risks & Mitigations
8.1 Risks
Low Adoption: Small Lake Superior community.
Data Gaps: Buoys offline Nov-Apr.
Scalability Load: Unexpected user surge.
8.2 Mitigations
Adoption: Target local events, partnerships.
Data: Fallback to Windy/NOAA; plan Surfline integration.
Load: Use AWS auto-scaling; test for 1,000 users.
9. Edge Cases
9.1 API Data Failures
Scenario: Windy/NOAA/buoy APIs fail or return incomplete data.
Mitigation: Cache last-known data; show "Data Unavailable"; fallback to alternate API.
9.2 Spot Selection Ambiguity
Scenario: Duplicate or vague spot names (e.g., "Stoney Point" in multiple regions).
Mitigation: Use geolocation for suggestions; enforce unique spot IDs.
9.3 "Surfers in Water" Accuracy
Scenario: Users forget "Out of Water" or ignore 3-hour notification.
Mitigation: Auto-expire after 3 hours; offer "Still Surfing" extension.
9.4 Offline Usage
Scenario: No internet at remote spots.
Mitigation: Cache conditions; queue check-ins/logs for sync.
9.5 Privacy Missteps
Scenario: Accidental Public check-in instead of Friends.
Mitigation: Confirmation prompt for Public; clear visibility feedback.
9.6 Small Community Overlap
Scenario: Low user count skews "crowd" perception.
Mitigation: Show "Low Activity" for <3 surfers; boost early adoption.
9.7 Notification Fatigue
Scenario: Too many alerts annoy users.
Mitigation: Cap frequency; granular settings.
9.8 Scalability Strain
Scenario: Sudden user spike overwhelms server.
Mitigation: Test at 500 users; use auto-scaling hosting.
9.9 User Error in Logs
Scenario: Unrealistic manual entries (e.g., 10ft waves).
Mitigation: Validate against API; flag outliers.
9.10 Winter Conditions
Scenario: Ice blocks surfing but isn't clear.
Mitigation: Highlight ice %; add "ice-out" reports.
10. Appendix
10.1 Pre-Loaded Spots
Park Point, Lester River, French River, GuardRails, Boulders, Stoney Point.
10.2 Future Considerations
Skill-level filters for global expansion.
Chat feature if community demands it.
10.3 Real-Time Surfer Count Feature
Description
SurfSUP includes a real-time surfer count feature to help users find optimal surf conditions.

Requirements
Surfer count system: Shows how many people are currently at each spot.
Check-in mechanism: Surfers can mark their arrival at a spot.
Activity indicators: No surfers, Low activity, Active, Crowded.
Automatic expiration: Check-ins expire after a preset time period.
Manual check-out: Surfers can mark themselves as out of the water.
Privacy options: Users can control visibility of their check-ins.
Activity history: Shows recent surfer counts at popular spots.
Acceptance Criteria
Surfer count updates in real-time.
Check-in and check-out functionality works as expected.
Privacy settings are respected.
Activity history is accurate and useful. 