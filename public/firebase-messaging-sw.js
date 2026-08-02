import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: "AIzaSyBKjbeAcIzhdahO8Jo1lHydO9VORxz3vn4",
  authDomain: "trevio-split.firebaseapp.com",
  projectId: "trevio-split",
  storageBucket: "trevio-split.firebasestorage.app",
  messagingSenderId: "17273127103",
  appId: "1:17273127103:web:e02c470aaa0dee5159060a",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Trevio", {
    body: body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
});
