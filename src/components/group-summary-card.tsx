"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import type { Member, SimplifiedDebt, MemberContribution, GroupTemplate } from "@/lib/types";
import type { GroupInfo } from "@/lib/services/interfaces/group-service";

// Template accent colors (light-theme variants for the fixed-brand card)
const TEMPLATE_ACCENT: Record<GroupTemplate, { bg: string; text: string; label: string }> = {
  trip: { bg: "#6366F1", text: "#FFFFFF", label: "Trip" },
  turf: { bg: "#22C55E", text: "#FFFFFF", label: "Turf" },
  casual: { bg: "#F59E0B", text: "#FFFFFF", label: "Casual" },
  household: { bg: "#0D9488", text: "#FFFFFF", label: "Household" },
};

// Trevio teal gradient stops (brand)
const HEADER_GRADIENT_START = "#2dd4bf";
const HEADER_GRADIENT_END = "#0f766e";

const MAX_NAME_CHARS = 14;

function truncateName(name: string): string {
  if (!name) return "";
  if (name.length <= MAX_NAME_CHARS) return name;
  return name.slice(0, MAX_NAME_CHARS - 1) + "…";
}

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface GroupSummaryCardProps {
  groupInfo: GroupInfo;
  members: Member[];
  debts: SimplifiedDebt[];
  householdContributions?: MemberContribution[];
  householdTotals?: { totalSpent: number; totalReceived: number; netAmount: number };
  formatAmount: (amount: number) => string;
  dateLabel: string;
  qrDataUrl?: string;
}

/**
 * Pure presentational card for the Trevio group summary share image.
 * Uses INLINE STYLES with explicit hex colors (not Tailwind CSS vars)
 * so html-to-image captures true colors regardless of theme.
 * Fixed brand theme (light body) — identical output in dark/light mode.
 *
 * DYNAMIC HEIGHT: No fixed height or overflow:hidden — the card grows
 * to fit ALL members. No content is ever cropped.
 */
