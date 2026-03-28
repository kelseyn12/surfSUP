/**
 * Spot photo service — image picker + Firebase Storage upload.
 *
 * To activate:
 *   1. npx expo install expo-image-picker @react-native-firebase/storage
 *   2. Set PHOTO_UPLOAD_ENABLED = true below
 *   3. Add to app.json plugins: ["expo-image-picker"]
 *
 * Until installed all public functions are safe no-ops that return null.
 */

const PHOTO_UPLOAD_ENABLED = true;

let ImagePicker: any = null;
let storage: any = null;

if (PHOTO_UPLOAD_ENABLED) {
  try {
    ImagePicker = require('expo-image-picker');
  } catch {
    console.warn('[PhotoService] expo-image-picker not installed');
  }
  try {
    storage = require('@react-native-firebase/storage').default;
  } catch {
    console.warn('[PhotoService] @react-native-firebase/storage not installed');
  }
}

/**
 * Opens the device image picker and returns the local URI, or null if
 * the user cancelled or the feature is disabled.
 */
export const pickSpotPhoto = async (): Promise<string | null> => {
  if (!ImagePicker) return null;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[PhotoService] Media library permission denied');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
};

/**
 * Uploads a local image URI to Firebase Storage and returns the public
 * download URL, or null if upload fails or the feature is disabled.
 *
 * Storage path: spotPhotos/{spotId}/{userId}_{timestamp}.jpg
 */
export const uploadSpotPhoto = async (
  spotId: string,
  userId: string,
  localUri: string
): Promise<string | null> => {
  if (!storage) return null;

  const timestamp = Date.now();
  const path = `spotPhotos/${spotId}/${userId}_${timestamp}.jpg`;

  try {
    const ref = storage().ref(path);
    await ref.putFile(localUri);
    const url: string = await ref.getDownloadURL();
    return url;
  } catch (error) {
    console.error('[PhotoService] Upload failed:', error);
    return null;
  }
};

/** Returns true when both packages are installed and the feature is active. */
export const isPhotoUploadAvailable = (): boolean =>
  PHOTO_UPLOAD_ENABLED && ImagePicker !== null && storage !== null;
