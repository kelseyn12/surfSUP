import { 
  calculateWaveScore,
  calculateWindScore,
  calculatePeriodScore,
  calculateSwellHeightScore,
  getConditionLabel,
  isDaylightHours
} from './conditionCalculators';
import { WAVE_HEIGHT, WIND } from '../constants';

describe('Condition Calculator Utilities', () => {
  describe('calculateWaveScore', () => {
    it('should calculate proper score for flat conditions', () => {
      const score = calculateWaveScore(0, 0.3);
      expect(score).toBe(2);
    });

    it('should calculate proper score for small waves', () => {
      const score = calculateWaveScore(1, 1.5);
      // Using toBeGreaterThan since the exact value depends on the WAVE_HEIGHT constants
      expect(score).toBeGreaterThan(5);
      expect(score).toBeLessThan(7);
    });

    it('should calculate proper score for medium waves', () => {
      const score = calculateWaveScore(2.5, 3.5);
      expect(score).toBeGreaterThan(7);
      expect(score).toBeLessThan(9);
    });

    it('should calculate proper score for large waves', () => {
      const score = calculateWaveScore(4.5, 5.5);
      expect(score).toBe(8);
    });

    it('should calculate proper score for epic waves', () => {
      const score = calculateWaveScore(7, 9);
      expect(score).toBe(9);
    });

    it('should calculate proper score for huge waves', () => {
      const score = calculateWaveScore(12, 15);
      expect(score).toBe(5);
    });
  });

  describe('calculateWindScore', () => {
    it('should calculate high score for light offshore winds', () => {
      const score = calculateWindScore(5, WIND.OFFSHORE.direction);
      expect(score).toBe(10);
    });

    it('should calculate moderate score for moderate offshore winds', () => {
      const score = calculateWindScore(10, WIND.OFFSHORE.direction);
      expect(score).toBe(9);
    });

    it('should calculate lower score for strong offshore winds', () => {
      const score = calculateWindScore(20, WIND.OFFSHORE.direction);
      expect(score).toBe(7);
    });

    it('should calculate moderate score for cross-shore winds', () => {
      const score = calculateWindScore(5, WIND.CROSS_SHORE.direction);
      expect(score).toBe(7);
    });

    it('should calculate low score for onshore winds', () => {
      const score = calculateWindScore(5, WIND.ONSHORE.direction);
      expect(score).toBe(4);
    });

    it('should calculate very low score for strong onshore winds', () => {
      const score = calculateWindScore(20, WIND.ONSHORE.direction);
      expect(score).toBe(1);
    });
  });

  describe('calculatePeriodScore', () => {
    it('should return low score for short period swells', () => {
      expect(calculatePeriodScore(5)).toBe(3);
    });

    it('should return moderate score for medium period swells', () => {
      expect(calculatePeriodScore(7)).toBe(5);
    });

    it('should return good score for longer period swells', () => {
      expect(calculatePeriodScore(9)).toBe(7);
    });

    it('should return excellent score for very long period swells', () => {
      expect(calculatePeriodScore(11)).toBe(9);
    });

    it('should return perfect score for extremely long period swells', () => {
      expect(calculatePeriodScore(13)).toBe(10);
    });
  });

  describe('calculateSwellHeightScore', () => {
    it('should return appropriate scores for different swell heights', () => {
      expect(calculateSwellHeightScore(0.5)).toBe(3);
      expect(calculateSwellHeightScore(1.5)).toBe(5);
      expect(calculateSwellHeightScore(2.5)).toBe(7);
      expect(calculateSwellHeightScore(4)).toBe(9);
      expect(calculateSwellHeightScore(6)).toBe(10);
      expect(calculateSwellHeightScore(10)).toBe(8);
    });
  });

  describe('getConditionLabel', () => {
    it('should return appropriate labels for different ratings', () => {
      expect(getConditionLabel(1)).toBe('Poor');
      expect(getConditionLabel(3)).toBe('Fair');
      expect(getConditionLabel(5)).toBe('Good');
      expect(getConditionLabel(7)).toBe('Great');
      expect(getConditionLabel(9)).toBe('Epic');
    });
  });

  describe('isDaylightHours', () => {
    it('should return true for daytime hours', () => {
      // Create a date at noon
      const noonDate = new Date();
      noonDate.setHours(12, 0, 0, 0);
      expect(isDaylightHours(noonDate, 34.0, -118.0)).toBe(true);
    });

    it('should return false for nighttime hours', () => {
      // Create a date at midnight
      const midnightDate = new Date();
      midnightDate.setHours(3, 0, 0, 0);
      expect(isDaylightHours(midnightDate, 34.0, -118.0)).toBe(false);
    });
  });
}); 