"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toPng, toBlob } from "html-to-image";
import { AnimatedDialog } from "./animated-dialog";
import { GroupSummaryCard, useQrDataUrl } from "./group-summary-card";
import { X, Download, Copy, Check, Loader2, MessageCircle } from "lucide-react";
import type { Member, SimplifiedDebt, MemberContribution, Expense } from "@/lib/types";
import type { GroupInfo } from "@/lib/services/interfaces/group-service";
import { computeMemberContributions } from "@/lib/utils/household-analytics";

const CARD_WIDTH = 1080;

/**
 * Pre-processes all <img> elements inside the capture node to prevent
 * canvas tainting (SecurityError) when html-to-image draws them.
 *
 * Cross-origin images (e.g. Google avatars from lh3.googleusercontent.com)
 * loaded WITHOUT crossOrigin="anonymous" taint the canvas, causing
 * toDataURL()/toBlob() to throw.
 *
 * Strategy: for each <img> with a non-data-URL src, try to convert it to
 * a same-origin data URL by loading it with crossOrigin="anonymous" and
 * drawing to canvas. If that fails (CORS unsupported, blocked by shields,
 * network error), REPLACE the img's src with an empty data URL so
 * html-to-image skips it entirely (a broken/empty image won't taint the
 * canvas). The visual placeholder is handled by the card's CSS background.
 *
 * After capture, call the returned cleanup function to restore originals.
 */
async function prepareImagesForCapture(node: HTMLElement): Promise<() => void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  const restores: (() => void)[] = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      // Skip data URLs (already same-origin, safe for canvas)
      if (!src || src.startsWith("data:")) return;

      // Try to load the image with CORS and convert to data URL
      try {
        const dataUrl = await loadImageAsDataUrl(src);
        const originalSrc = img.src;
        img.src = dataUrl;
        await img.decode().catch(() => {});
        restores.push(() => { img.src = originalSrc; });
        return;
      } catch {
        // CORS load failed — fall through to safe placeholder
      }

      // Could not convert to data URL. Replace src with an empty 1x1
      // transparent PNG data URL so html-to-image doesn't try to fetch
      // the cross-origin URL (which would taint the canvas). The img's
      // alt text + CSS background provides a visual fallback.
      const originalSrc = img.src;
      // 1x1 transparent PNG
      img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0CAAAAASUVORK5CYII=";
      // Style the img as a colored circle with initials (same as the
      // no-photo fallback in the Avatar component)
      const alt = img.alt || "?";
      const parts = alt.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
        : (parts[0]?.[0] || "?").toUpperCase();
      img.style.backgroundColor = "#E2E8F0";
      img.style.color = "#475569";
      img.style.display = "flex";
      img.style.alignItems = "center";
      img.style.justifyContent = "center";
      img.style.fontWeight = "700";
      img.style.fontSize = "12px";
      img.style.fontFamily = "system-ui, sans-serif";
      // Can't set textContent on an img, so overlay initials via a
      // pseudo-element approach: use object-fit none + a tiny SVG that
      // renders the initials text.
      const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#E2E8F0"/><text x="16" y="21" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#475569" text-anchor="middle">${initials}</text></svg>`;
      img.src = `data:image/svg+xml;base64,${btoa(svgText)}`;
      restores.push(() => {
        img.src = originalSrc;
        img.style.backgroundColor = "";
        img.style.color = "";
        img.style.display = "";
        img.style.alignItems = "";
        img.style.justifyContent = "";
        img.style.fontWeight = "";
        img.style.fontSize = "";
        img.style.fontFamily = "";
      });
    })
  );

  return () => restores.forEach((r) => r());
}

/**
 * Loads an image with crossOrigin="anonymous" and converts it to a data URL
 * by drawing it to a canvas. This produces a same-origin image that won't
 * taint the canvas when html-to-image processes it.
 *
 * Works when the image server supports CORS (Google's lh3.googleusercontent.com,
 * Firebase Storage, etc. all do). Fails fast when CORS is not supported or
 * when the request is blocked (e.g. Brave Shields).
 */
