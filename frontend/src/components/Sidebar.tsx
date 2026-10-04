import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Tag,
  BarChart2,
  Settings,
  Target,
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
  { path: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  { path: '/dashboard/competitors', label: 'Competitors', icon: Target },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activeBusiness } = useBusiness();
  const location = useLocation();

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0">
      {/* Top Header / Logo */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800/80">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 font-bold text-xs tracking-tight group-hover:bg-white transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                Rep<span className="text-zinc-400 font-normal">Scan</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono ml-0.5">v2.4</span>
            </div>
          </Link>

          <Link
            to="/"
            title="Return to Website"
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-100 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-zinc-900"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-0.5" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Business & Platform Section */}
      <div className="p-3.5 border-t border-zinc-800/80 space-y-3 bg-zinc-950">
        {/* Active Business Summary */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1">
              <Building className="w-3 h-3 text-zinc-500" />
              Active Entity
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200">
            <span className="truncate">{activeBusiness?.name || 'No business selected'}</span>
          </div>
        </div>

        {/* Connected Channels list */}
        <div className="space-y-1 text-xs">
          <div className="px-0.5 pb-0.5">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider font-mono block">
              Channels
            </span>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded-md text-zinc-400 hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-zinc-900 text-zinc-300 font-mono font-bold text-[9px] flex items-center justify-center border border-zinc-800">
                G
              </span>
              <span className="text-zinc-300">Google Maps</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
          </div>

          <div className="flex items-center justify-between py-1 px-2 rounded-md text-zinc-400 hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-zinc-900 text-zinc-400 font-mono font-bold text-[9px] flex items-center justify-center border border-zinc-800">
                IG
              </span>
              <span className="text-zinc-400">Instagram</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">OFF</span>
          </div>

          <div className="flex items-center justify-between py-1 px-2 rounded-md text-zinc-400 hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-zinc-900 text-zinc-400 font-mono font-bold text-[9px] flex items-center justify-center border border-zinc-800">
                IN
              </span>
              <span className="text-zinc-400">LinkedIn</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">OFF</span>
          </div>
        </div>

        {/* Add Platform Action */}
        <NavLink
          to="/dashboard/settings"
          className="w-full py-1.5 px-2.5 rounded-md border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors bg-zinc-900/40 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-400" />
          <span>Platform Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
