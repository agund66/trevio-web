"use client";

import { useEffect, useRef, useState } from "react";
import { messagingReady } from "@/lib/firebase";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { getToken, onMessage, type Messaging } from "firebase/messaging";

/**
 * Listens for foreground FCM messages and displays them as Notifications.
 * This hook does NOT request notification permission — it only acts on
 * messages that arrive while the tab is open, and only if permission was
 * already granted (e.g. via `useNotificationPermission` on the notifications page).
 *
 * Keep this in the main layout so it's always active.
 */
export function useFcmNotifications() {
  const { user } = useAuth();
  const { user: userService } = useServices();
  const tokenRegisteredRef = useRef(false);
  const [messagingInstance, setMessagingInstance] = useState<Messaging | null>(null);

  // Wait for messaging to be initialized asynchronously
  useEffect(() => {
    let cancelled = false;
    messagingReady.then((m) => {
      if (!cancelled) setMessagingInstance(m);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user || !messagingInstance) return;
    // iOS Safari (non-PWA) and older browsers don't support the Notification API.
    if (typeof Notification === "undefined") return;

    // Reset the token registration flag when the user changes (e.g. login/logout),
    // so a new user session can register its own FCM token.
    tokenRegisteredRef.current = false;

    // If permission was already granted (e.g. from a previous session),
    // register the FCM token. We do NOT request permission here.
    if (Notification.permission === "granted" && !tokenRegisteredRef.current) {
      tokenRegisteredRef.current = true;
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      getToken(messagingInstance, { vapidKey })
        .then((token) => {
          if (token) userService.updateFcmToken(token).catch(() => {});
        })
        .catch(() => {});
    }

    const unsubscribe = onMessage(messagingInstance, (payload) => {
      if (payload.notification && Notification.permission === "granted") {
        try {
          new Notification(payload.notification.title || "Trevio", {
            body: payload.notification.body || "",
            icon: "/icon-192.png",
          });
        } catch {
          // Some browsers (e.g. iOS Safari non-PWA) may throw even if
          // Notification.permission reports "granted". Silently skip.
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, userService, messagingInstance]);
}

/**
 * Lazily requests notification permission and registers the FCM token.
 * Call this from the notifications page (or a user-triggered action),
 * NOT from the main layout — so the browser prompt only appears when
 * the user actively engages with the notifications feature.
 */
export function useNotificationPermission() {
  const { user } = useAuth();
  const { user: userService } = useServices();
  const [messagingInstance, setMessagingInstance] = useState<Messaging | null>(null);

  // Wait for messaging to be initialized asynchronously
  useEffect(() => {
    let cancelled = false;
    messagingReady.then((m) => {
      if (!cancelled) setMessagingInstance(m);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user || !messagingInstance) return;
    if (typeof Notification === "undefined") return;

    // Only request if not already decided.
    if (Notification.permission !== "default") return;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[Trevio] FCM VAPID key not configured. Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in env.");
      return;
    }

    const requestPermissionAndToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messagingInstance, { vapidKey });
        if (token) {
          await userService.updateFcmToken(token);
        }
      } catch (err) {
        console.warn("[Trevio] FCM token error:", err);
      }
    };

    requestPermissionAndToken();
  }, [user, userService, messagingInstance]);
}
