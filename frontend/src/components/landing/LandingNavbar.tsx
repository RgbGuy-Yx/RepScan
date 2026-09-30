import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface LandingNavbarProps {
  onLaunchApp?: () => void;
}

export default function LandingNavbar({ onLaunchApp }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-[#010102]/85 backdrop-blur-md border-b border-[#23252a] px-6 lg:px-8 flex items-center justify-between">
      {/* Brand Wordmark & Glyph */}
      <div className="flex items-center gap-6">
        <a href="#" className="inline-flex items-center gap-2.5 group">
          <span className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-[0_1px_4px_rgba(94,106,210,0.4)]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-semibold text-sm tracking-[-0.03em] text-[#f7f8f8]">
            Rep<span className="text-[#8a8f98] font-normal">Scan</span>
          </span>
        </a>

        {/* Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-5 text-[13px] text-[#8a8f98] font-medium" aria-label="Main Navigation">
          <a href="#core-value" className="hover:text-[#f7f8f8] transition-colors">
            Value
          </a>
          <a href="#how-it-works" className="hover:text-[#f7f8f8] transition-colors">
            How It Works
          </a>
          <a href="#the-proof" className="hover:text-[#f7f8f8] transition-colors">
            The Proof
          </a>
          <a href="#multilingual" className="hover:text-[#f7f8f8] transition-colors">
            Languages
          </a>
          <a href="#action" className="hover:text-[#f7f8f8] transition-colors">
            Action
          </a>
        </nav>
      </div>

      {/* Right Action Pair */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onLaunchApp}
          className="hidden sm:inline-flex text-[13px] font-medium text-[#d0d6e0] hover:text-[#f7f8f8] px-3 py-1.5 rounded-md hover:bg-[#141516] transition-colors cursor-pointer"
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={onLaunchApp}
          className="linear-btn-primary text-xs h-8 px-3.5 font-medium cursor-pointer"
        >
          Explore RepScan
        </button>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden w-8 h-8 rounded-md bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-50 bg-[#010102]/98 backdrop-blur-2xl p-6 flex flex-col justify-between border-t border-[#23252a]">
          <nav className="flex flex-col gap-4 text-sm font-medium text-[#d0d6e0]">
            <a
              href="#core-value"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#23252a] hover:text-[#f7f8f8]"
            >
              Value
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#23252a] hover:text-[#f7f8f8]"
            >
              How It Works
            </a>
            <a
              href="#the-proof"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#23252a] hover:text-[#f7f8f8]"
            >
              The Proof
            </a>
            <a
              href="#multilingual"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#23252a] hover:text-[#f7f8f8]"
            >
              Languages
            </a>
            <a
              href="#action"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#23252a] hover:text-[#f7f8f8]"
            >
              Action
            </a>
          </nav>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchApp?.();
              }}
              className="linear-btn-primary w-full h-10 text-xs font-medium justify-center"
            >
              Launch Dashboard App
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
