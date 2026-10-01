interface LandingFooterProps {
  onLaunchApp?: () => void;
}

export default function LandingFooter({ onLaunchApp: _onLaunchApp }: LandingFooterProps) {
  return (
    <footer className="bg-[#010102] text-[#8a8f98] py-16 px-6 lg:px-8 border-t border-[#23252a] text-xs">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Brand & System Status */}
        <div className="md:col-span-2 space-y-3.5">
          <div className="inline-flex items-center gap-2 text-[#f7f8f8] font-semibold text-sm">
            <span className="w-5 h-5 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white text-[10px] font-bold shadow-[0_1px_3px_rgba(94,106,210,0.4)]">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tracking-tight">RepScan</span>
          </div>

          <p className="text-xs text-[#8a8f98] leading-relaxed max-w-sm">
            RepScan turns customer reviews into clear, evidence-backed insights — showing you what changed, why it changed, and what you can do about it.
          </p>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0f1011] border border-[#23252a] text-[11px] text-[#4ade80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
            <span>Multi-Channel Ingestion &amp; Grounded Evidence Active</span>
          </div>

          <div className="text-[11px] text-[#62666d] pt-2">
            © 2026 RepScan Systems. All rights reserved.
          </div>
        </div>

        {/* Column 1: Capabilities */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-[#f7f8f8] uppercase tracking-[0.06em] block">
            Product
          </span>
          <ul className="space-y-2 text-xs text-[#8a8f98]">
            <li><a href="#core-value" className="hover:text-[#f7f8f8] transition-colors">Core Value</a></li>
            <li><a href="#how-it-works" className="hover:text-[#f7f8f8] transition-colors">How It Works</a></li>
            <li><a href="#the-proof" className="hover:text-[#f7f8f8] transition-colors">The Proof</a></li>
            <li><a href="#multilingual" className="hover:text-[#f7f8f8] transition-colors">Multilingual AI</a></li>
            <li><a href="#action" className="hover:text-[#f7f8f8] transition-colors">Action Board</a></li>
          </ul>
        </div>

        {/* Column 2: Ingestion & Infrastructure */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-[#f7f8f8] uppercase tracking-[0.06em] block">
            Connectors
          </span>
          <ul className="space-y-2 text-xs text-[#8a8f98]">
            <li><span className="text-[#8a8f98]">Google Places Actor</span></li>
            <li><span className="text-[#8a8f98]">Instagram Comments</span></li>
            <li><span className="text-[#8a8f98]">LinkedIn Feedback</span></li>
            <li><span className="text-[#8a8f98]">Local Ollama / Mistral</span></li>
            <li><span className="text-[#8a8f98]">pgvector Embeddings</span></li>
          </ul>
        </div>

        {/* Column 3: System & Security */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-[#f7f8f8] uppercase tracking-[0.06em] block">
            System
          </span>
          <ul className="space-y-2 text-xs text-[#8a8f98]">
            <li><a href="#changelog" className="hover:text-[#f7f8f8] transition-colors">Changelog (v2.4)</a></li>
            <li><span className="text-[#8a8f98]">Deterministic Math Specs</span></li>
            <li><span className="text-[#8a8f98]">Zero Data Egress Policy</span></li>
            <li><span className="text-[#8a8f98]">SHA-256 Idempotency</span></li>
            <li><span className="text-[#8a8f98]">Enterprise REST API</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
