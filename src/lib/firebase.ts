import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBKjbeAcIzhdahO8Jo1lHydO9VORxz3vn4",
  authDomain: "trevio-split.firebaseapp.com",
  projectId: "trevio-split",
  storageBucket: "trevio-split.firebasestorage.app",
  messagingSenderId: "17273127103",
  appId: "1:17273127103:web:e02c470aaa0dee5159060a",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

const useEmulator = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  console.log("[Trevio] Connected to Firebase Emulator Suite");
}
