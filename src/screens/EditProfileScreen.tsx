import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
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
import type { User } from '../types';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'EditProfile'>['navigation']>();
  const { user, updateUserProfile } = useAuthStore();
  
  // Form state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || '');
  const [preferredBoard, setPreferredBoard] = useState(user?.preferences?.preferredBoard || 'shortboard');
  const [units, setUnits] = useState(user?.preferences?.units || 'imperial');
  const [homeSpot, setHomeSpot] = useState(user?.preferences?.homeSpot || '');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updates: Partial<User> = {
        name: name.trim(),
        username: username.trim() || undefined,
        profileImageUrl: profileImageUrl.trim() || undefined,
        preferences: {
          ...user?.preferences,
          preferredBoard: preferredBoard as any,
          units: units as any,
          homeSpot: homeSpot.trim() || undefined,
        }
      };

      await updateUserProfile(updates);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [name, username, profileImageUrl, preferredBoard, units, homeSpot, user?.preferences, updateUserProfile, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const boardOptions = [
    { value: 'shortboard', label: 'Shortboard' },
    { value: 'longboard', label: 'Longboard' },
    { value: 'fish', label: 'Fish' },
    { value: 'funboard', label: 'Funboard' },
    { value: 'sup', label: 'SUP' },
    { value: 'other', label: 'Other' },
  ];

  const unitOptions = [
    { value: 'imperial', label: 'Imperial (ft, mph)' },
    { value: 'metric', label: 'Metric (m, km/h)' },
  ];

  return (
    <ScrollView style={styles.container}>
      <HeaderBar 
        title="Edit Profile" 
        onBackPress={handleBack}
        rightComponent={
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={[styles.saveButtonText, isLoading && styles.saveButtonTextDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        
        <View style={styles.profileImageSection}>
          <Image 
            source={{ uri: profileImageUrl || 'https://via.placeholder.com/150' }} 
            style={styles.profileImage} 
          />
          <TouchableOpacity 
            style={styles.changeImageButton}
            onPress={() => Alert.alert('Change Photo', 'Photo upload feature coming soon!')}
          >
            <Text style={styles.changeImageText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.text.secondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.textInput}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username (optional)"
            placeholderTextColor={COLORS.text.secondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Profile Image URL</Text>
          <TextInput
            style={styles.textInput}
            value={profileImageUrl}
            onChangeText={setProfileImageUrl}
            placeholder="Enter image URL (optional)"
            placeholderTextColor={COLORS.text.secondary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Surfing Preferences</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Board</Text>
          <View style={styles.optionsContainer}>
            {boardOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  preferredBoard === option.value && styles.optionButtonSelected
                ]}
                onPress={() => setPreferredBoard(option.value as any)}
              >
                <Text style={[
                  styles.optionButtonText,
                  preferredBoard === option.value && styles.optionButtonTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Units</Text>
          <View style={styles.optionsContainer}>
            {unitOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  units === option.value && styles.optionButtonSelected
                ]}
                onPress={() => setUnits(option.value as any)}
              >
                <Text style={[
                  styles.optionButtonText,
                  units === option.value && styles.optionButtonTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Home Spot</Text>
          <TextInput
            style={styles.textInput}
            value={homeSpot}
            onChangeText={setHomeSpot}
            placeholder="Enter your home surf spot (optional)"
            placeholderTextColor={COLORS.text.secondary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text.primary,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  changeImageButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  changeImageText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  optionButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: COLORS.lightGray,
  },
});

export default EditProfileScreen; 