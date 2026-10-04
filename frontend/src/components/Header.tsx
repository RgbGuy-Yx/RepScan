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
    <header className="h-16 px-6 lg:px-8 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-20">
      {/* Title & Active Business Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-zinc-100 tracking-tight truncate">
              {current.title}
            </h1>
            {activeBusiness && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-zinc-200 font-medium">{activeBusiness.name}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate hidden sm:block font-sans">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Business Selector + Clerk Auth */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Business Selector Dropdown */}
        <div ref={bizDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
            aria-expanded={bizDropdownOpen}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
              bizDropdownOpen
                ? 'border-zinc-700 bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700'
                : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
            <span className="max-w-[140px] truncate">
              {activeBusiness?.name || 'Select Business'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                bizDropdownOpen ? 'rotate-180 text-zinc-200' : ''
              }`}
            />
          </button>

          {bizDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-zinc-800/90 shadow-2xl shadow-black/80 ring-1 ring-white/5 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-zinc-400">
                  Businesses
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
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
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-900/80 transition-colors cursor-pointer ${
                      biz.id === activeBusiness?.id
                        ? 'text-zinc-100 font-medium bg-zinc-900'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-zinc-200">{biz.name}</span>
                      {biz.location && (
                        <span className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">
                          {biz.location}
                        </span>
                      )}
                    </div>
                    {biz.id === activeBusiness?.id && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {onOpenCreateBusiness && (
                <div className="p-1.5 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setBizDropdownOpen(false);
                      onOpenCreateBusiness();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Add new business</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            USER PROFILE WITH HOVER DROPDOWN & LOGOUT
            ───────────────────────────────────────────────────────────── */}
        {isAuthenticated ? (
          <UserProfileMenu align="right" />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/sign-in"
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
