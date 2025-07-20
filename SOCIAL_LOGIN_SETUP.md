# Social Login Setup Guide

This guide explains how to configure Google and Apple Sign-In for the SurfSUP app.

## Google Sign-In Setup

### 1. Firebase Console Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication > Sign-in method
4. Enable Google as a sign-in provider
5. Add your authorized domains

### 2. Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client IDs for:
   - Web application (for Expo development)
   - iOS application (for iOS builds)

### 3. Environment Variables
Add these to your `.env` file:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
```

## Apple Sign-In Setup

### 1. Apple Developer Console
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Go to Certificates, Identifiers & Profiles
3. Create a new App ID with Sign In with Apple capability
4. Create a Services ID for your app

### 2. Environment Variables
Add this to your `.env` file:
```
EXPO_PUBLIC_APPLE_CLIENT_ID=com.kelseyn12.surfSUP
```

## iOS Configuration

### 1. Info.plist Updates
Add these to your `ios/surfSUP/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>surfSUP</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>surfSUP</string>
    </array>
  </dict>
</array>
```

### 2. GoogleService-Info.plist
Make sure your `GoogleService-Info.plist` is properly configured with the Google Sign-In client ID.

## Android Configuration

### 1. google-services.json
Make sure your `google-services.json` is properly configured with the Google Sign-In client ID.

### 2. AndroidManifest.xml
The Google Sign-In plugin should handle the necessary configuration automatically.

## Testing

1. **Google Sign-In**: Test on both iOS and Android devices
2. **Apple Sign-In**: Test on iOS devices (Apple Sign-In is iOS-only)
3. **Error Handling**: Test various error scenarios (cancelled, network issues, etc.)

## Troubleshooting

### Common Issues:
1. **"Google Play Services not available"**: Ensure Google Play Services is installed on Android
2. **"Sign-in was cancelled"**: User cancelled the sign-in flow
3. **"Apple Sign-In not available"**: Apple Sign-In only works on iOS devices
4. **Firebase configuration errors**: Ensure Firebase is properly configured

### Debug Steps:
1. Check console logs for detailed error messages
2. Verify environment variables are correctly set
3. Ensure Firebase project is properly configured
4. Test on physical devices (not just simulators) 