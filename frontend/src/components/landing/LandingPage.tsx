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
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#4ade80]/30 selection:text-white font-sans antialiased">
      {/* Sticky Top Nav */}
      <LandingNavbar onLaunchApp={onLaunchApp} />

      {/* Main Content */}
      <main id="main-content">
        {/* Act 1: The Thesis & Crowd Canvas Animation Background (Preserved) */}
        <LandingHero onLaunchApp={onLaunchApp} onOpenProof={onOpenProof} />

        {/* Act 2: Proven by Evidence (Staggered Masonry Layout) */}
        <LandingShowcase onOpenProof={onOpenProof} />

        {/* Act 3: How It Works */}
        <LandingArchitecture onOpenProof={onOpenProof} />

        {/* Act 4: Closed Loop & Minimalist Studio Action */}
        <LandingCta onLaunchApp={onLaunchApp} />
      </main>

      {/* Dense Studio Footer */}
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
}
