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
    <header className="sticky top-0 z-40 w-full h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 lg:px-8 flex items-center justify-between">
      {/* Brand Wordmark & Glyph */}
      <div className="flex items-center gap-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <span className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 font-bold text-xs tracking-tight shadow-sm relative">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
          </span>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            Rep<span className="text-zinc-400 font-normal">Scan</span>
          </span>
        </Link>

        {/* Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs text-zinc-400 font-medium" aria-label="Main Navigation">
          <a href="#core-value" className="hover:text-zinc-100 transition-colors">
            Value
          </a>
          <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">
            How It Works
          </a>
          <a href="#the-proof" className="hover:text-zinc-100 transition-colors">
            The Proof
          </a>
          <a href="#multilingual" className="hover:text-zinc-100 transition-colors">
            Languages
          </a>
        </nav>
      </div>

      {/* Right Action Pair */}
      <div className="flex items-center gap-2.5">
        {isAuthenticated ? (
          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-all active:scale-[0.98] inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Dashboard</span>
              <span>&rarr;</span>
            </Link>
            <UserProfileMenu align="right" />
          </div>
        ) : (
          <>
            <Link
              to="/sign-in"
              className="hidden sm:inline-flex text-xs font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Sign In
            </Link>

            <Link
              to="/sign-up"
              className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-all active:scale-[0.98] inline-flex items-center shadow-sm cursor-pointer"
            >
              Create Account
            </Link>
          </>
        )}

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-50 bg-zinc-950/98 backdrop-blur-2xl p-6 flex flex-col justify-between border-t border-zinc-800">
          <nav className="flex flex-col gap-4 text-sm font-medium text-zinc-300">
            <a
              href="#core-value"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-zinc-800 hover:text-white"
            >
              Value
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-zinc-800 hover:text-white"
            >
              How It Works
            </a>
            <a
              href="#the-proof"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-zinc-800 hover:text-white"
            >
              The Proof
            </a>
            <a
              href="#multilingual"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 border-b border-zinc-800 hover:text-white"
            >
              Languages
            </a>
          </nav>

          <div className="pt-6 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                  <span className="text-zinc-100 font-medium block">{userProfile?.name || 'Operator'}</span>
                  <span className="text-[11px] truncate font-mono">{userProfile?.email}</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-10 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium justify-center flex items-center shadow-sm cursor-pointer"
                >
                  Open Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleMobileLogout}
                  className="w-full h-10 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-10 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium justify-center flex items-center shadow-sm cursor-pointer"
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
