import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import SpotDetailsScreen from '../screens/SpotDetailsScreen';
import LogSessionScreen from '../screens/LogSessionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionDetailsScreen from '../screens/SessionDetailsScreen';
import AuthScreen from '../screens/AuthScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PasswordResetSuccessScreen from '../screens/PasswordResetSuccessScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { RootStackParamList, MainTabParamList } from './types';
import OnBoardingScreen from '../screens/OnBoardingScreen';
import { isOnboardingComplete } from '../services/storage';
import StatsDashboardScreen from '../screens/StatsDashboardScreen';

// Enable screens for better performance
enableScreens(true);

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = 'home' | 'home-outline' | 'map' | 'map-outline' | 'heart' | 'heart-outline' | 'person' | 'person-outline';

const getTabIconName = (routeName: keyof MainTabParamList, focused: boolean): TabIconName => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Map':
      return focused ? 'map' : 'map-outline';
    case 'Favorites':
      return focused ? 'heart' : 'heart-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'home';
  }
};

// Bottom tab navigator — reads colors from ThemeContext
const MainTabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: keyof MainTabParamList } }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.lightGray,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          const iconName = getTabIconName(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main stack navigator
const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef();
  const { isAuthenticated, initializeAuth } = useAuthStore();
  const { isDark, colors } = useTheme();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const completed = await isOnboardingComplete();
      const shouldShowOnboarding = !completed && !isAuthenticated;
      setHasCompletedOnboarding(!shouldShowOnboarding);
    };
    checkOnboardingStatus();
  }, [isAuthenticated]);

  // Initialize Firebase auth state listener
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  // Handle navigation when auth state changes
  useEffect(() => {
    if (hasCompletedOnboarding !== null && navigationRef.current) {
      if (isAuthenticated && hasCompletedOnboarding) {
        navigationRef.current.navigate('Main' as any);
      } else if (!isAuthenticated) {
        navigationRef.current.navigate('AuthScreen');
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigationRef]);

  // Show loading state while checking onboarding status
  if (hasCompletedOnboarding === null) {
    return null;
  }

  // Build a nav theme that tracks the app's dark mode setting
  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, primary: colors.primary, card: colors.white, text: colors.text.primary, border: colors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary, card: colors.white, text: colors.text.primary, border: colors.border } };

  return (
    <NavigationContainer
      theme={navTheme}
      ref={navigationRef}
    >
      <Stack.Navigator
        initialRouteName={hasCompletedOnboarding ? (isAuthenticated ? 'Main' : 'AuthScreen') : 'OnBoarding'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        {!hasCompletedOnboarding && (
          <Stack.Screen
            name="OnBoarding"
            component={OnBoardingScreen}
            options={{ headerShown: false }}
          />
        )}
        <Stack.Screen name="AuthScreen" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
        <Stack.Screen name="LogSession" component={LogSessionScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PasswordResetSuccess" component={PasswordResetSuccessScreen} />
        <Stack.Screen name="StatsDashboard" component={StatsDashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
