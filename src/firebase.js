import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =========================================================================
// Save location to Firebase
// =========================================================================
export async function saveLocationToFirebase(deviceName, locationData) {
  try {
    const locationRef = ref(db, `locations/${deviceName}`);
    await set(locationRef, {
      lat: locationData.lat,
      lon: locationData.lon,
      accuracy: locationData.accuracy,
      timestamp: new Date().toISOString(),
      lastUpdated: Date.now(),
    });
    console.log('Location saved to Firebase');
    return true;
  } catch (error) {
    console.error('Firebase save error:', error);
    return false;
  }
}

// =========================================================================
// Load last saved location from Firebase
// =========================================================================
export async function loadLocationFromFirebase(deviceName) {
  try {
    const locationRef = ref(db, `locations/${deviceName}`);
    const snapshot = await get(locationRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Firebase load error:', error);
    return null;
  }
}
