"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/use-auth";
import { TermsDialog } from "@/components/terms-dialog";
import { PhoneSetupDialog } from "@/components/phone-setup-dialog";
import { AuroraBackground } from "@/components/login/AuroraBackground";
import { HeroSection } from "@/components/login/HeroSection";
import { UseCasesSection } from "@/components/login/UseCasesSection";
import { FeatureShowcase } from "@/components/login/FeatureShowcase";
import { StatsBanner } from "@/components/login/StatsBanner";
import { HowItWorks } from "@/components/login/HowItWorks";
import { CTASection } from "@/components/login/CTASection";
import { SplitReceiptMockup } from "@/components/login/mockups/SplitReceiptMockup";
import { SplitMethodsMockup } from "@/components/login/mockups/SplitMethodsMockup";
import { SettlementMockup } from "@/components/login/mockups/SettlementMockup";
import { BudgetInsightsMockup } from "@/components/login/mockups/BudgetInsightsMockup";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth");
  const [signingIn, setSigningIn] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const redirectToApp = useCallback(() => {
    let pendingInvite: string | null = null;
    try { pendingInvite = sessionStorage.getItem("pendingInviteCode"); } catch {}
    if (pendingInvite) {
      router.push(`/join/${pendingInvite}`);
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.acceptedTnC) {
        if (!showTerms && !showPhoneSetup) setShowTerms(true);
      } else if (!user.phoneNumber) {
        if (!showPhoneSetup) setShowPhoneSetup(true);
      } else {
        redirectToApp();
      }
    }
  }, [user, loading, redirectToApp, showTerms, showPhoneSetup]);

  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (e) {
      setSignInError(e instanceof Error ? e.message : t("signInFailed"));
    } finally {
      setSigningIn(false);
    }
  };

  const handleTermsAccepted = () => {
    setSigningIn(false);
    setShowTerms(false);
    // refreshUser() in TermsDialog now updates the shared AuthContext,
    // so the useEffect above will fire and show phone setup or redirect.
    // But also transition immediately for instant feedback.
    if (user && !user.phoneNumber) {
      setShowPhoneSetup(true);
    } else {
      redirectToApp();
    }
  };

  const handlePhoneComplete = () => {
    setShowPhoneSetup(false);
    redirectToApp();
  };

  // Memoize chapters to prevent unnecessary re-renders of the carousel
  const chapters = useMemo(() => [
    {
      title: t("story.chapter1Title"),
      description: t("story.chapter1Desc"),
      imageSrc: "/login/chapter1.svg",
      imageAlt: t("story.chapter1Title"),
      mockup: <SplitReceiptMockup />,
    },
    {
      title: t("story.chapter2Title"),
      description: t("story.chapter2Desc"),
      imageSrc: "/login/chapter2.svg",
      imageAlt: t("story.chapter2Title"),
      mockup: <SplitMethodsMockup />,
    },
    {
      title: t("story.chapter3Title"),
      description: t("story.chapter3Desc"),
      imageSrc: "/login/chapter3.svg",
      imageAlt: t("story.chapter3Title"),
      mockup: <SettlementMockup />,
    },
    {
      title: t("story.chapter4Title"),
      description: t("story.chapter4Desc"),
      imageSrc: "/login/chapter4.svg",
      imageAlt: t("story.chapter4Title"),
      mockup: <BudgetInsightsMockup />,
    },
  ], [t]);

  return (
    <>
      <AuroraBackground />

      {/* Full-width single-column scrollable experience */}
      <div className="relative">
        {/* Hero — logo, headline, sign-in button, story carousel */}
        <HeroSection
          chapters={chapters}
          signingIn={signingIn}
          signInError={signInError}
          onSignIn={handleSignIn}
        />

        {/* Use cases — 6 animated cards */}
        <UseCasesSection />

        {/* Feature showcase — alternating text + animated mockups */}
        <FeatureShowcase />

        {/* Stats banner — animated counters */}
        <StatsBanner />

        {/* How it works — 3-step animated guide */}
        <HowItWorks />

        {/* Final CTA — login button (for users who scrolled past the hero) */}
        <CTASection onSignIn={handleSignIn} />
      </div>

      <TermsDialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccepted={handleTermsAccepted}
        forceAccept
      />

      <PhoneSetupDialog
        open={showPhoneSetup}
        onComplete={handlePhoneComplete}
      />
    </>
  );
}
