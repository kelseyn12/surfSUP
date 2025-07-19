import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { COLORS } from '../constants';
import { HeaderBar } from '../components';
import { Ionicons } from '@expo/vector-icons';

const PasswordResetSuccessScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'PasswordResetSuccess'>['navigation']>();

  const handleBackToLogin = () => {
    navigation.navigate('AuthScreen');
  };

  return (
    <ScrollView style={styles.container}>
      <HeaderBar 
        title="Password Reset"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={COLORS.primary} />
        </View>
        
        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.message}>
          We've sent you a password reset link. Please check your email and follow the instructions to reset your password.
        </Text>
        
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips:</Text>
          <Text style={styles.tip}>• Check your spam/junk folder</Text>
          <Text style={styles.tip}>• The email may take a few minutes to arrive</Text>
          <Text style={styles.tip}>• Make sure you entered the correct email address</Text>
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleBackToLogin}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.resendButtonText}>Didn't receive the email? Try again</Text>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default PasswordResetSuccessScreen; 