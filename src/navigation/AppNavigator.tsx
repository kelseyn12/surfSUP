import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useAuthStore } from '../services/auth';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SpotDetailsScreen from '../screens/SpotDetailsScreen';
import LogSessionScreen from '../screens/LogSessionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionDetailsScreen from '../screens/SessionDetailsScreen';
import AuthScreen from '../screens/AuthScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { RootStackParamList, MainTabParamList } from './types';
import OnBoardingScreen from '../screens/OnBoardingScreen';
import { isOnboardingComplete } from '../services/storage';

// Enable screens for better performance
enableScreens(true);

// Create a theme with better screen transition behavior
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    primary: COLORS.primary,
  },
};

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

// Bottom tab navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: keyof MainTabParamList } }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
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
  const { isAuthenticated } = useAuthStore();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const completed = await isOnboardingComplete();
      setHasCompletedOnboarding(completed);
    };
    checkOnboardingStatus();
  }, []);

  // Show loading state while checking onboarding status
  if (hasCompletedOnboarding === null) {
    return null;
  }
  
  return (
    <NavigationContainer 
      theme={AppTheme}
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
        {hasCompletedOnboarding && !isAuthenticated && (
          <Stack.Screen name="AuthScreen" component={AuthScreen} />
        )}
        {hasCompletedOnboarding && isAuthenticated && (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
        <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
        <Stack.Screen name="LogSession" component={LogSessionScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 