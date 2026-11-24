import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import UserProfileMenu from '../UserProfileMenu';

interface LandingNavbarProps {
  onLaunchApp?: (target?: 'app' | 'sign-in' | 'sign-up') => void;
}

export default function LandingNavbar(_props: LandingNavbarProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout, userProfile } = useBusiness();

  const handleMobileLogout = async () => {
    setMobileMenuOpen(false);
    if (logout) {
      await logout();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#0a0a0a]/85 backdrop-blur-md border-b border-[#262626] px-6 lg:px-8 flex items-center justify-between">
      {/* Brand Wordmark & Glyph */}
      <div className="flex items-center gap-8">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] font-bold text-xs tracking-tight shadow-sm relative">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
            <span className="w-2 h-2 rounded-full bg-[#4ade80] absolute -top-0.5 -right-0.5" />
          </span>
          <span className="font-medium text-sm tracking-tight text-white">
            Rep<span className="text-[#a3a3a3] font-light">Scan</span>
          </span>
        </Link>

        {/* Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-[#a3a3a3] font-medium font-sans" aria-label="Main Navigation">
          <a href="#telemetry" className="hover:text-white transition-colors">
            Customer Feedback
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
        </nav>
      </div>

      {/* Right Action Pair — Pill Buttons */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="btn-pill-primary text-xs"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <UserProfileMenu align="right" />
          </div>
        ) : (
          <>
            <Link
              to="/sign-in"
              className="hidden sm:inline-flex text-xs font-medium text-[#a3a3a3] hover:text-white px-3.5 py-1.5 transition-colors cursor-pointer"
            >
              Sign In
            </Link>

            <Link
              to="/sign-up"
              className="btn-pill-primary text-xs"
            >
              Create Account
            </Link>
          </>
        )}

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden w-8 h-8 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-[#0a0a0a]/98 backdrop-blur-2xl p-6 flex flex-col justify-between border-t border-[#262626]">
          <nav className="flex flex-col gap-4 text-sm font-medium text-[#a3a3a3]">
            <a
              href="#telemetry"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#262626] hover:text-white"
            >
              Evidence
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-[#262626] hover:text-white"
            >
              How It Works
            </a>
          </nav>

          <div className="pt-6 space-y-3">
            {isAuthenticated ? (
              <>
                <div className="p-3.5 rounded-2xl bg-[#171717] border border-[#262626] text-xs text-[#a3a3a3]">
                  <span className="text-white font-medium block">{userProfile?.name || 'Operator'}</span>
                  <span className="text-[11px] truncate font-mono text-[#737373]">{userProfile?.email}</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-pill-primary w-full text-center"
                >
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleMobileLogout}
                  className="btn-pill-secondary w-full text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  to="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-pill-secondary w-full text-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-pill-primary w-full text-center"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
