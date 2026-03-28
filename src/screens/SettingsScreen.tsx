import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../components';
import { useAuthStore } from '../services/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { updateUserSettings, getUserSettings } from '../services/storage';
import { useTheme } from '../contexts/ThemeContext';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'Settings'>['navigation']>();
  const { logout } = useAuthStore();
  const { isDark, toggleDark, colors } = useTheme();
  const styles = makeStyles(colors);

  // Settings state — persisted to AsyncStorage
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);
  const [privacyMode, setPrivacyMode] = React.useState('friends');

  // Load persisted settings on mount
  useEffect(() => {
    getUserSettings().then(settings => {
      if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled);
      if (settings.locationEnabled !== undefined) setLocationEnabled(settings.locationEnabled);
      if (settings.privacyMode !== undefined) setPrivacyMode(settings.privacyMode);
    }).catch(() => {});
  }, []);

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      if (Platform.OS === 'android') {
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
      }
    }, [navigation])
  );

  const handleLogout = useCallback(async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'AuthScreen' }],
              });
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to log out. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  }, [logout, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const togglePrivacyMode = useCallback((mode: string) => {
    setPrivacyMode(mode);
    updateUserSettings('privacyMode', mode).catch(() => {});
  }, []);

  const handleNotificationsToggle = useCallback((value: boolean) => {
    setNotificationsEnabled(value);
    updateUserSettings('notificationsEnabled', value).catch(() => {});
  }, []);

  const handleLocationToggle = useCallback((value: boolean) => {
    setLocationEnabled(value);
    updateUserSettings('locationEnabled', value).catch(() => {});
  }, []);


  return (
    <ScrollView style={styles.container}>
      <HeaderBar 
        title="Settings" 
        onBackPress={handleBack}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>Receive alerts about wave conditions and friends&apos; check-ins</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Location Services</Text>
            <Text style={styles.settingDescription}>Allow the app to use your location for nearby spots</Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Switch between light and dark themes</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleDark}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        
        <TouchableOpacity 
          style={styles.privacyOption}
          onPress={() => togglePrivacyMode('friends')}
        >
          <View style={styles.privacyOptionContent}>
            <Ionicons 
              name="people" 
              size={24} 
              color={privacyMode === 'friends' ? colors.primary : colors.gray}
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Friends Only</Text>
              <Text style={styles.privacyOptionDescription}>Only your friends can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'friends' && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.privacyOption}
          onPress={() => togglePrivacyMode('public')}
        >
          <View style={styles.privacyOptionContent}>
            <Ionicons
              name="globe"
              size={24}
              color={privacyMode === 'public' ? colors.primary : colors.gray}
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Public</Text>
              <Text style={styles.privacyOptionDescription}>Everyone can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'public' && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.privacyOption}
          onPress={() => togglePrivacyMode('private')}
        >
          <View style={styles.privacyOptionContent}>
            <Ionicons
              name="lock-closed"
              size={24}
              color={privacyMode === 'private' ? colors.primary : colors.gray}
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Private</Text>
              <Text style={styles.privacyOptionDescription}>No one can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'private' && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]}
          onPress={handleLogout}
        >
          <Text style={styles.dangerButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>SurfSUP v1.0.0</Text>
        <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be available at launch.')}>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Terms of service will be available at launch.')}>
          <Text style={styles.link}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  privacyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyOptionTexts: {
    marginLeft: 16,
  },
  privacyOptionTitle: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    marginVertical: 4,
  },
});

export default SettingsScreen; 