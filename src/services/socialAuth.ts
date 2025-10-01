import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

export interface SocialAuthResult {
  success: boolean;
  user?: any;
  userData?: {
    name?: string;
  };
  error?: string;
}

export class SocialAuthService {
  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices();
      
      // Get the users ID token
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(tokens.idToken);
      
      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      
      let errorMessage = 'Google sign-in failed';
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services not available';
      } else if (error.code === 'SIGN_IN_REQUIRED') {
        errorMessage = 'Sign-in required';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sign in with Apple
   */
  static async signInWithApple(): Promise<SocialAuthResult> {
    try {
      // Check if we're on iOS (Apple Sign-In only works on iOS)
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'Apple Sign-In is only available on iOS devices',
        };
      }

      console.log('Starting Apple Sign-In process...');

      // Check if Apple Sign-In is available on this device
      const isAvailable = await appleAuth.isSupported;
      console.log('Apple Sign-In supported:', isAvailable);
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device',
        };
      }

      // Generate a random nonce for Apple Sign-In
      const nonce = Crypto.randomUUID();
      console.log('Generated nonce:', nonce);

      // Request Apple Sign-In
      console.log('Requesting Apple Sign-In...');
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        nonce: nonce,
      });

      console.log('Apple Sign-In response received:', !!appleAuthRequestResponse);

      // Ensure Apple returned a user identityToken
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identify token returned');
      }

      console.log('Identity token received, creating Firebase credential...');

      // Create a credential with the Apple ID token
      const { identityToken } = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(appleCredential);
      
      console.log('Firebase sign-in successful');
      
      // If we got the user's name from Apple, update the Firebase user profile
      if (appleAuthRequestResponse.fullName?.givenName || appleAuthRequestResponse.fullName?.familyName) {
        const fullName = `${appleAuthRequestResponse.fullName?.givenName || ''} ${appleAuthRequestResponse.fullName?.familyName || ''}`.trim();
        if (fullName) {
          await userCredential.user.updateProfile({
            displayName: fullName,
          });
          console.log('Updated user profile with name:', fullName);
        }
      }
      
      return {
        success: true,
        user: userCredential.user,
        userData: {
          name: appleAuthRequestResponse.fullName ? 
            `${appleAuthRequestResponse.fullName?.givenName || ''} ${appleAuthRequestResponse.fullName?.familyName || ''}`.trim() : 
            undefined,
        },
      };
    } catch (error: any) {
      console.error('Apple Sign-In Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Apple sign-in failed';
      
      if (error.code === appleAuth.Error.CANCELED) {
        errorMessage = 'Apple sign-in was cancelled';
      } else if (error.code === appleAuth.Error.INVALID_RESPONSE) {
        errorMessage = 'Invalid response from Apple';
      } else if (error.message?.includes('cancelled')) {
        errorMessage = 'Apple sign-in was cancelled';
      } else if (error.code === 1000) {
        errorMessage = 'Apple Sign-In configuration error - check Apple Developer Console';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
} 