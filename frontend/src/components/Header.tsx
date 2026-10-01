import { useState } from 'react';
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
    title: 'Reputation Telemetry & Live Pulse',
    subtitle: 'Real-time customer sentiment intelligence and semantic anomalies.',
  },
  'ask-ai': {
    title: 'Grounded AI Assistant',
    subtitle: 'Zero-hallucination queries backed directly by PostgreSQL review citations.',
  },
  reviews: {
    title: 'Customer Feedback Stream',
    subtitle: 'Unified multi-channel ingestion stream from Google, Instagram, and LinkedIn.',
  },
  themes: {
    title: 'Theme Analytics & Sentiment',
    subtitle: 'Recurring topic clustering, velocity shifts, and sentiment ratios.',
  },
  'action-board': {
    title: 'Operational Action Board',
    subtitle: 'Translate sentiment anomalies into assigned, trackable team tasks.',
  },
  reports: {
    title: 'Weekly Intelligence Briefs',
    subtitle: 'Automated executive briefs, root cause causality, and statistical shifts.',
  },
  settings: {
    title: 'Platform Connections & Settings',
    subtitle: 'Manage Apify scraping actors, crawl intervals, and business profiles.',
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

  return (
    <header className="h-16 px-6 lg:px-8 flex items-center justify-between border-b border-[#23252a] bg-[#010102]/85 backdrop-blur-md sticky top-0 z-20">
      {/* Title & Active Business Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-[-0.02em] truncate">
              {current.title}
            </h1>
            {activeBusiness && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#141516] text-[#8a8f98] border border-[#23252a]">
                <Briefcase className="w-3 h-3 text-[#5e6ad2]" />
                <span className="text-[#d0d6e0] font-semibold">{activeBusiness.name}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#8a8f98] mt-0.5 truncate hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Business Selector + Clerk Auth */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Business Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setBizDropdownOpen(!bizDropdownOpen);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#23252a] bg-[#0f1011] text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:border-[#34343a] transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[140px] truncate">
              {activeBusiness?.name || 'Select Business'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#62666d]" />
          </button>

          {bizDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0f1011] border border-[#23252a] shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 border-b border-[#23252a] flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#62666d]">
                  Your Businesses
                </span>
                <span className="text-[10px] text-[#8a8f98]">
                  {businesses.length} total
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto py-1">
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      setActiveBusiness(biz);
                      setBizDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#141516] transition-colors ${
                      biz.id === activeBusiness?.id ? 'text-[#f7f8f8] font-semibold bg-[#141516]/60' : 'text-[#8a8f98]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-[#f7f8f8]">{biz.name}</span>
                      {biz.location && (
                        <span className="text-[10px] text-[#62666d] truncate">{biz.location}</span>
                      )}
                    </div>
                    {biz.id === activeBusiness?.id && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {onOpenCreateBusiness && (
                <div className="p-1.5 border-t border-[#23252a]">
                  <button
                    type="button"
                    onClick={() => {
                      setBizDropdownOpen(false);
                      onOpenCreateBusiness();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-[#828fff] hover:bg-[#5e6ad2]/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
              className="px-3 py-1.5 text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="px-3 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-colors shadow-[0_1px_4px_rgba(94,106,210,0.3)]"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
