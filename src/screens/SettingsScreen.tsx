import React, { useCallback } from 'react';
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
import { COLORS } from '../constants';
import { useAuthStore } from '../services/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'Settings'>['navigation']>();
  const { logout } = useAuthStore();
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  const [privacyMode, setPrivacyMode] = React.useState('friends'); // 'public', 'friends', 'private'

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      if (Platform.OS === 'android') {
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
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
  }, []);

  const handleDarkModeToggle = useCallback((value: boolean) => {
    setDarkModeEnabled(value);
    Alert.alert(
      "Dark Mode",
      value ? "Dark mode enabled! This is a placeholder - full implementation would change app theme." : "Dark mode disabled.",
      [{ text: "OK" }]
    );
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
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={COLORS.white}
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
            onValueChange={setLocationEnabled}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={COLORS.white}
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
            value={darkModeEnabled}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={COLORS.white}
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
              color={privacyMode === 'friends' ? COLORS.primary : COLORS.gray} 
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Friends Only</Text>
              <Text style={styles.privacyOptionDescription}>Only your friends can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'friends' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
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
              color={privacyMode === 'public' ? COLORS.primary : COLORS.gray} 
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Public</Text>
              <Text style={styles.privacyOptionDescription}>Everyone can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'public' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
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
              color={privacyMode === 'private' ? COLORS.primary : COLORS.gray} 
            />
            <View style={styles.privacyOptionTexts}>
              <Text style={styles.privacyOptionTitle}>Private</Text>
              <Text style={styles.privacyOptionDescription}>No one can see your activity</Text>
            </View>
          </View>
          {privacyMode === 'private' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
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
        <TouchableOpacity>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.link}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
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
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
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
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    marginVertical: 4,
  },
});

export default SettingsScreen; 