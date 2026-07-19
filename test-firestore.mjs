import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    console.log("Setting doc...");
    await setDoc(doc(db, "test", "test"), { timestamp: Date.now() });
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
