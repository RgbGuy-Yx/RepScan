import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Briefcase,
  Plus,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PageId } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import UserProfileMenu from './UserProfileMenu';

interface HeaderProps {
  activePage: PageId;
  onOpenCreateBusiness?: () => void;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Overview',
    subtitle: 'Customer sentiment and reputation intelligence metrics.',
  },
  'ask-ai': {
    title: 'Assistant',
    subtitle: 'Query reviews with grounded citations.',
  },
  reviews: {
    title: 'Reviews',
    subtitle: 'Normalized customer feedback stream.',
  },
  themes: {
    title: 'Themes',
    subtitle: 'Clustered topics and sentiment distribution.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Weekly executive intelligence briefs.',
  },
  competitors: {
    title: 'Competitors',
    subtitle: 'Discover, track, and benchmark local market intelligence.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Channels, scrape schedules, and workspace.',
  },
};

export default function Header({
  activePage,
  onOpenCreateBusiness,
}: HeaderProps) {
  const current = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;
  const {
    isAuthenticated,
    businesses,
    activeBusiness,
    setActiveBusiness,
  } = useBusiness();

  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const bizDropdownRef = useRef<HTMLDivElement>(null);

  // Close business dropdown on click outside or escape
  useEffect(() => {
    if (!bizDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (bizDropdownRef.current && !bizDropdownRef.current.contains(e.target as Node)) {
        setBizDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBizDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bizDropdownOpen]);

  return (
    <header className="h-16 px-6 lg:px-8 flex items-center justify-between border-b border-[#262626] bg-[#0a0a0a]/85 backdrop-blur-md sticky top-0 z-20 font-sans">
      {/* Title & Active Business Breadcrumb — Editorial Serif Light for Page Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif font-light text-xl text-white tracking-[-0.01em] truncate">
              {current.title}
            </h1>
            {activeBusiness && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-[#171717] text-[#a3a3a3] border border-[#262626]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                <span className="text-white font-medium">{activeBusiness.name}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#a3a3a3] mt-0.5 truncate hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Business Selector Pill + User Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Business Selector Pill Dropdown */}
        <div ref={bizDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
            aria-expanded={bizDropdownOpen}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer select-none ${bizDropdownOpen
                ? 'border-[#404040] bg-[#1f1f1f] text-white'
                : 'border-[#262626] bg-[#171717] hover:bg-[#1f1f1f] hover:border-[#404040] text-[#a3a3a3] hover:text-white'
              }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#a3a3a3]" />
            <span className="max-w-[140px] truncate">
              {activeBusiness?.name || 'Select Business'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#737373] transition-transform duration-200 ${bizDropdownOpen ? 'rotate-180 text-white' : ''
                }`}
            />
          </button>

          {bizDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#171717] border border-[#262626] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 border-b border-[#262626] flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-[#737373]">
                  Businesses
                </span>
                <span className="text-[10px] font-mono text-[#737373]">
                  {businesses.length} total
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto py-1">
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      setActiveBusiness(biz);
                      setBizDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#1f1f1f] transition-colors cursor-pointer ${biz.id === activeBusiness?.id
                        ? 'text-white font-medium bg-[#1f1f1f]'
                        : 'text-[#a3a3a3] hover:text-white'
                      }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-white">{biz.name}</span>
                      {biz.location && (
                        <span className="text-[10px] text-[#737373] truncate font-mono mt-0.5">
                          {biz.location}
                        </span>
                      )}
                    </div>
                    {biz.id === activeBusiness?.id && (
                      <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {onOpenCreateBusiness && (
                <div className="p-2 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => {
                      setBizDropdownOpen(false);
                      onOpenCreateBusiness();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-full text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>Add new business</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        {isAuthenticated ? (
          <UserProfileMenu align="right" />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/sign-in"
              className="px-3 py-1.5 text-xs font-medium text-[#a3a3a3] hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="btn-pill-primary text-xs"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
