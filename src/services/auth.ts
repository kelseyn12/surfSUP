// auth.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuth } from '../config/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { User } from '../types';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 8;
const STORAGE_KEY = 'auth-storage';

const validatePasswordStrength = (password: string): boolean => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= PASSWORD_MIN_LENGTH && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

const convertFirebaseUser = (firebaseUser: FirebaseAuthTypes.User): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || '',
    profileImageUrl: firebaseUser.photoURL || '',
    createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).toISOString() : new Date().toISOString(),
  };
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
  initializeAuth: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<void>;
  clearError: () => void;
  updateLastActivity: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initializeAuth: () => {
        console.log('Initializing Firebase auth listener...');

        const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken();
            const user = convertFirebaseUser(firebaseUser);
            set({
              user,
              token: idToken,
              isAuthenticated: true,
              lastActivity: Date.now(),
            });
          } else {
            set(initialState);
          }
        });

        return unsubscribe;
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
          const user = convertFirebaseUser(userCredential.user);
          const idToken = await userCredential.user.getIdToken();

          set({
            user,
            token: idToken,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: Date.now(),
            loginAttempts: 0,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            loginAttempts: get().loginAttempts + 1,
            lastLoginAttempt: Date.now(),
          });
        }
      },

      register: async (email, password, name) => {
        try {
          set({ isLoading: true, error: null });

          if (!validatePasswordStrength(password)) {
            throw new Error('Password does not meet security requirements');
          }

          const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
          await userCredential.user.updateProfile({ displayName: name });

          const user = convertFirebaseUser(userCredential.user);
          const idToken = await userCredential.user.getIdToken();

          set({
            user,
            token: idToken,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: Date.now(),
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
        }
      },

      updateUserProfile: async (updates) => {
        try {
          const currentUser = firebaseAuth.currentUser;
          if (!currentUser) throw new Error('No authenticated user');

          const profileUpdates: any = {};
          if (updates.name) profileUpdates.displayName = updates.name;
          if (updates.profileImageUrl) profileUpdates.photoURL = updates.profileImageUrl;

          await currentUser.updateProfile(profileUpdates);
          
          // Get the current user state to preserve existing data
          const currentState = get();
          if (!currentState.user) throw new Error('No user data available');
          
          const updatedUser: User = {
            ...currentState.user,
            ...updates,
            // Update Firebase-specific fields
            name: updates.name || currentState.user.name,
            profileImageUrl: updates.profileImageUrl || currentState.user.profileImageUrl,
          };
          
          set({ user: updatedUser });
        } catch (error: any) {
          set({ error: error.message || 'Profile update failed' });
        }
      },

      logout: async () => {
        try {
          await firebaseAuth.signOut();
          set(initialState);
        } catch (error: any) {
          set({ error: error.message || 'Logout failed' });
        }
      },

      refreshAuthToken: async () => {
        try {
          const currentUser = firebaseAuth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken(true);
            set({ token: idToken, lastActivity: Date.now() });
          }
        } catch (error: any) {
          set({ error: error.message || 'Token refresh failed' });
        }
      },

      clearError: () => set({ error: null }),
      updateLastActivity: () => set({ lastActivity: Date.now() }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage as any),
    }
  )
);