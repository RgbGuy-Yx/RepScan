import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Tag,
  CheckSquare,
  BarChart2,
  Settings,
  Plus,
  ArrowLeft,
  Building,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/dashboard/ask-ai', label: 'Ask AI', icon: MessageSquare },
  { path: '/dashboard/reviews', label: 'Reviews', icon: FileText },
  { path: '/dashboard/themes', label: 'Themes', icon: Tag },
  { path: '/dashboard/action-board', label: 'Action Board', icon: CheckSquare, badge: 'Beta' },
  { path: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activeBusiness } = useBusiness();
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#080809] border-r border-[#23252a] flex flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0">
      {/* Top Header / Logo */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#23252a]/80">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-[0_1px_4px_rgba(94,106,210,0.4)] group-hover:bg-[#6875e5] transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-[15px] tracking-[-0.03em] text-[#f7f8f8]">
                Rep<span className="text-[#8a8f98] font-normal">Scan</span>
              </span>
              <span className="text-[10px] text-[#62666d] font-mono ml-1">v2.4</span>
            </div>
          </Link>

          <Link
            to="/"
            title="Return to Website"
            className="text-[11px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#141516]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#141516] text-[#f7f8f8] border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#0f1011] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#5e6ad2]' : 'text-[#8a8f98]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Business & Platform Section */}
      <div className="p-3.5 border-t border-[#23252a] space-y-3.5 bg-[#0a0a0b]">
        {/* Active Business Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold text-[#62666d] uppercase tracking-[0.05em] flex items-center gap-1">
              <Building className="w-3 h-3" />
              Active Business
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Live</span>
          </div>
          <div className="w-full flex items-center justify-between px-2.5 py-2 rounded-md bg-[#141516] border border-[#23252a] text-xs font-medium text-[#f7f8f8]">
            <span className="truncate">{activeBusiness?.name || 'No business selected'}</span>
          </div>
        </div>

        {/* Connected Channels list */}
        <div className="space-y-1 text-xs">
          <div className="px-0.5 pb-1">
            <span className="text-[10px] font-semibold text-[#62666d] uppercase tracking-[0.05em] block">
              Connected Channels
            </span>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded-md text-[#8a8f98] hover:bg-[#141516] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-red-950/40 text-red-400 font-bold text-[9px] flex items-center justify-center border border-red-900/30">
                G
              </span>
              <span className="text-[#d0d6e0]">Google Maps</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Live</span>
          </div>

          <div className="flex items-center justify-between py-1 px-2 rounded-md text-[#8a8f98] hover:bg-[#141516] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-pink-950/40 text-pink-400 font-bold text-[9px] flex items-center justify-center border border-pink-900/30">
                IG
              </span>
              <span className="text-[#d0d6e0]">Instagram</span>
            </div>
            <span className="text-[10px] text-[#62666d] font-mono">Standby</span>
          </div>

          <div className="flex items-center justify-between py-1 px-2 rounded-md text-[#8a8f98] hover:bg-[#141516] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-950/40 text-blue-400 font-bold text-[9px] flex items-center justify-center border border-blue-900/30">
                in
              </span>
              <span className="text-[#d0d6e0]">LinkedIn</span>
            </div>
            <span className="text-[10px] text-[#62666d] font-mono">Standby</span>
          </div>
        </div>

        {/* Add Platform Action */}
        <NavLink
          to="/dashboard/settings"
          className="w-full py-1.5 px-2.5 rounded-md border border-dashed border-[#23252a] hover:border-[#3e3e44] text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors bg-[#0f1011]/60 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#8a8f98]" />
          <span>Platform Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
