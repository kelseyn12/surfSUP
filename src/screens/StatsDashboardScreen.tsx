import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { getUserSessions, storeUserSessions } from '../services/storage';
import { SurfSession } from '../types';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const StatsDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<SurfSession[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    averageSessionLength: 0,
    favoriteSpot: '',
    longestSession: 0,
    bestMonth: '',
    mostActiveWeek: '',
    longestStreak: 0,
    mostActiveWeekRange: '',
  });
  const [sessionsByMonth, setSessionsByMonth] = useState<{ [month: string]: SurfSession[] }>({});
  const [trend, setTrend] = useState({
    sessionChange: 0,
    sessionUp: true,
    avgDurationChange: 0,
    avgDurationUp: true,
    thisMonth: '',
    lastMonth: '',
    thisMonthSessions: 0,
    lastMonthSessions: 0,
    thisMonthAvg: 0,
    lastMonthAvg: 0,
  });
  const [personalBests, setPersonalBests] = useState({
    longestSession: { duration: 0, date: '', spot: '', isNew: false },
    mostSessionsWeek: { count: 0, week: '', range: '', isNew: false },
    mostSessionsMonth: { count: 0, month: '', isNew: false },
  });
  const [spotAnalytics, setSpotAnalytics] = useState<{ spot: string; count: number; percent: number; totalMinutes: number }[]>([]);
  const [streaks, setStreaks] = useState({
    current: 0,
    longest: 0,
    milestone: 0,
    streakDays: [] as boolean[], // last 14 days, true if surfed
  });
  const [qualityStats, setQualityStats] = useState({
    avgRating: null as number | null,
    bestSession: null as SurfSession | null,
    bestRating: null as number | null,
    commonWind: '',
    commonWeather: '',
  });
  const [funFacts, setFunFacts] = useState({
    totalHours: 0,
    firstSession: '',
    mostSessionsDay: 0,
    mostSessionsDayDate: '',
    earliestTime: '',
    latestTime: '',
    popularDay: '',
    favoriteBoard: '',
    mostSessionsMonth: 0,
    mostSessionsMonthLabel: '',
    earliestMonth: '',
    latestMonth: '',
    commonCondition: '',
    uniqueSpots: 0,
  });

  useEffect(() => {
    const fetchSessions = async () => {
      let data = await getUserSessions();
      if (!data.length) {
        const now = new Date();
        const sample: SurfSession[] = [
          {
            id: '1',
            spotId: 'stonyPoint',
            startTime: new Date(now.getFullYear(), 6, 21, 7, 0).toISOString(), // July
            endTime: new Date(now.getFullYear(), 6, 21, 9, 0).toISOString(),
            board: { type: 'shortboard' },
            conditions: {},
          } as SurfSession,
          {
            id: '2',
            spotId: 'parkPoint',
            startTime: new Date(now.getFullYear(), 5, 10, 8, 0).toISOString(), // June
            endTime: new Date(now.getFullYear(), 5, 10, 10, 0).toISOString(),
            board: { type: 'longboard' },
            conditions: {},
          } as SurfSession,
          {
            id: '3',
            spotId: 'lesterRiver',
            startTime: new Date(now.getFullYear(), 4, 5, 6, 0).toISOString(), // May
            endTime: new Date(now.getFullYear(), 4, 5, 7, 30).toISOString(),
            board: { type: 'fish' },
            conditions: {},
          } as SurfSession,
        ];
        await storeUserSessions(sample);
        data = sample;
      }
      setSessions(data);
      calculateStats(data);
      groupSessionsByMonth(data);
      calculateTrends(data);
      calculatePersonalBests(data);
      calculateSpotAnalytics(data);
      calculateStreaks(data);
      calculateQualityStats(data);
      calculateFunFacts(data);
    };
    fetchSessions();
  }, []);

  const calculateStats = (data: SurfSession[]) => {
    if (!data.length) return;
    const totalSessions = data.length;
    let totalMinutes = 0;
    let spotCounts: { [spot: string]: number } = {};
    let longestSession = 0;
    let favoriteSpot = '';
    let monthCounts: { [month: string]: number } = {};
    let weekCounts: { [week: string]: number } = {};
    let streak = 0, maxStreak = 0;
    let lastDate: string | null = null;
    // Sort sessions by date
    const sorted = [...data].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    sorted.forEach(session => {
      const start = session.startTime ? new Date(session.startTime) : null;
      const end = session.endTime ? new Date(session.endTime).getTime() : null;
      const duration = start && end !== null ? Math.max(0, (end - start.getTime()) / 60000) : 0; // in minutes
      totalMinutes += duration;
      if (start && duration > longestSession) longestSession = duration;
      if (session.spotId) {
        spotCounts[session.spotId] = (spotCounts[session.spotId] || 0) + 1;
      }
      // Month
      if (start) {
        const month = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
        // Week (ISO week string)
        const week = `${start.getFullYear()}-W${getWeekNumber(start)}`;
        weekCounts[week] = (weekCounts[week] || 0) + 1;
        // Streak
        const dateStr = start.toISOString().slice(0, 10);
        if (lastDate) {
          const prev = new Date(lastDate);
          const diff = (start.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            streak++;
          } else {
            streak = 1;
          }
        } else {
          streak = 1;
        }
        if (streak > maxStreak) maxStreak = streak;
        lastDate = dateStr;
      }
    });
    const averageSessionLength = totalMinutes / totalSessions;
    favoriteSpot = Object.entries(spotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    // Best month
    const bestMonthKey = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const bestMonth = bestMonthKey ? `${MONTH_NAMES[parseInt(bestMonthKey.slice(5)) - 1]} ${bestMonthKey.slice(0, 4)}` : '-';
    // Most active week
    const bestWeekKey = Object.entries(weekCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const mostActiveWeek = bestWeekKey ? bestWeekKey : '-';
    const mostActiveWeekRange = bestWeekKey ? getWeekDateRange(bestWeekKey) : '-';
    setStats({
      totalSessions,
      totalHours: Math.round(totalMinutes / 60),
      averageSessionLength: Math.round(averageSessionLength),
      favoriteSpot,
      longestSession: Math.round(longestSession),
      bestMonth,
      mostActiveWeek,
      longestStreak: maxStreak,
      mostActiveWeekRange,
    });
  };

  function getWeekNumber(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  const groupSessionsByMonth = (data: SurfSession[]) => {
    const grouped: { [month: string]: SurfSession[] } = {};
    data.forEach(session => {
      const date = new Date(session.startTime);
      const month = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(session);
    });
    setSessionsByMonth(grouped);
  };

  function calculateTrends(data: SurfSession[]) {
    if (!data.length) return;
    const now = new Date();
    const thisMonthKey = getMonthKey(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = getMonthKey(lastMonthDate);
    let thisMonthSessions = 0, lastMonthSessions = 0;
    let thisMonthTotal = 0, lastMonthTotal = 0;
    data.forEach(session => {
      const start = session.startTime ? new Date(session.startTime) : null;
      const end = session.endTime ? new Date(session.endTime).getTime() : null;
      const duration = start && end !== null ? Math.max(0, (end - start.getTime()) / 60000) : 0; // in minutes
      const key = start ? getMonthKey(start) : '';
      if (key === thisMonthKey) {
        thisMonthSessions++;
        thisMonthTotal += duration;
      } else if (key === lastMonthKey) {
        lastMonthSessions++;
        lastMonthTotal += duration;
      }
    });
    const thisMonthAvg = thisMonthSessions ? thisMonthTotal / thisMonthSessions : 0;
    const lastMonthAvg = lastMonthSessions ? lastMonthTotal / lastMonthSessions : 0;
    const sessionChange = lastMonthSessions ? ((thisMonthSessions - lastMonthSessions) / lastMonthSessions) * 100 : (thisMonthSessions ? 100 : 0);
    const avgDurationChange = lastMonthAvg ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100 : (thisMonthAvg ? 100 : 0);
    setTrend({
      sessionChange: Math.abs(Math.round(sessionChange)),
      sessionUp: thisMonthSessions >= lastMonthSessions,
      avgDurationChange: Math.abs(Math.round(avgDurationChange)),
      avgDurationUp: thisMonthAvg >= lastMonthAvg,
      thisMonth: MONTH_NAMES[now.getMonth()],
      lastMonth: MONTH_NAMES[lastMonthDate.getMonth()],
      thisMonthSessions,
      lastMonthSessions,
      thisMonthAvg: Math.round(thisMonthAvg),
      lastMonthAvg: Math.round(lastMonthAvg),
    });
  }

  function calculatePersonalBests(data: SurfSession[]) {
    if (!data.length) return;
    // Longest session
    let longest = { duration: 0, date: '', spot: '', isNew: false };
    // Most sessions in a week/month
    let weekCounts: { [week: string]: SurfSession[] } = {};
    let monthCounts: { [month: string]: SurfSession[] } = {};
    // Sort sessions by date
    const sorted = [...data].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    sorted.forEach(session => {
      const start = session.startTime ? new Date(session.startTime) : null;
      const end = session.endTime ? new Date(session.endTime).getTime() : null;
      const duration = start && end !== null ? Math.max(0, (end - start.getTime()) / 60000) : 0; // in minutes
      if (start && duration > longest.duration) {
        longest = { duration, date: start.toLocaleDateString(), spot: session.spotId, isNew: false };
      }
      // Week
      if (start) {
        const week = `${start.getFullYear()}-W${getWeekNumber(start)}`;
        if (!weekCounts[week]) weekCounts[week] = [];
        weekCounts[week].push(session);
        // Month
        const month = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthCounts[month]) monthCounts[month] = [];
        monthCounts[month].push(session);
      }
    });
    // Most sessions in a week
    let mostWeek = { count: 0, week: '', range: '', isNew: false };
    Object.entries(weekCounts).forEach(([week, arr]) => {
      if (arr.length > mostWeek.count) {
        mostWeek = { count: arr.length, week, range: getWeekDateRange(week), isNew: false };
      }
    });
    // Most sessions in a month
    let mostMonth = { count: 0, month: '', isNew: false };
    Object.entries(monthCounts).forEach(([month, arr]) => {
      if (arr.length > mostMonth.count) {
        mostMonth = { count: arr.length, month: `${MONTH_NAMES[parseInt(month.slice(5)) - 1]} ${month.slice(0, 4)}`, isNew: false };
      }
    });
    // Check if new records set this month
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    if (monthCounts[thisMonthKey] && monthCounts[thisMonthKey].length === mostMonth.count) {
      mostMonth.isNew = true;
    }
    const thisWeekKey = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    if (weekCounts[thisWeekKey] && weekCounts[thisWeekKey].length === mostWeek.count) {
      mostWeek.isNew = true;
    }
    // Longest session new record?
    if (sorted.length && new Date(sorted[sorted.length - 1].startTime).getMonth() === now.getMonth() && longest.duration) {
      longest.isNew = true;
    }
    setPersonalBests({
      longestSession: longest,
      mostSessionsWeek: mostWeek,
      mostSessionsMonth: mostMonth,
    });
  }

  function calculateSpotAnalytics(data: SurfSession[]) {
    if (!data.length) return setSpotAnalytics([]);
    const spotStats: { [spot: string]: { count: number; totalMinutes: number } } = {};
    data.forEach(session => {
      if (session.spotId) {
        if (!spotStats[session.spotId]) spotStats[session.spotId] = { count: 0, totalMinutes: 0 };
        spotStats[session.spotId].count++;
        const start = session.startTime ? new Date(session.startTime).getTime() : null;
        const end = session.endTime ? new Date(session.endTime).getTime() : null;
        const duration = start && end !== null ? Math.max(0, (end - start) / 60000) : 0; // in minutes
        spotStats[session.spotId].totalMinutes += duration;
      }
    });
    const total = data.length;
    const ranked = Object.entries(spotStats)
      .map(([spot, stat]) => ({ spot, count: stat.count, percent: Math.round((stat.count / total) * 100), totalMinutes: stat.totalMinutes }))
      .sort((a, b) =>
        b.count - a.count ||
        b.totalMinutes - a.totalMinutes ||
        a.spot.localeCompare(b.spot)
      );
    setSpotAnalytics(ranked);
  }

  function calculateStreaks(data: SurfSession[]) {
    if (!data.length) return setStreaks({ current: 0, longest: 0, milestone: 0, streakDays: Array(14).fill(false) });
    // Get all unique session days
    const days = new Set(data.map(s => new Date(new Date(s.startTime).toDateString()).getTime()));
    // Sort days ascending
    const sortedDays = Array.from(days).sort((a, b) => a - b);
    // Calculate longest and current streak
    let longest = 0, current = 0, temp = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        temp++;
      } else {
        if (temp > longest) longest = temp;
        temp = 1;
      }
    }
    if (temp > longest) longest = temp;
    // Current streak: count back from today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const diff = (today.getTime() - sortedDays[i]) / (1000 * 60 * 60 * 24);
      if (diff === 0 || diff === 1) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }
    // Milestone badge
    let milestone = 0;
    if (longest >= 30) milestone = 30;
    else if (longest >= 7) milestone = 7;
    else if (longest >= 3) milestone = 3;
    // Last 14 days streak dots
    const streakDays: boolean[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      streakDays.push(days.has(d.getTime()));
    }
    setStreaks({ current: streak, longest, milestone, streakDays });
  }

  function calculateQualityStats(data: SurfSession[]) {
    if (!data.length) return setQualityStats({ avgRating: null, bestSession: null, bestRating: null, commonWind: '', commonWeather: '' });
    let ratingSum = 0, ratingCount = 0, bestRating = -Infinity, bestSession: SurfSession | null = null;
    const windCounts: { [dir: string]: number } = {};
    const weatherCounts: { [cond: string]: number } = {};
    data.forEach(session => {
      // Rating
      let rating: number | undefined;
      if (session.conditions && typeof session.conditions === 'object' && 'rating' in session.conditions) {
        rating = (session.conditions as any).rating;
      }
      if (typeof rating === 'number') {
        ratingSum += rating;
        ratingCount++;
        if (rating > bestRating) {
          bestRating = rating;
          bestSession = session;
        }
      }
      // Wind
      let wind: string | undefined;
      if (session.conditions && typeof session.conditions === 'object' && 'wind' in session.conditions && (session.conditions as any).wind && typeof (session.conditions as any).wind === 'object' && 'direction' in (session.conditions as any).wind) {
        wind = (session.conditions as any).wind.direction;
      }
      if (wind) windCounts[wind] = (windCounts[wind] || 0) + 1;
      // Weather
      let weather: string | undefined;
      if (session.conditions && typeof session.conditions === 'object' && 'weather' in session.conditions && (session.conditions as any).weather && typeof (session.conditions as any).weather === 'object' && 'condition' in (session.conditions as any).weather) {
        weather = (session.conditions as any).weather.condition;
      }
      if (weather) weatherCounts[weather] = (weatherCounts[weather] || 0) + 1;
    });
    // Most common wind and weather
    const commonWind = Object.entries(windCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const commonWeather = Object.entries(weatherCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    setQualityStats({
      avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      bestSession,
      bestRating: bestRating === -Infinity ? null : bestRating,
      commonWind,
      commonWeather,
    });
  }

  function calculateFunFacts(data: SurfSession[]) {
    if (!data.length) return setFunFacts({
      totalHours: 0, firstSession: '', mostSessionsDay: 0, mostSessionsDayDate: '', earliestTime: '', latestTime: '',
      popularDay: '', favoriteBoard: '', mostSessionsMonth: 0, mostSessionsMonthLabel: '', earliestMonth: '', latestMonth: '',
      commonCondition: '', uniqueSpots: 0
    });
    // Total hours
    let totalMinutes = 0;
    // First session
    let firstSession: SurfSession | null = null;
    // Most sessions in a day
    const dayCounts: { [date: string]: number } = {};
    // Earliest/latest session time
    let earliest = 24 * 60, latest = 0;
    // Popular day of week
    const dowCounts: { [dow: string]: number } = {};
    // Favorite board
    const boardCounts: { [type: string]: number } = {};
    // Most sessions in a month
    const monthCounts: { [month: string]: number } = {};
    // Earliest/latest month
    let earliestMonth: string | null = null, latestMonth: string | null = null;
    // Most common condition
    const condCounts: { [cond: string]: number } = {};
    // Unique spots
    const spotSet = new Set<string>();
    data.forEach(session => {
      // Duration
      const start = session.startTime ? new Date(session.startTime) : null;
      const end = session.endTime ? new Date(session.endTime).getTime() : null;
      const duration = start && end !== null ? Math.max(0, (end - start.getTime()) / 60000) : 0;
      totalMinutes += duration;
      // First session
      if (!firstSession || (typeof session.startTime === 'string' && typeof firstSession.startTime === 'string' && new Date(session.startTime) < new Date(firstSession.startTime))) firstSession = session;
      // Most sessions in a day
      const dayKey = start ? start.toISOString().slice(0, 10) : '';
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
      // Earliest/latest session time
      const mins = start ? start.getHours() * 60 + start.getMinutes() : 0;
      if (mins < earliest) earliest = mins;
      if (mins > latest) latest = mins;
      // Popular day of week
      const dow = start ? start.toLocaleDateString(undefined, { weekday: 'long' }) : '';
      dowCounts[dow] = (dowCounts[dow] || 0) + 1;
      // Favorite board
      const board = session.board?.type;
      if (board) boardCounts[board] = (boardCounts[board] || 0) + 1;
      // Most sessions in a month
      const monthKey = start ? `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}` : '';
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      // Earliest/latest month
      const isoDate = session.startTime ? session.startTime : '';
      if (isoDate && (!earliestMonth || isoDate < earliestMonth)) earliestMonth = isoDate;
      if (isoDate && (!latestMonth || isoDate > latestMonth)) latestMonth = isoDate;
      // Most common condition
      let cond = '';
      if (session.conditions && typeof session.conditions === 'object') {
        if ('condition' in session.conditions && typeof (session.conditions as any).condition === 'string') {
          cond = (session.conditions as any).condition;
        } else if ('weather' in session.conditions && typeof (session.conditions as any).weather === 'object' && typeof (session.conditions as any).weather.condition === 'string') {
          cond = (session.conditions as any).weather.condition;
        }
      }
      if (cond) condCounts[cond] = (condCounts[cond] || 0) + 1;
      // Unique spots
      if (session.spotId) spotSet.add(session.spotId);
    });
    // Most sessions in a day
    let mostSessionsDay = 0, mostSessionsDayDate = '';
    Object.entries(dayCounts).forEach(([date, count]) => {
      if (count > mostSessionsDay) {
        mostSessionsDay = count;
        mostSessionsDayDate = date;
      }
    });
    // Popular day of week
    const popularDay = Object.entries(dowCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    // Favorite board
    const favoriteBoard = Object.entries(boardCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    // Most sessions in a month
    let mostSessionsMonth = 0, mostSessionsMonthLabel = '';
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > mostSessionsMonth) {
        mostSessionsMonth = count;
        const [y, m] = month.split('-');
        mostSessionsMonthLabel = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
      }
    });
    // Earliest/latest month
    const earliestMonthLabel = earliestMonth ? formatDateString(earliestMonth) : '';
    const latestMonthLabel = latestMonth ? formatDateString(latestMonth) : '';
    // Most common condition
    const commonCondition = Object.entries(condCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    setFunFacts({
      totalHours: Math.round(totalMinutes / 60),
      firstSession: firstSession && typeof (firstSession as any).startTime === 'string' && typeof (firstSession as any).spotId === 'string' ? `${formatDateString((firstSession as any).startTime)} at ${(firstSession as any).spotId}` : '',
      mostSessionsDay,
      mostSessionsDayDate: mostSessionsDayDate || '',
      earliestTime: earliest !== 24 * 60 ? `${String(Math.floor(earliest / 60)).padStart(2, '0')}:${String(earliest % 60).padStart(2, '0')}` : '',
      latestTime: latest !== 0 ? `${String(Math.floor(latest / 60)).padStart(2, '0')}:${String(latest % 60).padStart(2, '0')}` : '',
      popularDay,
      favoriteBoard,
      mostSessionsMonth,
      mostSessionsMonthLabel,
      earliestMonth: earliestMonthLabel,
      latestMonth: latestMonthLabel,
      commonCondition,
      uniqueSpots: spotSet.size,
    });
  }

  // Helper: Convert ISO week string (YYYY-Www) to date range string (e.g., 'Jul 7 – Jul 13, 2025')
  function getWeekDateRange(isoWeek: string): string {
    const [yearStr, weekStr] = isoWeek.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    // Find the first day of the week (Monday)
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const monday = new Date(simple);
    if (dow <= 4) {
      monday.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      monday.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const format = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
    return `${format(monday)} – ${format(sunday)}, ${year}`;
  }

  function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  // Helper to get the date label for 13 days ago
  function getStreakStartDateLabel() {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }

  // Helper to format time in 12-hour format
  function formatTime12h(time: string) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Helper to robustly format a date string as 'Jul 8, 2025'
  function formatDateString(dateStr: string | undefined) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Surf Session Dashboard</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalHours}</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.averageSessionLength}</Text>
            <Text style={styles.statLabel}>Avg. Minutes</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.longestSession}</Text>
            <Text style={styles.statLabel}>Longest (min)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.favoriteSpot || '-'}</Text>
            <Text style={styles.statLabel}>Favorite Spot</Text>
          </View>
        </View>
        {/* Mini Stat Cards */}
        <View style={styles.miniStatsRow}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Best Month</Text>
            <Text style={styles.miniStatValue}>{stats.bestMonth}</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Most Active Week</Text>
            <Text style={styles.miniStatValue}>{stats.mostActiveWeekRange}</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Longest Streak</Text>
            <Text style={styles.miniStatValue}>{stats.longestStreak} days</Text>
          </View>
        </View>
        {/* Trends Over Time */}
        <View style={styles.trendSection}>
          <Text style={styles.trendTitle}>Trends Over Time</Text>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Sessions ({trend.thisMonth} vs {trend.lastMonth}): </Text>
            <Text style={styles.trendValue}>{trend.thisMonthSessions} vs {trend.lastMonthSessions} </Text>
            <MaterialIcons name={trend.sessionUp ? 'arrow-upward' : 'arrow-downward'} size={18} color={trend.sessionUp ? COLORS.success : COLORS.error} />
            <Text style={[styles.trendPercent, { color: trend.sessionUp ? COLORS.success : COLORS.error }]}> {trend.sessionChange}%</Text>
          </View>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Avg. Duration (min): </Text>
            <Text style={styles.trendValue}>{trend.thisMonthAvg} vs {trend.lastMonthAvg} </Text>
            <MaterialIcons name={trend.avgDurationUp ? 'arrow-upward' : 'arrow-downward'} size={18} color={trend.avgDurationUp ? COLORS.success : COLORS.error} />
            <Text style={[styles.trendPercent, { color: trend.avgDurationUp ? COLORS.success : COLORS.error }]}> {trend.avgDurationChange}%</Text>
          </View>
        </View>
        {/* Personal Bests & Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>Personal Bests & Achievements</Text>
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}><Ionicons name="timer-outline" size={28} color={COLORS.primary} /></View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementLabel}>Longest Session</Text>
              <Text style={styles.achievementValue}>{personalBests.longestSession.duration ? `${Math.floor(personalBests.longestSession.duration / 60)}h ${personalBests.longestSession.duration % 60}m` : '-'} on {personalBests.longestSession.date} at {personalBests.longestSession.spot}</Text>
            </View>
            {personalBests.longestSession.isNew && <View style={styles.recordBadge}><Text style={styles.recordBadgeText}>🏆 New Record!</Text></View>}
          </View>
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}><Ionicons name="calendar-outline" size={28} color={COLORS.primary} /></View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementLabel}>Most Sessions in a Week</Text>
              <Text style={styles.achievementValue}>{personalBests.mostSessionsWeek.count} ({personalBests.mostSessionsWeek.range})</Text>
            </View>
            {personalBests.mostSessionsWeek.isNew && <View style={styles.recordBadge}><Text style={styles.recordBadgeText}>🏆 New Record!</Text></View>}
          </View>
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}><Ionicons name="calendar" size={28} color={COLORS.primary} /></View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementLabel}>Most Sessions in a Month</Text>
              <Text style={styles.achievementValue}>{personalBests.mostSessionsMonth.count} ({personalBests.mostSessionsMonth.month})</Text>
            </View>
            {personalBests.mostSessionsMonth.isNew && <View style={styles.recordBadge}><Text style={styles.recordBadgeText}>🏆 New Record!</Text></View>}
          </View>
        </View>
        {/* Surf Spot Analytics */}
        <View style={styles.spotAnalyticsSection}>
          <Text style={styles.spotAnalyticsTitle}>Surf Spot Analytics</Text>
          {spotAnalytics.length > 0 ? (
            spotAnalytics.map((item, idx) => (
              <View key={item.spot} style={styles.spotRow}>
                {idx === 0 && <Ionicons name="star" size={18} color={COLORS.secondary} style={{ marginRight: 4 }} />}
                <Text style={[styles.spotName, idx === 0 && styles.topSpot]}>{item.spot}</Text>
                <Text style={styles.spotPercent}>{item.percent}%</Text>
                <Text style={styles.spotCount}>({item.count} session{item.count > 1 ? 's' : ''}, {Math.round(item.totalMinutes)} min)</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No surf spot data yet.</Text>
          )}
        </View>
        {/* Streaks & Consistency */}
        <View style={styles.streaksSection}>
          <Text style={styles.streaksTitle}>Streaks & Consistency</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Current Streak:</Text>
            <Text style={styles.streakValue}>{streaks.current} days</Text>
            {streaks.current > 0 && <Ionicons name="flame" size={18} color={COLORS.secondary} style={{ marginLeft: 4 }} />}
          </View>
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>Longest Streak:</Text>
            <Text style={styles.streakValue}>{streaks.longest} days</Text>
            {streaks.milestone > 0 && <View style={styles.streakBadge}><Text style={styles.streakBadgeText}>{streaks.milestone}-day Streak!</Text></View>}
          </View>
          <View style={styles.streakDotsRow}>
            <View style={styles.streakDotRowInner}>
              {streaks.streakDays.map((active, idx) => (
                <View key={idx} style={styles.streakDotCell}>
                  <View style={[styles.streakDot, { backgroundColor: active ? COLORS.secondary : COLORS.lightGray }]} />
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.streakLegend}>
            Last 14 days: <Text style={{ color: COLORS.secondary }}>●</Text> = surfed
          </Text>
        </View>
        {/* Session Quality Analytics */}
        <View style={styles.qualitySection}>
          <Text style={styles.qualityTitle}>Session Quality Analytics</Text>
          <View style={styles.qualityRow}>
            <Ionicons name="star" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.qualityLabel}>Avg. Rating:</Text>
            <Text style={styles.qualityValue}>{qualityStats.avgRating !== null ? qualityStats.avgRating : '-'}</Text>
          </View>
          <View style={styles.qualityRow}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.qualityLabel}>Best Session:</Text>
            <Text style={styles.qualityValue}>
              {qualityStats.bestSession ? `${new Date(qualityStats.bestSession.startTime).toLocaleDateString()} at ${qualityStats.bestSession.spotId} (${qualityStats.bestRating})` : '-'}
            </Text>
          </View>
          <View style={styles.qualityRow}>
            <Ionicons name="navigate" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.qualityLabel}>Most Common Wind:</Text>
            <Text style={styles.qualityValue}>{qualityStats.commonWind || '-'}</Text>
          </View>
          <View style={styles.qualityRow}>
            <Ionicons name="partly-sunny-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.qualityLabel}>Most Common Weather:</Text>
            <Text style={styles.qualityValue}>{qualityStats.commonWeather || '-'}</Text>
          </View>
        </View>
        {/* Fun Facts */}
        <View style={styles.funFactsSection}>
          <Text style={styles.funFactsTitle}>Fun Facts</Text>
          <View style={styles.funFactRow}><Ionicons name="time-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Total Hours Surfed:</Text><Text style={styles.funFactValue}>{funFacts.totalHours}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="calendar-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>First Session Logged:</Text><Text style={styles.funFactValue}>{funFacts.firstSession || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="repeat" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Most Sessions in a Day:</Text><Text style={styles.funFactValue}>{funFacts.mostSessionsDayDate ? formatDateString(funFacts.mostSessionsDayDate) : '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="alarm-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Earliest Session Time:</Text><Text style={styles.funFactValue}>{formatTime12h(funFacts.earliestTime) || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="moon-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Latest Session Time:</Text><Text style={styles.funFactValue}>{formatTime12h(funFacts.latestTime) || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="calendar" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Most Popular Day:</Text><Text style={styles.funFactValue}>{funFacts.popularDay || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="bicycle-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Favorite Board:</Text><Text style={styles.funFactValue}>{funFacts.favoriteBoard || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="calendar" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Most Sessions in a Month:</Text><Text style={styles.funFactValue}>{funFacts.mostSessionsMonthLabel || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="calendar" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Earliest Month Surfed:</Text><Text style={styles.funFactValue}>{funFacts.earliestMonth || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="calendar" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Latest Month Surfed:</Text><Text style={styles.funFactValue}>{funFacts.latestMonth || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="water-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Most Common Condition:</Text><Text style={styles.funFactValue}>{funFacts.commonCondition || '-'}</Text></View>
          <View style={styles.funFactRow}><Ionicons name="location-outline" size={18} color={COLORS.secondary} style={{ marginRight: 6 }} /><Text style={styles.funFactLabel}>Total Spots Surfed:</Text><Text style={styles.funFactValue}>{funFacts.uniqueSpots}</Text></View>
        </View>
        {/* Session History */}
        <Text style={styles.sectionTitle}>Session History</Text>
        {Object.keys(sessionsByMonth).length > 0 ? (
          Object.entries(sessionsByMonth).map(([month, monthSessions]) => (
            <View key={month} style={styles.monthGroup}>
              <Text style={styles.monthLabel}>{month}</Text>
              {monthSessions.map((session, idx) => (
                <View key={session.id || idx} style={styles.sessionItem}>
                  <Text style={styles.sessionText}>{new Date(session.startTime).toLocaleDateString()} - {session.spotId} - {session.board?.type || ''}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No sessions logged yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 8, backgroundColor: COLORS.background },
  backButton: { padding: 8, marginRight: 8 },
  container: { padding: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center', padding: 8, backgroundColor: COLORS.white, borderRadius: 8, marginHorizontal: 4, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.text.secondary },
  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  miniStatCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.secondary, borderRadius: 8, marginHorizontal: 4, padding: 10 },
  miniStatLabel: { fontSize: 12, color: COLORS.white, marginBottom: 2 },
  miniStatValue: { fontSize: 16, color: COLORS.white, fontWeight: 'bold' },
  trendSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  trendTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  trendLabel: { fontSize: 14, color: COLORS.text.primary },
  trendValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: 'bold', marginLeft: 4 },
  trendPercent: { fontSize: 14, fontWeight: 'bold', marginLeft: 2 },
  achievementsSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  achievementsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12 },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f8fc', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  achievementIcon: { marginRight: 12 },
  achievementContent: { flex: 1 },
  achievementLabel: { fontSize: 14, color: COLORS.text.primary, fontWeight: '600', marginBottom: 2 },
  achievementValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: 'bold' },
  recordBadge: { backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  recordBadgeText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 24, marginBottom: 8 },
  monthGroup: { marginBottom: 12 },
  monthLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  sessionItem: { padding: 10, backgroundColor: COLORS.white, borderRadius: 8, marginBottom: 8, elevation: 1 },
  sessionText: { color: COLORS.text.primary },
  emptyText: { color: COLORS.text.secondary, textAlign: 'center', marginVertical: 16 },
  spotAnalyticsSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  spotAnalyticsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  spotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  spotName: { fontSize: 14, color: COLORS.text.primary, marginRight: 8 },
  topSpot: { fontWeight: 'bold', color: COLORS.secondary },
  spotPercent: { fontSize: 14, color: COLORS.text.primary, marginRight: 4 },
  spotCount: { fontSize: 14, color: COLORS.text.secondary },
  streaksSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  streaksTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  streakLabel: { fontSize: 14, color: COLORS.text.primary },
  streakValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: 'bold', marginLeft: 4 },
  streakBadge: { backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  streakBadgeText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },
  streakDotsRow: { flexDirection: 'row', marginTop: 8 },
  streakDot: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 2 },
  streakDotCell: { width: 16, alignItems: 'center' },
  streakDotLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  streakDotMarker: { fontSize: 10, color: COLORS.text.secondary },
  streakDotRowInner: { flexDirection: 'row' },
  streakLegend: { fontSize: 11, color: COLORS.text.secondary, marginTop: 4, textAlign: 'left', alignSelf: 'flex-start' },
  qualitySection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  qualityTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qualityLabel: { fontSize: 14, color: COLORS.text.primary, marginRight: 4 },
  qualityValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: 'bold' },
  funFactsSection: { backgroundColor: COLORS.white, borderRadius: 8, padding: 14, marginBottom: 16, elevation: 1 },
  funFactsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  funFactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  funFactLabel: { fontSize: 14, color: COLORS.text.primary, marginRight: 4 },
  funFactValue: { fontSize: 14, color: COLORS.text.primary, fontWeight: 'bold' },
});

export default StatsDashboardScreen; 