export function GroupSummaryCard({
  groupInfo,
  members,
  debts,
  householdContributions,
  householdTotals,
  formatAmount,
  dateLabel,
  qrDataUrl,
}: GroupSummaryCardProps) {
  const t = useTranslations("groups");
  const isHousehold = groupInfo.template === "household";
  const accent = TEMPLATE_ACCENT[groupInfo.template] ?? TEMPLATE_ACCENT.casual;

  // "Pending across X of Y members": X = members with |balance| > 0.01
  const totalMembers = members.length;
  const pendingMembers = members.filter((m) => Math.abs(m.balance) > 0.01).length;
  const allSettled = !isHousehold && debts.length === 0;

  // NO caps — show ALL members
  const allDebts = debts;
  const allContributors = householdContributions ?? [];

  return (
    <div
      style={{
        width: 1080,
        backgroundColor: "#FFFFFF",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        color: "#1E293B",
      }}
    >
      {/* Compact Header band with Trevio teal gradient + logo + template badge */}
      <div
        style={{
          background: `linear-gradient(135deg, ${HEADER_GRADIENT_START} 0%, ${HEADER_GRADIENT_END} 100%)`,
          padding: "32px 48px 28px",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {/* Trevio "T" mark — compact */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={30} height={30} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="96" y="128" width="128" height="56" rx="28" fill="#ffffff" />
              <rect x="288" y="128" width="128" height="56" rx="28" fill="#ffffff" />
              <rect x="232" y="128" width="48" height="260" rx="24" fill="#ffffff" />
              <path d="M256 128 L288 156 L256 184 L224 156 Z" fill="#ffffff" />
            </svg>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>Trevio</span>
          {/* Template badge — compact */}
          <span
            style={{
              marginLeft: "auto",
              backgroundColor: accent.bg,
              color: accent.text,
              fontSize: 16,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            {accent.label}
          </span>
        </div>
        {/* Group name — compact */}
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {groupInfo.name}
        </div>
        {groupInfo.description ? (
          <div
            style={{
              fontSize: 18,
              opacity: 0.85,
              marginTop: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {groupInfo.description}
          </div>
        ) : null}
        {/* Total — compact, inline */}
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 10, opacity: 0.95 }}>
          {formatAmount(groupInfo.totalExpenses)} <span style={{ opacity: 0.7, fontWeight: 500 }}>{t("details.summaryCardTotalLabel")}</span>
        </div>
      </div>

      {/* Body — dynamic height, no overflow hidden */}
      <div style={{ padding: "24px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
        {isHousehold ? (
          <>
            {/* Household: stat row */}
            <div style={{ display: "flex", gap: 10 }}>
              <StatBox
                label={t("details.summaryCardTotalSpent")}
                value={formatAmount(householdTotals?.totalSpent ?? 0)}
                color="#EF4444"
              />
              <StatBox
                label={t("details.summaryCardTotalReceived")}
                value={formatAmount(householdTotals?.totalReceived ?? 0)}
                color="#22C55E"
              />
              <StatBox
                label={t("details.summaryCardNet")}
                value={formatAmount(householdTotals?.netAmount ?? 0)}
                color={(householdTotals?.netAmount ?? 0) >= 0 ? "#22C55E" : "#EF4444"}
              />
            </div>
            {/* Household: ALL contributors (no cap) */}
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("details.summaryCardTopContributors")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allContributors.map((c, i) => (
                  <ContributorRow
                    key={c.uid}
                    rank={i + 1}
                    name={truncateName(c.displayName)}
                    amount={formatAmount(c.totalSpent)}
                    percentage={c.spentPercentage}
                    photoURL={c.photoURL}
                  />
                ))}
                {allContributors.length === 0 ? (
                  <div style={{ fontSize: 20, color: "#94A3B8", textAlign: "center", padding: "20px 0" }}>
                    {t("details.summaryCardNoEntries")}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : allSettled ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 0",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "#DCFCE7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#16A34A" }}>
              {t("details.summaryCardAllSettled")}
            </div>
            <div style={{ fontSize: 20, color: "#64748B" }}>
              {t("details.summaryCardPendingOf", { x: 0, y: totalMembers })}
            </div>
          </div>
        ) : (
          <>
            {/* Trip/Turf/Casual: pending summary line */}
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#475569",
                textAlign: "center",
                padding: "10px 0",
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
              }}
            >
              {t("details.summaryCardPendingOf", { x: pendingMembers, y: totalMembers })}
            </div>
            {/* Who pays whom — ALL rows (no cap) */}
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("details.summaryCardWhoPaysWhom")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allDebts.map((d, i) => (
                  <DebtRow
                    key={`debt-${i}-${d.fromUid}-${d.toUid}`}
                    fromName={truncateName(d.fromName)}
                    toName={truncateName(d.toName)}
                    fromPhotoURL={d.fromPhotoURL}
                    toPhotoURL={d.toPhotoURL}
                    amount={formatAmount(d.amount)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* "Summary as on <date>" — placed right after content, no overlap */}
        <div style={{ fontSize: 16, color: "#94A3B8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>
          {t("details.summaryCardAsOn", { date: dateLabel })}
        </div>
      </div>

      {/* Footer: QR + "Scan to view" + powered by.
          No raw URL text — it's not clickable in a PNG image.
          The share message includes the clickable link. */}
      <div
        style={{
          backgroundColor: "#F1F5F9",
          padding: "20px 48px 28px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderTop: "1px solid #E2E8F0",
        }}
      >
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain img for html-to-image capture fidelity
          <img
            src={qrDataUrl}
            alt="QR"
            style={{ width: 88, height: 88, borderRadius: 8, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 88, height: 88, backgroundColor: "#FFFFFF", borderRadius: 8, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
            {t("details.summaryCardViewDetails")}
          </div>
          <div style={{ fontSize: 14, color: "#94A3B8" }}>
            {t("details.summaryCardTapLink")}
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F766E", flexShrink: 0 }}>
          {t("details.summaryCardPoweredBy")}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function DebtRow({
  fromName,
  toName,
  fromPhotoURL,
  toPhotoURL,
  amount,
}: {
  fromName: string;
  toName: string;
  fromPhotoURL?: string;
  toPhotoURL?: string;
  amount: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <Avatar name={fromName} photoURL={fromPhotoURL} />
      <span style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {fromName}
      </span>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
      <Avatar name={toName} photoURL={toPhotoURL} />
      <span style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {toName}
      </span>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#EF4444", flexShrink: 0 }}>{amount}</span>
    </div>
  );
}

function ContributorRow({
  rank,
  name,
  amount,
  percentage,
  photoURL,
}: {
  rank: number;
  name: string;
  amount: string;
  percentage: number;
  photoURL?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: "#0D9488",
          color: "#FFFFFF",
          fontSize: 14,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {rank}
      </span>
      <Avatar name={name} photoURL={photoURL} />
      <span style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </span>
      <span style={{ fontSize: 14, color: "#94A3B8", flexShrink: 0 }}>{Math.round(percentage)}%</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", flexShrink: 0 }}>{amount}</span>
    </div>
  );
}

function Avatar({ name, photoURL }: { name: string; photoURL?: string }) {
  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- plain img for html-to-image capture fidelity
      <img
        src={photoURL}
        alt={name}
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: "#E2E8F0",
        color: "#475569",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

/**
 * Hook that asynchronously generates a QR data URL for the link.
 * Returns "" until ready.
 */
export function useQrDataUrl(linkUrl: string): string {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(linkUrl, { width: 256, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQr("");
      });
    return () => {
      active = false;
    };
  }, [linkUrl]);
  return qr;
}
