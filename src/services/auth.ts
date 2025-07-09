import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { User } from '../types';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const PASSWORD_MIN_LENGTH = 8;
const STORAGE_KEY = 'auth-storage';

// Password validation
const validatePasswordStrength = (password: string): boolean => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= PASSWORD_MIN_LENGTH && 
         hasUpperCase && hasLowerCase && 
         hasNumbers && hasSpecialChar;
};

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: Date.now(),
  loginAttempts: 0,
  lastLoginAttempt: 0,
};

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
  loginAttempts: number;
  lastLoginAttempt: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<void>;
  clearError: () => void;
  updateLastActivity: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        try {
          const { loginAttempts, lastLoginAttempt } = get();
          const now = Date.now();

          // Check rate limiting
          if (loginAttempts >= MAX_LOGIN_ATTEMPTS && 
              now - lastLoginAttempt < LOGIN_ATTEMPT_WINDOW) {
            throw new Error('Too many login attempts. Please try again later.');
          }

          set({ isLoading: true, error: null });
          
          // For development, simulate a successful login
          const mockUser: User = {
            id: 'user-' + Date.now(),
            email,
            name: email.split('@')[0],
            username: email.split('@')[0].toLowerCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              favoriteSpots: [],
              units: 'imperial',
              notifications: true,
              privacyMode: 'friends'
            },
            stats: {
              totalSessions: 0,
              averageSessionLength: 0,
              startDate: new Date().toISOString()
            }
          };

          set({
            user: mockUser,
            token: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            isAuthenticated: true,
            isLoading: false,
            lastActivity: now,
            loginAttempts: 0,
            lastLoginAttempt: now,
            error: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set((state) => ({
            ...state,
            error: errorMessage,
            isLoading: false,
            loginAttempts: state.loginAttempts + 1,
            lastLoginAttempt: Date.now(),
          }));
        }
      },

      register: async (email: string, password: string, name: string) => {
        try {
          if (!validatePasswordStrength(password)) {
            throw new Error(
              'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters'
            );
          }

          set({ isLoading: true, error: null });
          
          // Simulate registration
          const mockUser: User = {
            id: 'user-' + Date.now(),
            email,
            name,
            username: email.split('@')[0].toLowerCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              favoriteSpots: [],
              units: 'imperial',
              notifications: true,
              privacyMode: 'friends'
            },
            stats: {
              totalSessions: 0,
              averageSessionLength: 0,
              startDate: new Date().toISOString()
            }
          };
          
          set({
            user: mockUser,
            token: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            isAuthenticated: true,
            isLoading: false,
            lastActivity: Date.now(),
          });
        } catch (error) {
          let errorMessage = 'Registration failed';
          if (error instanceof Error) {
            if (error.message.includes('409')) {
              errorMessage = 'Email already registered';
            } else if (error.message.includes('400')) {
              errorMessage = 'Invalid registration data';
            } else if (error.message.includes('network')) {
              errorMessage = 'Network error. Please check your connection';
            }
          }
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
          });
        }
      },

      updateUserProfile: async (updates: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });
          
          // For development, update the user directly without API call
          set((state) => {
            if (!state.user) return state;
            
            const currentStats = state.user.stats || {
              totalSessions: 0,
              averageSessionLength: 0,
              startDate: new Date().toISOString()
            };
            
            return {
              ...state,
              user: {
                ...state.user,
                ...updates,
                stats: {
                  ...currentStats,
                  ...(updates.stats || {}),
                  // Ensure required fields have default values
                  totalSessions: updates.stats?.totalSessions ?? currentStats.totalSessions,
                  averageSessionLength: updates.stats?.averageSessionLength ?? currentStats.averageSessionLength,
                  startDate: updates.stats?.startDate || currentStats.startDate
                }
              },
              isLoading: false,
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update profile',
            isLoading: false,
          });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Reset to initial state
          set(initialState);
          
        } catch (error) {
          // Even if there's an error, ensure we reset the state
          set(initialState);
        }
      },

      refreshAuthToken: async () => {
        // No-op in mock mode
        set({ lastActivity: Date.now() });
      },

      clearError: () => set({ error: null }),

      updateLastActivity: () => {
        const { lastActivity } = get();
        const now = Date.now();
        
        if (now - lastActivity > SESSION_TIMEOUT) {
          get().logout();
        } else {
          set({ lastActivity: now });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage as any),
    }
  )
); 