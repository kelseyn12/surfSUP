/**
 * Formatters for displaying data in a user-friendly way
 */

/**
 * Format wave height with appropriate units
 * @param height Wave height in feet or meters, or minimum height if max is provided
 * @param maxOrUnit Maximum height or unit string
 * @param unitOrShowUnit Unit string or boolean to show/hide unit
 * @returns Formatted wave height string
 */
export const formatWaveHeight = (
  height: number,
  maxOrUnit?: number | 'ft' | 'm',
  unitOrShowUnit: 'ft' | 'm' | boolean = 'ft'
): string => {
  // Handle case where second parameter is the unit
  if (typeof maxOrUnit === 'string') {
    const unit = maxOrUnit;
    const showUnit = typeof unitOrShowUnit === 'boolean' ? unitOrShowUnit : true;
    return showUnit ? `${height.toFixed(1)} ${unit}` : height.toFixed(1);
  }
  
  // Handle case where second parameter is max height
  const max = maxOrUnit;
  const unit = typeof unitOrShowUnit === 'string' ? unitOrShowUnit : 'ft';
  
  if (max === undefined || height === max) {
    return `${height.toFixed(1)} ${unit}`;
  } else {
    return `${height.toFixed(1)}-${max.toFixed(1)} ${unit}`;
  }
};

/**
 * Format wave height range
 * @param min Minimum wave height
 * @param max Maximum wave height
 * @param unit Unit of measurement ('ft' or 'm')
 * @returns Formatted wave height range
 */
export const formatWaveHeightRange = (
  min: number, 
  max: number, 
  unit: 'ft' | 'm' = 'ft'
): string => {
  return formatWaveHeight(min, max, unit);
};

/**
 * Format wind speed with appropriate units
 * @param speed Wind speed
 * @param unit Unit of measurement ('mph', 'kts', or 'kph')
 * @returns Formatted wind speed string
 */
export const formatWindSpeed = (
  speed: number, 
  unit: 'mph' | 'kts' | 'kph' = 'mph'
): string => {
  return `${Math.round(speed)} ${unit}`;
};

/**
 * Format wind direction from degrees to cardinal direction
 * @param degrees Wind direction in degrees
 * @returns Cardinal direction (N, NE, E, etc.)
 */
export const formatWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Format combined wind information
 * @param speed Wind speed
 * @param direction Wind direction (can be degrees or cardinal)
 * @param unit Unit of measurement ('mph', 'kts', or 'kph')
 * @returns Formatted wind string (e.g., "15 mph NW")
 */
export const formatWind = (
  speed: number, 
  direction: string | number, 
  unit: 'mph' | 'kts' | 'kph' = 'mph'
): string => {
  const directionStr = typeof direction === 'number' 
    ? formatWindDirection(direction) 
    : direction;
  return `${formatWindSpeed(speed, unit)} ${directionStr}`;
};

/**
 * Format tide height with appropriate units
 * @param height Tide height
 * @param unit Unit of measurement ('ft' or 'm')
 * @returns Formatted tide height string
 */
export const formatTideHeight = (
  height: number, 
  unit: 'ft' | 'm' = 'ft'
): string => {
  return `${height.toFixed(1)} ${unit}`;
};

/**
 * Format temperature with appropriate units
 * @param temp Temperature
 * @param unit Unit of measurement ('F' or 'C')
 * @returns Formatted temperature string
 */
export const formatTemperature = (
  temp: number, 
  unit: 'F' | 'C' = 'F'
): string => {
  return `${Math.round(temp)}°${unit}`;
};

/**
 * Format date as relative time (e.g., "5 minutes ago")
 * @param date Date string or Date object
 * @returns Relative time string
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const pastDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - pastDate.getTime();
  
  // Convert milliseconds to different time units
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    // For dates older than a week, display the actual date
    return pastDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== pastDate.getFullYear() ? 'numeric' : undefined,
    });
  }
};

/**
 * Format a date for display
 * @param date Date string or Date object
 * @param format Format type ('short', 'medium', 'long', 'time')
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date,
  options: Intl.DateTimeFormatOptions | 'short' | 'medium' | 'long' | 'time' = 'medium'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (typeof options === 'string') {
    switch (options) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      case 'medium':
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'long':
        return dateObj.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      case 'time':
        return dateObj.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      default:
        return dateObj.toLocaleString();
    }
  } else {
    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
  }
};

/**
 * Format a time to a readable string
 * @param date Date to format
 * @param includeSeconds Whether to include seconds
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string,
  includeSeconds = false
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(dateObj);
};

/**
 * Formats a date and time to a readable string
 * @param date Date to format
 * @param includeSeconds Whether to include seconds
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string,
  includeSeconds = false
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(dateObj)} at ${formatTime(dateObj, includeSeconds)}`;
};

/**
 * Format duration in minutes to a human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted duration string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    }
  }
};

import { SurfConditions } from '../types';

/**
 * Format rating as stars (e.g., "★★★☆☆")
 * @param rating Rating value
 * @param maxRating Maximum rating value
 * @returns String of filled and empty stars
 */
export const formatRatingStars = (
  rating: number,
  maxRating: number = 5
): string => {
  const fullStars = Math.floor(rating);
  const emptyStars = Math.floor(maxRating - rating);
  
  return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
};

/**
 * Generate a text description of surf conditions
 * @param conditions The surf conditions
 * @returns Text description of conditions
 */
export const describeSurfConditions = (conditions: SurfConditions): string => {
  const waveDesc = formatWaveHeight(conditions.waveHeight.min, conditions.waveHeight.max, conditions.waveHeight.unit);
  const windDesc = formatWind(conditions.wind.speed, conditions.wind.direction, conditions.wind.unit);
  
  let quality = '';
  if (conditions.rating >= 8) quality = 'Excellent';
  else if (conditions.rating >= 6) quality = 'Good';
  else if (conditions.rating >= 4) quality = 'Fair';
  else quality = 'Poor';
  
  return `${quality} conditions with ${waveDesc} waves and ${windDesc} winds.`;
}; 