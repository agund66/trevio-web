"use client";

import { useEffect } from "react";
import { messaging } from "@/lib/firebase";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { getToken, onMessage } from "firebase/messaging";

export function useFcmNotifications() {
  const { user } = useAuth();
  const { user: userService } = useServices();

  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermissionAndToken = async () => {
      try {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn("[Trevio] FCM VAPID key not configured. Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in env.");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging!, { vapidKey });

        if (token) {
          await userService.updateFcmToken(token);
        }
      } catch (err) {
        console.warn("[Trevio] FCM token error:", err);
      }
    };

    requestPermissionAndToken();

    const unsubscribe = onMessage(messaging!, (payload) => {
      if (payload.notification) {
        new Notification(payload.notification.title || "Trevio", {
          body: payload.notification.body || "",
          icon: "/icon-192.png",
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, userService]);
}
