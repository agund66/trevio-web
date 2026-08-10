// Firebase Messaging background service worker.
// Uses importScripts with the compat CDN build so it works as a classic
// service worker (Firebase registers it without { type: "module" }).
// ES module imports would require explicit module registration which
// isn't supported on older browsers (Safari < 16.4, Firefox < 115).
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBKjbeAcIzhdahO8Jo1lHydO9VORxz3vn4",
  authDomain: "trevio-split.firebaseapp.com",
  projectId: "trevio-split",
  storageBucket: "trevio-split.firebasestorage.app",
  messagingSenderId: "17273127103",
  appId: "1:17273127103:web:e02c470aaa0dee5159060a",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Trevio", {
    body: body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
});
