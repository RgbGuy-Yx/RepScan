import { ChevronDown } from 'lucide-react';
import type { PageId } from '../types/dashboard';
import { MOCK_BUSINESS } from '../mock/dashboardData';

interface HeaderProps {
  activePage: PageId;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: `Good morning, ${MOCK_BUSINESS.user.name}`,
    subtitle: "Real-time reputation telemetry and customer sentiment intelligence.",
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

export default function Header({ activePage }: HeaderProps) {
  const current = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-[#23252a] bg-[#010102]/80 backdrop-blur-md sticky top-0 z-20">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-base font-semibold text-[#f7f8f8] tracking-[-0.02em]">
          {current.title}
        </h1>
        <p className="text-xs text-[#8a8f98] mt-0.5">
          {current.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Date Range Selector */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-colors"
        >
          <span>{MOCK_BUSINESS.currentPeriod}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#62666d]" />
        </button>

        {/* Platform Filter */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#23252a] bg-[#0f1011] text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-colors"
        >
          <span>All Platforms</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#62666d]" />
        </button>

        {/* User Initials Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#18191a] text-[#828fff] font-medium text-xs flex items-center justify-center border border-[#5e6ad2]/30 shadow-[0_0_8px_rgba(94,106,210,0.15)] ml-1">
          {MOCK_BUSINESS.user.initials}
        </div>
      </div>
    </header>
  );
}
