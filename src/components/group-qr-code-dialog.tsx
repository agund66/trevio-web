"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { AnimatedDialog } from "./animated-dialog";
import { X, Download, Share2, Copy, Check } from "lucide-react";

interface GroupQrCodeDialogProps {
  open: boolean;
  onClose: () => void;
  groupName: string;
  inviteCode: string;
}

export function GroupQrCodeDialog({ open, onClose, groupName, inviteCode }: GroupQrCodeDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations("common");

  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${inviteCode}`;

  useEffect(() => {
    if (!open || !inviteCode) {
      setQrDataUrl("");
      setCopied(false);
      setShared(false);
      return;
    }

    const generateQr = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);

        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, joinUrl, {
            width: 256,
            margin: 2,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
        }
      } catch (err) {
        console.error("Failed to generate QR code:", err);
      }
    };

    generateQr();
  }, [open, inviteCode, joinUrl]);

  if (!open) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareInviteTitle', { groupName }),
          text: t('shareInviteText', { groupName }),
          url: joinUrl,
        });
      } catch { /* user cancelled share */ }
    } else {
      navigator.clipboard?.writeText(joinUrl).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }).catch(() => {});
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `trevio-${inviteCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatedDialog open={open} onClose={onClose} maxWidth="max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('groupQrCode')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('scanToJoin')}</p>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 text-center">{groupName}</p>

          <div className="rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-4 bg-white">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2">
            <span className="text-sm font-mono font-semibold tracking-wider text-slate-700 dark:text-slate-300">{inviteCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 dark:text-slate-500 hover:text-trevio-600 dark:hover:text-trevio-400 transition"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-2">
          <button
            onClick={handleShareLink}
            className="w-full rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {shared ? t('linkCopied') : t('shareInviteLink')}
          </button>
          <button
            onClick={handleDownload}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('downloadQr')}
          </button>
        </div>
    </AnimatedDialog>
  );
}
