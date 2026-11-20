import { Platform } from 'react-native';
if (Platform.OS === 'web') require('./src/web/alerts');
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);
// App entry point. Audio is handled by expo-audio (see src/store/player.ts)
// and the car session by the modules/car-auto module.
import 'expo-router/entry';
