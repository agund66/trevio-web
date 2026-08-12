"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, AlertCircle, Camera, Loader2 } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (rawValue: string) => void;
}

export function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const t = useTranslations("common");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const startScanner = async () => {
      try {
        setStarting(true);
        setError(null);

        // Feature detection: some older browsers and non-HTTPS contexts
        // don't support navigator.mediaDevices.getUserMedia.
        if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("NotSupported");
        }

        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (result && !cancelled) {
              const text = result.getText();
              if (text) {
                controls.stop();
                onScanRef.current(text);
              }
            }
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setStarting(false);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          let friendlyError: string;

          if (message.includes("Permission") || message.includes("NotAllowed")) {
            friendlyError = "Camera permission denied. Please allow camera access in your browser settings to scan QR codes.";
          } else if (message.includes("NotFound") || message.includes("DevicesNotFoundError")) {
            friendlyError = "No camera found on this device. Try entering the invite code manually instead.";
          } else if (message.includes("NotReadable") || message.includes("TrackStartError")) {
            friendlyError = "Camera is already in use by another app. Close it and try again.";
          } else if (message.includes("NotSupported") || message.includes("TypeError")) {
            friendlyError = "QR scanning is not supported in this browser. Try entering the invite code manually.";
          } else if (
            typeof window !== "undefined" &&
            window.location.protocol !== "https:" &&
            window.location.hostname !== "localhost"
          ) {
            friendlyError = "Camera access requires HTTPS. Try entering the invite code manually instead.";
          } else {
            friendlyError = t('cameraFailed');
          }

          setError(friendlyError);
          setStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={() => !starting && onClose()} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
              <Camera className="h-4.5 w-4.5 text-trevio-600 dark:text-trevio-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('scanQrCode')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-square bg-slate-900">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />

          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm">{t('startingCamera')}</p>
            </div>
          )}

          {!starting && !error && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-48 w-48 rounded-2xl border-2 border-white/70 shadow-lg" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/80">
                {t('pointAtQr')}
              </p>
            </>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-white">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                {t('actions.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
