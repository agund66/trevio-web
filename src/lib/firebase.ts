import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBKjbeAcIzhdahO8Jo1lHydO9VORxz3vn4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "trevio-split.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "trevio-split",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "trevio-split.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "17273127103",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:17273127103:web:e02c470aaa0dee5159060a",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence (IndexedDB) so cached data remains accessible
// and writes queue when the browser loses connectivity.
// initializeFirestore must be called before getFirestore and only once.
// In Next.js dev mode with HMR, the module may re-evaluate, so we guard
// against double-initialization with a try/catch fallback to getFirestore.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ cacheSizeBytes: 50 * 1024 * 1024 }),
  });
} catch {
  // Already initialized (HMR) — fall back to the existing instance.
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

export let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {});
