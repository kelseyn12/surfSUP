import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserSettings, updateUserSettings } from '../services/storage';

// ─── Light palette (existing app colors) ───────────────────────────────────
export const LIGHT_COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  tertiary: '#9b59b6',
  background: '#f5f5f5',
  white: '#ffffff',
  black: '#000000',
  gray: '#95a5a6',
  lightGray: '#ecf0f1',
  error: '#e74c3c',
  success: '#2ecc71',
  warning: '#f39c12',
  info: '#3498db',
  border: '#e0e0e0',
  card: '#ffffff',
  text: {
    primary: '#2c3e50',
    secondary: '#7f8c8d',
    light: '#ecf0f1',
  },
  surfConditions: {
    excellent: '#27ae60',
    good: '#2ecc71',
    fair: '#f39c12',
    poor: '#e74c3c',
  },
  transparent: 'transparent',
} as const;

// ─── Dark palette ───────────────────────────────────────────────────────────
export const DARK_COLORS = {
  primary: '#5dade2',
  secondary: '#58d68d',
  tertiary: '#af7ac5',
  background: '#121212',
  white: '#1e1e1e',
  black: '#f0f0f0',
  gray: '#7f8c8d',
  lightGray: '#2c2c2c',
  error: '#e74c3c',
  success: '#58d68d',
  warning: '#f39c12',
  info: '#5dade2',
  border: '#333333',
  card: '#1e1e1e',
  text: {
    primary: '#ecf0f1',
    secondary: '#95a5a6',
    light: '#2c3e50',
  },
  surfConditions: {
    excellent: '#27ae60',
    good: '#2ecc71',
    fair: '#f39c12',
    poor: '#e74c3c',
  },
  transparent: 'transparent',
} as const;

export type AppColors = typeof LIGHT_COLORS;

interface ThemeContextType {
  isDark: boolean;
  colors: AppColors;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: LIGHT_COLORS,
  toggleDark: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Load persisted setting on mount
  useEffect(() => {
    getUserSettings()
      .then(settings => {
        if (settings.darkModeEnabled) setIsDark(true);
      })
      .catch(() => {});
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      updateUserSettings('darkModeEnabled', next).catch(() => {});
      return next;
    });
  }, []);

  const value: ThemeContextType = {
    isDark,
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    toggleDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
