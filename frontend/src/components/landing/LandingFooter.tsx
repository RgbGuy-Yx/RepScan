import googleIcon from '../../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

interface LandingFooterProps {
  onLaunchApp?: () => void;
}

export default function LandingFooter({ onLaunchApp: _onLaunchApp }: LandingFooterProps) {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-16 px-6 lg:px-8 border-t border-zinc-800/80 text-xs">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Brand & System Status */}
        <div className="md:col-span-2 space-y-3.5">
          <div className="inline-flex items-center gap-2 text-zinc-100 font-semibold text-sm">
            <span className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 text-[10px] font-bold shadow-sm">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tracking-tight">RepScan</span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            RepScan turns customer reviews into clear, evidence-backed insights, showing you what changed, why it changed, and what you can do about it.
          </p>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Multi-Channel Ingestion &amp; Grounded Evidence Active</span>
          </div>

          <div className="text-[11px] text-zinc-600 pt-2 font-mono">
            © 2026 RepScan Systems. All rights reserved.
          </div>
        </div>

        {/* Column 1: Capabilities */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider font-mono block">
            Product
          </span>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li><a href="#core-value" className="hover:text-zinc-100 transition-colors">Core Value</a></li>
            <li><a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How It Works</a></li>
            <li><a href="#the-proof" className="hover:text-zinc-100 transition-colors">The Proof</a></li>
            <li><a href="#multilingual" className="hover:text-zinc-100 transition-colors">Multilingual AI</a></li>
            <li><a href="#telemetry" className="hover:text-zinc-100 transition-colors">Telemetry &amp; Reports</a></li>
          </ul>
        </div>

        {/* Column 2: Ingestion & Infrastructure */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider font-mono block">
            Connectors
          </span>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>
              <span className="inline-flex items-center gap-1.5">
                <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain" />
                <span>Google Places Actor</span>
              </span>
            </li>
            <li><span>Instagram Comments</span></li>
            <li><span>LinkedIn Feedback</span></li>
            <li><span>Local Ollama / Mistral</span></li>
            <li><span>pgvector Embeddings</span></li>
          </ul>
        </div>

        {/* Column 3: System & Security */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider font-mono block">
            System
          </span>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li><a href="#changelog" className="hover:text-zinc-100 transition-colors">Changelog (v2.4)</a></li>
            <li><span>Deterministic Math Specs</span></li>
            <li><span>Zero Data Egress Policy</span></li>
            <li><span>SHA-256 Idempotency</span></li>
            <li><span>Enterprise REST API</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
