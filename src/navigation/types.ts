import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SurfSpot } from '../types';

// Main stack navigator params
export type RootStackParamList = {
  AuthScreen: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  SpotDetails: { spotId: string; spot?: SurfSpot };
  CheckIn: { spotId: string; spot?: SurfSpot };
  SessionLog: { spotId: string; spot?: SurfSpot };
  LogSession: { spotId: string; spot?: SurfSpot };
  SessionDetails: { sessionId: string };
  Settings: undefined;
  OnBoarding: undefined;
  Debug: undefined;
  ForgotPassword: undefined;
};

// Bottom tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// Screen props for Root Stack
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

// Screen props for Main Tab
export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Helper type for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 