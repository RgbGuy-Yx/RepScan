import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full h-14 bg-[#010102]/85 backdrop-blur-md border-b border-[#23252a] px-6 lg:px-8 flex items-center justify-between">
      {/* Brand Wordmark & Glyph */}
      <div className="flex items-center gap-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <span className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-[0_1px_4px_rgba(94,106,210,0.4)]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-semibold text-sm tracking-[-0.03em] text-[#f7f8f8]">
            Rep<span className="text-[#8a8f98] font-normal">Scan</span>
          </span>
        </Link>

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
        {isAuthenticated ? (
          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard"
              className="linear-btn-primary text-xs h-8 px-3.5 font-medium cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <span>→</span>
            </Link>
            <UserProfileMenu align="right" />
          </div>
        ) : (
          <>
            <Link
              to="/sign-in"
              className="hidden sm:inline-flex text-[13px] font-medium text-[#d0d6e0] hover:text-[#f7f8f8] px-3 py-1.5 rounded-md hover:bg-[#141516] transition-colors cursor-pointer"
            >
              Sign In
            </Link>

            <Link
              to="/sign-up"
              className="linear-btn-primary text-xs h-8 px-3.5 font-medium cursor-pointer inline-flex items-center"
            >
              Create Account
            </Link>
          </>
        )}

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

          <div className="pt-6 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a] text-xs text-[#8a8f98]">
                  <span className="text-[#f7f8f8] font-medium block">{userProfile?.name || 'Operator'}</span>
                  <span className="text-[11px] truncate font-mono">{userProfile?.email}</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="linear-btn-primary w-full h-10 text-xs font-medium justify-center flex items-center"
                >
                  Open Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleMobileLogout}
                  className="w-full h-10 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="linear-btn-primary w-full h-10 text-xs font-medium justify-center flex items-center"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
