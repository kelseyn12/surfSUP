import {
  formatWaveHeight,
  formatWaveHeightRange,
  formatWindSpeed,
  formatWindDirection,
  formatWind,
  formatTideHeight,
  formatTemperature,
  formatDuration,
  formatShortDate,
  formatDurationShort,
  formatRelativeTime,
  formatDate,
  formatTime,
  formatDateTime,
  formatRatingStars,
  describeSurfConditions,
} from './formatters';
import type { SurfConditions } from '../types';

describe('Formatter Utilities', () => {
  describe('formatWaveHeight', () => {
    it('should format wave height with units', () => {
      expect(formatWaveHeight(3.5, 'ft')).toBe('3.5 ft');
      expect(formatWaveHeight(2.0, 'm')).toBe('2.0 m');
    });

    it('should format wave height without units when showUnit is false', () => {
      expect(formatWaveHeight(3.5, 'ft', false)).toBe('3.5');
      expect(formatWaveHeight(2.0, 'm', false)).toBe('2.0');
    });

    it('should handle zero values', () => {
      expect(formatWaveHeight(0, 'ft')).toBe('0.0 ft');
    });
  });

  describe('formatWaveHeightRange', () => {
    it('should format wave height range', () => {
      expect(formatWaveHeightRange(2.5, 3.5, 'ft')).toBe('2.5-3.5 ft');
      expect(formatWaveHeightRange(1.5, 2.0, 'm')).toBe('1.5-2.0 m');
    });
  });

  describe('formatWindSpeed', () => {
    it('should format wind speed with appropriate units', () => {
      expect(formatWindSpeed(15, 'mph')).toBe('15 mph');
      expect(formatWindSpeed(13, 'kts')).toBe('13 kts');
      expect(formatWindSpeed(24, 'kph')).toBe('24 kph');
    });

    it('should round decimal values', () => {
      expect(formatWindSpeed(15.7, 'mph')).toBe('16 mph');
      expect(formatWindSpeed(13.2, 'kts')).toBe('13 kts');
    });
  });

  describe('formatWindDirection', () => {
    it('should convert degrees to cardinal directions', () => {
      expect(formatWindDirection(0)).toBe('N');
      expect(formatWindDirection(45)).toBe('NE');
      expect(formatWindDirection(90)).toBe('E');
      expect(formatWindDirection(135)).toBe('SE');
      expect(formatWindDirection(180)).toBe('S');
      expect(formatWindDirection(225)).toBe('SW');
      expect(formatWindDirection(270)).toBe('W');
      expect(formatWindDirection(315)).toBe('NW');
      expect(formatWindDirection(360)).toBe('N');
    });
  });

  describe('formatWind', () => {
    it('should combine wind speed and direction', () => {
      expect(formatWind(15, 0, 'mph')).toBe('15 mph N');
      expect(formatWind(20, 90, 'kph')).toBe('20 kph E');
    });
  });

  describe('formatTideHeight', () => {
    it('should format tide height with appropriate units', () => {
      expect(formatTideHeight(3.5, 'ft')).toBe('3.5 ft');
      expect(formatTideHeight(1.2, 'm')).toBe('1.2 m');
    });
  });

  describe('formatTemperature', () => {
    it('should format temperature with appropriate units', () => {
      expect(formatTemperature(75, 'F')).toBe('75°F');
      expect(formatTemperature(24, 'C')).toBe('24°C');
    });

    it('should round decimal values', () => {
      expect(formatTemperature(75.6, 'F')).toBe('76°F');
      expect(formatTemperature(24.3, 'C')).toBe('24°C');
    });

    it('should return N/A for null or undefined', () => {
      expect(formatTemperature(null)).toBe('N/A');
      expect(formatTemperature(undefined)).toBe('N/A');
    });

    it('should return N/A for a temperature of exactly 0 (treated as no data)', () => {
      // This documents existing behavior: 0 is indistinguishable from "no reading"
      // in this function. If that's ever surprising for a real 0°F day, it's a
      // deliberate design choice, not an accident — change this test if it changes.
      expect(formatTemperature(0, 'F')).toBe('N/A');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(45)).toBe('45 minutes');
      expect(formatDuration(1)).toBe('1 minute');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(65)).toBe('1 hour 5 minutes');
      expect(formatDuration(121)).toBe('2 hours 1 minute');
    });

    it('should format hours only when minutes are zero', () => {
      expect(formatDuration(60)).toBe('1 hour');
      expect(formatDuration(120)).toBe('2 hours');
    });
  });

  describe('formatDurationShort', () => {
    it('should format minutes only', () => {
      expect(formatDurationShort(45)).toBe('45m');
    });

    it('should format hours only when minutes are zero', () => {
      expect(formatDurationShort(120)).toBe('2h');
    });

    it('should format hours and minutes together', () => {
      expect(formatDurationShort(150)).toBe('2h 30m');
    });
  });

  describe('formatShortDate', () => {
    it('should format a date string as "Mon D, YYYY"', () => {
      expect(formatShortDate('2026-01-15T12:00:00Z')).toBe('Jan 15, 2026');
    });

    it('should format a Date object the same way', () => {
      expect(formatShortDate(new Date('2026-07-04T12:00:00Z'))).toBe('Jul 4, 2026');
    });
  });

  describe('formatRelativeTime', () => {
    const NOW = new Date('2026-06-23T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should say "just now" for under a minute ago', () => {
      const thirtySecondsAgo = new Date(NOW.getTime() - 30 * 1000);
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
    });

    it('should singularize "1 minute ago"', () => {
      const oneMinuteAgo = new Date(NOW.getTime() - 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should pluralize minutes', () => {
      const fiveMinutesAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('should report hours ago', () => {
      const threeHoursAgo = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should report days ago for under a week', () => {
      const twoDaysAgo = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should fall back to an actual date for a week or more ago', () => {
      const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      // 10 days before 2026-06-23 is 2026-06-13, same year as "now" -> no year shown
      expect(formatRelativeTime(tenDaysAgo)).toBe('Jun 13');
    });
  });

  describe('formatDate', () => {
    const sample = '2026-03-05T12:00:00Z';

    it('should format "short" as numeric month/day', () => {
      expect(formatDate(sample, 'short')).toBe('3/5');
    });

    it('should format "medium" as abbreviated month + day (default)', () => {
      expect(formatDate(sample)).toBe('Mar 5');
      expect(formatDate(sample, 'medium')).toBe('Mar 5');
    });

    it('should format "long" with weekday and year', () => {
      expect(formatDate(sample, 'long')).toBe('Thu, Mar 5, 2026');
    });

    it('should accept custom Intl.DateTimeFormatOptions', () => {
      expect(formatDate(sample, { year: 'numeric' })).toBe('2026');
    });
  });

  describe('formatTime', () => {
    it('should format time without seconds by default', () => {
      // 12:00 UTC formatted in en-US 12-hour time without seconds
      expect(formatTime('2026-01-01T12:00:00Z')).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
    });

    it('should include seconds when requested', () => {
      expect(formatTime('2026-01-01T12:00:00Z', true)).toMatch(/^\d{1,2}:\d{2}:\d{2}\s?[AP]M$/);
    });
  });

  describe('formatDateTime', () => {
    it('should combine formatDate and formatTime with "at"', () => {
      const result = formatDateTime('2026-03-05T12:00:00Z');
      expect(result).toContain('Mar 5');
      expect(result).toContain(' at ');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?[AP]M$/);
    });
  });

  describe('formatRatingStars', () => {
    it('should render full stars only for a whole-number rating', () => {
      expect(formatRatingStars(3, 5)).toBe('★★★☆☆');
    });

    it('should floor a fractional rating down to whole stars', () => {
      expect(formatRatingStars(3.7, 5)).toBe('★★★☆');
    });

    it('should default maxRating to 5', () => {
      expect(formatRatingStars(2)).toBe('★★☆☆☆');
    });

    it('should render all full stars for a perfect rating', () => {
      expect(formatRatingStars(5, 5)).toBe('★★★★★');
    });
  });

  describe('describeSurfConditions', () => {
    const baseConditions: SurfConditions = {
      spotId: 'stoneypoint',
      timestamp: '2026-06-23T12:00:00Z',
      waveHeight: { min: 2, max: 3, unit: 'ft' },
      wind: { speed: 12, direction: 'NE', unit: 'mph' },
      swell: { height: 2.5, period: 5 },
    } as SurfConditions;

    it('should label rating 8+ as Excellent', () => {
      const result = describeSurfConditions({ ...baseConditions, rating: 9 } as SurfConditions);
      expect(result).toContain('Excellent conditions');
      expect(result).toContain('2.0-3.0 ft waves');
      expect(result).toContain('12 mph NE winds');
    });

    it('should label rating 6-7 as Good', () => {
      const result = describeSurfConditions({ ...baseConditions, rating: 6 } as SurfConditions);
      expect(result).toContain('Good conditions');
    });

    it('should label rating 4-5 as Fair', () => {
      const result = describeSurfConditions({ ...baseConditions, rating: 4 } as SurfConditions);
      expect(result).toContain('Fair conditions');
    });

    it('should label rating under 4 as Poor', () => {
      const result = describeSurfConditions({ ...baseConditions, rating: 1 } as SurfConditions);
      expect(result).toContain('Poor conditions');
    });
  });
});