import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Settings,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

interface UserProfileMenuProps {
  align?: 'right' | 'left';
}

export default function UserProfileMenu({ align = 'right' }: UserProfileMenuProps) {
  const { userProfile, logout, isAuthenticated } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Mouse hover handlers with grace period
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLogoutClick = async () => {
    setIsOpen(false);
    if (logout) {
      await logout();
    }
    navigate('/');
  };

  const initial = userProfile?.name
    ? userProfile.name.charAt(0).toUpperCase()
    : userProfile?.email
    ? userProfile.email.charAt(0).toUpperCase()
    : 'U';

  const displayName = userProfile?.name || 'RepScan Operator';
  const displayEmail = userProfile?.email || (isAuthenticated ? 'user@repscan.dev' : 'Offline');

  return (
    <div
      ref={menuRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 transition-colors cursor-pointer group active:scale-[0.98]"
      >
        <div className="relative">
          <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono font-semibold text-[10px] flex items-center justify-center">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        </div>

        <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 max-w-[120px] truncate hidden md:inline-block">
          {displayName}
        </span>

        <ChevronDown
          className={`w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      {/* Hover / Click Profile Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-60 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800/90 shadow-2xl shadow-black/80 ring-1 ring-white/5 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* User Details Header */}
          <div className="px-3 py-2 border-b border-zinc-800/80 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-100 truncate block">
                {displayName}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40 uppercase">
                Live
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate font-mono">
              {displayEmail}
            </p>
          </div>

          {/* Quick Route Links */}
          <div className="py-1 px-1 space-y-0.5">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
              <span>Overview Telemetry</span>
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Workspace Settings</span>
            </Link>

            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>Public Website</span>
            </Link>
          </div>

          {/* Security & Logout Section */}
          <div className="pt-1 px-1 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors cursor-pointer group"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
