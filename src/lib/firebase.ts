import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

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
