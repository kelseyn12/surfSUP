import {
  formatWaveHeight,
  formatWaveHeightRange,
  formatWindSpeed,
  formatWindDirection,
  formatWind,
  formatTideHeight,
  formatTemperature,
  formatDuration
} from './formatters';

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
}); 