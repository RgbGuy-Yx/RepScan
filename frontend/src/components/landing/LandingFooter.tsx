interface LandingFooterProps {
  onLaunchApp?: () => void;
}

export default function LandingFooter({ onLaunchApp: _onLaunchApp }: LandingFooterProps) {
  return (
    <footer className="bg-[#0a0a0a] text-[#a3a3a3] py-16 px-6 lg:px-8 border-t border-[#262626] text-xs">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Brand & System Status */}
        <div className="md:col-span-2 space-y-4">
          <div className="inline-flex items-center gap-2.5 text-white font-medium text-sm">
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] text-[10px] font-bold shadow-sm">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tracking-tight">Rep<span className="text-[#a3a3a3] font-light">Scan</span></span>
          </div>

          <p className="text-xs text-[#a3a3a3] leading-relaxed max-w-sm">
            RepScan turns customer reviews into clear, evidence-backed insights, showing you what changed, why it changed, and what you can do about it.
          </p>

          <div className="badge-action-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>Multi-Channel Customer Review Intelligence</span>
          </div>

          <div className="text-[11px] text-[#737373] pt-2">
            © 2026 RepScan. Built for honest customer insights.
          </div>
        </div>

        {/* Column 1: Capabilities */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-white tracking-wider uppercase block">
            Product
          </span>
          <ul className="space-y-2 text-xs text-[#a3a3a3]">
            <li><a href="#telemetry" className="hover:text-white transition-colors">Customer Feedback</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
          </ul>
        </div>

        {/* Column 2: Ingestion & Infrastructure */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-white tracking-wider uppercase block">
            Channels
          </span>
          <ul className="space-y-2 text-xs text-[#a3a3a3]">
            <li><span>Google Maps Reviews</span></li>
            <li><span>Instagram Comments</span></li>
            <li><span>Automatic Daily Sync</span></li>
            <li><span>Multi-Language Support</span></li>
          </ul>
        </div>

        {/* Column 3: Trust & Assurance */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-white tracking-wider uppercase block">
            Trust &amp; Privacy
          </span>
          <ul className="space-y-2 text-xs text-[#a3a3a3]">
            <li><span>Direct Review Verification</span></li>
            <li><span>Private &amp; Secure</span></li>
            <li><span>Real-Time Trend Alerts</span></li>
            <li><span>Executive Summary Reports</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
