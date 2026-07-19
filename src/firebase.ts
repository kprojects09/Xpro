import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration parsed from firebase-applet-config.json
const firebaseConfig = {
  projectId: "sweetyai-5343d",
  appId: "1:934325615371:web:8a9e8f71d91cd6f7048a8f",
  apiKey: "AIzaSyAhSJg67BBDqjOKZGAleNc9D5unumPzeRo",
  authDomain: "sweetyai-5343d.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "sweetyai-5343d.firebasestorage.app",
  messagingSenderId: "934325615371"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
export default app;
