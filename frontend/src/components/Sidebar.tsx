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
  const [hasInstagram, setHasInstagram] = React.useState(false);

  React.useEffect(() => {
    if (!activeBusiness?.id) {
      setHasInstagram(false);
      return;
    }
    let isMounted = true;
    import('../api/instagramApi')
      .then(({ instagramApi }) => instagramApi.listAccounts(activeBusiness.id))
      .then((accounts) => {
        if (isMounted) setHasInstagram(accounts.length > 0);
      })
      .catch(() => {
        if (isMounted) setHasInstagram(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id]);

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-[#262626] flex flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0 font-sans">
      {/* Top Header / Logo */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#262626]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] font-bold text-xs tracking-tight group-hover:bg-neutral-200 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
              </svg>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-medium text-sm tracking-tight text-white">
                Rep<span className="text-[#a3a3a3] font-light">Scan</span>
              </span>
              <span className="text-[10px] text-[#737373] font-mono ml-0.5">v2.4</span>
            </div>
          </Link>

          <Link
            to="/"
            title="Return to Website"
            className="text-xs font-medium text-[#a3a3a3] hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 rounded-full hover:bg-[#171717]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Navigation List — Pill Shape (Design.md) */}
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
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1f1f1f] text-white border border-[#262626]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#171717] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-white' : 'text-[#a3a3a3]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="badge-action-green text-[9px] px-1.5 py-0.2">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Business & Platform Section */}
      <div className="p-4 border-t border-[#262626] space-y-3 bg-[#0a0a0a]">
        {/* Active Business Summary Card */}
        <div className="p-3 rounded-2xl bg-[#171717] border border-[#262626] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider font-mono flex items-center gap-1">
              <Building className="w-3 h-3 text-[#737373]" />
              Active Entity
            </span>
            <span className="badge-success text-[9px] py-0 px-1.5">LIVE</span>
          </div>
          <div className="text-xs font-medium text-white truncate">
            {activeBusiness?.name || 'No business selected'}
          </div>
        </div>

        {/* Connected Channels List */}
        <div className="space-y-1 text-xs">
          <div className="px-1 pb-0.5">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider font-mono block">
              Channels
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-[#171717] border border-[#262626] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#1f1f1f] text-white font-mono font-bold text-[9px] flex items-center justify-center border border-[#262626]">
                G
              </span>
              <span className="text-white">Google Maps</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          </div>

          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-[#171717] border border-[#262626] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#1f1f1f] text-white font-mono font-bold text-[9px] flex items-center justify-center border border-[#262626]">
                IG
              </span>
              <span className={hasInstagram ? "text-white" : "text-[#737373]"}>Instagram</span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${hasInstagram ? "bg-[#22c55e]" : "bg-[#737373]"}`} />
          </div>
        </div>

        {/* Add Platform Action */}
        <NavLink
          to="/dashboard/settings"
          className="btn-pill-secondary w-full text-xs justify-center py-2"
        >
          <Plus className="w-3.5 h-3.5 text-[#a3a3a3]" />
          <span>Platform Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
