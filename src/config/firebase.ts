// firebase.ts

import { getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

console.log('✅ Firebase modules loaded');

export const firebaseAuth = auth(getApp());
