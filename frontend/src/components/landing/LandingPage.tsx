import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingHowItWorks from './LandingHowItWorks';
import LandingProof from './LandingProof';
import LandingMultilingual from './LandingMultilingual';
import LandingAction from './LandingAction';
import LandingCta from './LandingCta';
import LandingFooter from './LandingFooter';
import type { ProofItem } from '../../types';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenProof: (proof: ProofItem) => void;
}

export default function LandingPage({ onLaunchApp, onOpenProof }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8] selection:bg-[#5e6ad2] selection:text-white">
      {/* Sticky Linear Top Nav */}
      <LandingNavbar onLaunchApp={onLaunchApp} />

      {/* Main Content */}
      <main id="main-content">
        {/* 1. Hero */}
        <LandingHero onLaunchApp={onLaunchApp} onOpenProof={onOpenProof} />

        {/* 2. Core Value Proposition */}
        <LandingFeatures />

        {/* 3. How RepScan Works */}
        <LandingHowItWorks />

        {/* 4. The Proof */}
        <LandingProof onOpenProof={onOpenProof} />

        {/* 5. Built for Real Customer Feedback */}
        <LandingMultilingual />

        {/* 6. From Insight to Action */}
        <LandingAction onLaunchApp={onLaunchApp} />

        {/* 7. Final CTA */}
        <LandingCta onLaunchApp={onLaunchApp} />
      </main>

      {/* Dense Footer */}
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
}
