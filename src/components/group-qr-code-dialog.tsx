"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
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
    navigator.clipboard.writeText(inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${groupName}" on Trevio`,
          text: `You've been invited to join "${groupName}" on Trevio. Tap to join and start splitting bills!`,
          url: joinUrl,
        });
      } catch { /* user cancelled share */ }
    } else {
      navigator.clipboard.writeText(joinUrl).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Group QR Code</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center">
          <p className="text-sm text-slate-500 mb-1">Scan to join</p>
          <p className="text-base font-semibold text-slate-900 mb-4 text-center">{groupName}</p>

          <div className="rounded-2xl border-2 border-slate-100 p-4 bg-white">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2">
            <span className="text-sm font-mono font-semibold tracking-wider text-slate-700">{inviteCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-trevio-600 transition"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 space-y-2">
          <button
            onClick={handleShareLink}
            className="w-full rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {shared ? "Link Copied!" : "Share Invite Link"}
          </button>
          <button
            onClick={handleDownload}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
