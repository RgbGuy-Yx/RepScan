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
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-[#23252a] bg-[#0f1011] hover:bg-[#141516] hover:border-[#34343a] transition-all cursor-pointer group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#5e6ad2] to-[#828fff] text-white font-semibold text-xs flex items-center justify-center shadow-[0_0_10px_rgba(94,106,210,0.3)]">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0f1011]" />
        </div>

        <span className="text-xs font-medium text-[#d0d6e0] group-hover:text-white max-w-[100px] truncate hidden md:inline-block">
          {displayName}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8a8f98] group-hover:text-[#f7f8f8] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#f7f8f8]' : ''
          }`}
        />
      </button>

      {/* Hover / Click Profile Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 rounded-xl bg-[#0f1011] border border-[#23252a] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* User Details Header */}
          <div className="px-3.5 py-2.5 border-b border-[#23252a] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f7f8f8] truncate block">
                {displayName}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-[#8a8f98] truncate font-mono">
              {displayEmail}
            </p>
          </div>

          {/* Quick Route Links */}
          <div className="py-1.5 px-1 space-y-0.5">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span>Dashboard Telemetry</span>
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-[#8a8f98]" />
              <span>Platform Settings</span>
            </Link>

            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[#18191a] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#8a8f98]" />
              <span>Public Website</span>
            </Link>
          </div>

          {/* Security & Logout Section */}
          <div className="pt-1.5 px-1 border-t border-[#23252a]">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer group"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
