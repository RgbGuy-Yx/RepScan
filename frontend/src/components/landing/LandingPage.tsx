import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingShowcase from './LandingShowcase';
import LandingArchitecture from './LandingArchitecture';
import LandingCta from './LandingCta';
import LandingFooter from './LandingFooter';
import type { ProofItem } from '../../types';

interface LandingPageProps {
  onLaunchApp: (target?: 'app' | 'sign-in' | 'sign-up') => void;
  onOpenProof: (proof: ProofItem) => void;
}

export default function LandingPage({ onLaunchApp, onOpenProof }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8] selection:bg-zinc-800 selection:text-zinc-100 font-sans antialiased">
      {/* Sticky Top Nav */}
      <LandingNavbar onLaunchApp={onLaunchApp} />

      {/* Main Content */}
      <main id="main-content">
        {/* Act 1: The Thesis & Live Telemetry Inspector */}
        <LandingHero onLaunchApp={onLaunchApp} onOpenProof={onOpenProof} />

        {/* Act 2: Proven by Evidence (User's Reference Staggered Masonry Layout) */}
        <LandingShowcase onOpenProof={onOpenProof} />

        {/* Act 3: Core Architecture (Multi-dialect NLU, 2σ Math, Grounded Citations) */}
        <LandingArchitecture onOpenProof={onOpenProof} />

        {/* Act 4: The Closed Loop & Minimalist Studio Action */}
        <LandingCta onLaunchApp={onLaunchApp} />
      </main>

      {/* Dense Studio Footer */}
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
}
