import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingShowcase from './LandingShowcase';
import LandingHowItWorks from './LandingHowItWorks';
import LandingProof from './LandingProof';
import LandingMultilingual from './LandingMultilingual';
import LandingCta from './LandingCta';
import LandingFooter from './LandingFooter';
import type { ProofItem } from '../../types';

interface LandingPageProps {
  onLaunchApp: (target?: 'app' | 'sign-in' | 'sign-up') => void;
  onOpenProof: (proof: ProofItem) => void;
}

export default function LandingPage({ onLaunchApp, onOpenProof }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100">
      {/* Sticky Top Nav */}
      <LandingNavbar onLaunchApp={onLaunchApp} />

      {/* Main Content */}
      <main id="main-content">
        {/* 1. Hero */}
        <LandingHero onLaunchApp={onLaunchApp} onOpenProof={onOpenProof} />

        {/* 2. Core Value Proposition */}
        <LandingFeatures />

        {/* 3. Live Telemetry & Product Showcase */}
        <LandingShowcase onOpenProof={onOpenProof} />

        {/* 4. How RepScan Works */}
        <LandingHowItWorks />

        {/* 5. The Proof */}
        <LandingProof onOpenProof={onOpenProof} />

        {/* 6. Built for Real Customer Feedback */}
        <LandingMultilingual />

        {/* 7. Final CTA */}
        <LandingCta onLaunchApp={onLaunchApp} />
      </main>

      {/* Dense Footer */}
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
}