function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 32;
        canvas.height = img.naturalHeight || 32;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas context"));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

interface GroupSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  groupInfo: GroupInfo;
  members: Member[];
  debts: SimplifiedDebt[];
  formatAmount: (amount: number) => string;
  dateLabel: string;
  linkUrl: string;
  /** For Household: service to fetch all expenses (paginated) for contributor computation */
  fetchAllExpenses?: () => Promise<Expense[]>;
}

export function GroupSummaryDialog({
  open,
  onClose,
  groupInfo,
  members,
  debts,
  formatAmount,
  dateLabel,
  linkUrl,
  fetchAllExpenses,
}: GroupSummaryDialogProps) {
  const t = useTranslations("groups");
  // Ref to the inner card div inside the visible preview. We capture THIS
  // node directly (not a separate off-screen clone) and use html-to-image's
  // `style` option to override the scale transform during capture, so we
  // get the full 1080px-width image from the visible preview itself.
  const captureRef = useRef<HTMLDivElement>(null);
  // The visible preview wrapper; we measure its width to scale the preview.
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [cardHeight, setCardHeight] = useState(0);
  const qrDataUrl = useQrDataUrl(open ? linkUrl : "");

  const isHousehold = groupInfo.template === "household";
  const [householdContributions, setHouseholdContributions] = useState<MemberContribution[] | undefined>(undefined);
  const [householdTotals, setHouseholdTotals] = useState<{ totalSpent: number; totalReceived: number; netAmount: number } | undefined>(undefined);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const householdLoaded = useRef(false);

  const [generating, setGenerating] = useState(false);
  const [shared, setShared] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── "Card visible before share" requirement ──────────────────────
  // The share/download buttons are disabled until the card preview is
  // actually rendered AND the QR code has loaded (so the captured image
  // includes the QR). This ensures the user sees the full card on our
  // platform before they can share it anywhere.
  const [cardVisible, setCardVisible] = useState(false);

  const householdReady = !isHousehold || (householdContributions !== undefined && householdTotals !== undefined);
  const showLoading = householdLoading || (!householdReady && !householdError);
  const qrReady = qrDataUrl !== "";
  const canShare = cardVisible && qrReady && !showLoading && !householdError;

  // Compute a stable string key for the preview re-measure dependency so
  // the hook re-runs when the loading state changes (so the preview scales
  // correctly once content is ready).
  const previewReadyKey = showLoadingValue(isHousehold, householdLoading, householdContributions, householdTotals, householdError);

  // Measure the preview wrapper width to compute the scale factor for the
  // 1080px-wide card so it fits inside the dialog preview area. Also measure
  // the actual card height (dynamic — no fixed aspect ratio) so the preview
  // wrapper height matches the scaled card.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = previewWrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      if (w > 0) {
        const scale = w / CARD_WIDTH;
        setPreviewScale(scale);
        // Measure the actual card height from the captureRef node
        const cardEl = captureRef.current;
        if (cardEl) {
          const h = cardEl.scrollHeight;
          if (h > 0) setCardHeight(h);
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (previewWrapRef.current) ro.observe(previewWrapRef.current);
    if (captureRef.current) ro.observe(captureRef.current);
    return () => ro.disconnect();
  }, [open, previewReadyKey, qrReady]);

  // Mark the card as visible (preview rendered) once the loading state
  // clears and the card content is actually in the DOM. We use
  // requestAnimationFrame to ensure the browser has painted the preview
  // before enabling the share button — satisfying the requirement that
  // the card must be visible on our platform before sharing.
  useEffect(() => {
    if (!open || showLoading || householdError) {
      setCardVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setCardVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, showLoading, householdError]);

  const ensureHouseholdData = useCallback(async () => {
    if (!isHousehold || householdLoaded.current || !fetchAllExpenses) return;
    householdLoaded.current = true;
    setHouseholdLoading(true);
    setHouseholdError(null);
    try {
      const allExpenses = await fetchAllExpenses();
      const contributions = computeMemberContributions(allExpenses, members);
      setHouseholdContributions(contributions);
      const totalSpent = allExpenses
        .filter((e) => (e.transactionType ?? "expense") === "expense")
        .reduce((sum, e) => sum + e.amount, 0);
      const totalReceived = allExpenses
        .filter((e) => (e.transactionType ?? "expense") === "income")
        .reduce((sum, e) => sum + e.amount, 0);
      setHouseholdTotals({
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        netAmount: Math.round((totalReceived - totalSpent) * 100) / 100,
      });
    } catch (e) {
      setHouseholdError(e instanceof Error ? e.message : "Failed to load summary data");
    } finally {
      setHouseholdLoading(false);
    }
  }, [isHousehold, fetchAllExpenses, members]);

  // Lazily fetch household data when dialog opens (via useEffect, not
  // during render — calling state-updating functions during render is a
  // React anti-pattern that can cause infinite re-renders).
  useEffect(() => {
    if (open && isHousehold) {
      ensureHouseholdData();
    }
  }, [open, isHousehold, ensureHouseholdData]);

  // Reset state on close — including the householdLoaded ref so that
  // reopening the dialog re-fetches fresh data.
  const handleClose = useCallback(() => {
    setError(null);
    setShared(false);
    setDownloaded(false);
    setLinkCopied(false);
    setCardVisible(false);
    householdLoaded.current = false;
    setHouseholdContributions(undefined);
    setHouseholdTotals(undefined);
    setHouseholdError(null);
    onClose();
  }, [onClose]);

  const capturePng = useCallback(async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    setGenerating(true);
    setError(null);
    let restoreImages: (() => void) | undefined;
    try {
      // Pre-process cross-origin images to prevent canvas tainting.
      // This is the fix for Brave (and other browsers) where cross-origin
      // avatar images (Google, Firebase) cause SecurityError when drawn
      // to canvas. We convert them to data URLs (or SVG placeholders)
      // before capture so html-to-image never encounters a cross-origin src.
      restoreImages = await prepareImagesForCapture(captureRef.current);
      // Capture the visible preview's inner card node. Override the scale
      // transform so the captured image is full 1080px width (not scaled).
      const options = {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#FFFFFF" as const,
        skipFonts: true,
        style: {
          transform: "none",
          transformOrigin: "top left",
        },
      };
      // Safari has a known bug (html-to-image #147) where external images
      // render blank on the first call. The workaround is to call toBlob
      // twice — the first call primes the image cache, the second produces
      // a correct image. We detect Safari via the user agent.
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // Strategy: try toBlob first (more reliable, returns a Blob directly).
      // Fall back to toPng + fetch(dataUrl) -> blob if toBlob fails.
      let blob: Blob | null = null;
      try {
        blob = await toBlob(captureRef.current, options);
        if (isSafari && blob && blob.size < 50000) {
          // Safari retry: first capture may be blank
          for (let i = 0; i < 3 && blob && blob.size < 50000; i++) {
            blob = await toBlob(captureRef.current, options);
          }
        }
      } catch (blobErr) {
        console.warn("[GroupSummaryDialog] toBlob failed, trying toPng:", blobErr);
      }
      if (!blob) {
        // Fallback: toPng -> data URL -> fetch -> blob
        let dataUrl = await toPng(captureRef.current, options);
        if (isSafari) {
          for (let i = 0; i < 3 && dataUrl.length < 100000; i++) {
            dataUrl = await toPng(captureRef.current, options);
          }
        }
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }
      return blob;
    } catch (e) {
      // Log the full error for debugging — the generic message is shown to the user.
      console.error("[GroupSummaryDialog] Failed to generate image:", e);
      setError(e instanceof Error ? e.message : "Failed to generate image");
      return null;
    } finally {
      restoreImages?.();
      setGenerating(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const blob = await capturePng();
    if (!blob) return;
    const file = new File([blob], `trevio-summary-${groupInfo.groupId}.png`, { type: "image/png" });
    // Share text includes the clickable link prominently — the image itself
    // can't have clickable URLs (it's a PNG), so the link lives in the message text.
    const shareText = `${t("details.shareSummaryTitle")}: ${groupInfo.name}\n\n${linkUrl}`;
    const shareData: ShareData = {
      title: t("details.shareSummaryTitle"),
      text: shareText,
      files: [file],
    };
    // Try Web Share API with files (mobile + supported desktop browsers)
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      } catch (shareErr) {
        // AbortError = user cancelled the share sheet — don't fall through
        // to the download fallback; the user intentionally dismissed it.
        if (shareErr instanceof DOMException && shareErr.name === "AbortError") {
          return;
        }
        /* other errors — fall through to download fallback */
      }
    }
    // Fallback: download the image AND open WhatsApp with the text/link.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trevio-summary-${groupInfo.groupId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const waText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener,noreferrer");
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }, [capturePng, groupInfo.groupId, groupInfo.name, linkUrl, t]);

  const handleDownload = useCallback(async () => {
    const blob = await capturePng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trevio-summary-${groupInfo.groupId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }, [capturePng, groupInfo.groupId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard?.writeText(linkUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  }, [linkUrl]);

  if (!open) return null;

  return (
    <AnimatedDialog open={open} onClose={handleClose} maxWidth="max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("details.shareSummary")}</h2>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body: preview */}
      <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
        {showLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-trevio-600 dark:text-trevio-400" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("details.summaryCardPreviewLoad")}</p>
          </div>
        ) : householdError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500 dark:text-red-400">{householdError}</p>
          </div>
        ) : (
          <>
            {/* Visible scaled-down preview — this is what the user sees
                on our platform before sharing. The share button below is
                disabled until this preview has been painted.
                Height is DYNAMIC based on card content (no fixed aspect ratio). */}
            <div
              ref={previewWrapRef}
              style={{
                width: "100%",
                height: cardHeight > 0 ? cardHeight * previewScale : "auto",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
                position: "relative",
              }}
            >
              <div
                ref={captureRef}
                style={{
                  width: CARD_WIDTH,
                  transformOrigin: "top left",
                  transform: `scale(${previewScale})`,
                  pointerEvents: "none",
                }}
              >
                <GroupSummaryCard
                  groupInfo={groupInfo}
                  members={members}
                  debts={debts}
                  householdContributions={householdContributions}
                  householdTotals={householdTotals}
                  formatAmount={formatAmount}
                  dateLabel={dateLabel}
                  qrDataUrl={qrDataUrl}
                />
              </div>
            </div>
            {/* QR loading indicator (shown below preview while QR generates) */}
            {!qrReady ? (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                {t("details.summaryCardPreparingQr")}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            ) : null}
          </>
        )}
      </div>

      {/* Footer: actions — disabled until the card is visible AND QR is ready */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-2">
        <button
          onClick={handleShare}
          disabled={generating || !canShare}
          className="w-full rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white transition hover:bg-[#1FB855] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          {shared ? t("details.summaryCardShared") : t("details.shareSummaryWhatsapp")}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={generating || !canShare}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloaded ? <Check className="h-4 w-4 text-green-500" /> : <Download className="h-4 w-4" />}
            {downloaded ? t("details.summaryCardShared") : t("details.summaryCardDownload")}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {linkCopied ? t("details.summaryCardLinkCopied") : t("details.summaryCardCopyLink")}
          </button>
        </div>
      </div>
    </AnimatedDialog>
  );
}

// Helper to keep deps array stable without conditional hooks
function showLoadingValue(
  isHousehold: boolean,
  loading: boolean,
  contribs: unknown,
  totals: unknown,
  err: string | null
): string {
  if (!isHousehold) return "non-household";
  if (loading) return "loading";
  if (err) return "error";
  if (contribs && totals) return "ready";
  return "waiting";
}
