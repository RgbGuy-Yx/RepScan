import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

interface UserProfileMenuProps {
  align?: 'right' | 'left';
}

export default function UserProfileMenu({ align = 'right' }: UserProfileMenuProps) {
  const { userProfile, logout } = useBusiness();
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

  const displayName =
    userProfile?.name ||
    (userProfile?.email ? userProfile.email.split('@')[0] : 'User');
  const displayEmail = userProfile?.email || '';

  return (
    <div
      ref={menuRef}
      className="relative inline-block font-sans"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#171717] border border-[#262626] hover:border-[#404040] hover:bg-[#1f1f1f] transition-colors cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <span className="w-6 h-6 rounded-full bg-white text-[#0a0a0a] font-medium text-xs flex items-center justify-center">
          {initial}
        </span>
        <span className="text-xs font-medium text-white max-w-[100px] truncate hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown className={`w-3 h-3 text-[#737373] transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* User Details */}
          <div className="px-3 py-2 border-b border-[#262626]">
            <p className="text-xs font-medium text-white truncate">{displayName}</p>
            {displayEmail && (
              <p className="text-[11px] text-[#737373] font-mono truncate mt-0.5">{displayEmail}</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#4ade80] hover:bg-[#1f1f1f] rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
