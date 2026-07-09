import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAO4AGI2fK1ly-4Tlr1G0YYTI7-jx_5oCE",
  authDomain: "keyholder-phase3.firebaseapp.com",
  databaseURL: "https://keyholder-phase3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keyholder-phase3",
  storageBucket: "keyholder-phase3.firebasestorage.app",
  messagingSenderId: "413276678459",
  appId: "1:413276678459:web:7f8186991558563de5af1e"
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
