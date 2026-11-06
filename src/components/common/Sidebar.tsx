import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  CalendarDays,
  Calendar,
  CreditCard,
  RefreshCw,
  Wallet,
  FileBarChart,
  Settings,
  CheckCircle2,
  Sparkles,
  X,
  LogOut,
  Zap,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'trainers'
  | 'packages'
  | 'sessions'
  | 'calendar'
  | 'payments'
  | 'subscriptions'
  | 'credits'
  | 'reports'
  | 'ops'
  | 'settings'
  | 'tests';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser, logout } = useApp();
  const role = currentUser?.role || 'admin';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'trainer', 'client'],
    },
    {
      id: 'ops',
      label: 'Ops Automation',
      icon: Zap,
      roles: ['admin', 'trainer'],
      badge: 'SMART HUB',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      roles: ['admin', 'trainer'],
    },
    {
      id: 'trainers',
      label: 'Trainers',
      icon: UserCheck,
      roles: ['admin'],
    },
    {
      id: 'packages',
      label: 'Packages',
      icon: Package,
      roles: ['admin'],
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: CalendarDays,
      roles: ['admin', 'trainer', 'client'],
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      roles: ['admin', 'trainer', 'client'],
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      roles: ['admin', 'client'],
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      icon: RefreshCw,
      roles: ['admin', 'client'],
    },
    {
      id: 'credits',
      label: 'Session Credits',
      icon: Wallet,
      roles: ['admin'],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileBarChart,
      roles: ['admin', 'trainer'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin'],
    },
    {
      id: 'tests',
      label: 'Test Suite (15 Tests)',
      icon: CheckCircle2,
      roles: ['admin', 'trainer', 'client'],
      badge: 'VERIFIER',
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <>
      <div className="px-4 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white p-0.5 shadow-md shrink-0 flex items-center justify-center border border-slate-700/50">
            <img src="/logo.png" alt="Waiter Walk Logo" className="w-9 h-9 object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white tracking-tight truncate">WAITER WALK</h2>
            <p className="text-[10px] text-cyan-400 font-extrabold tracking-wider uppercase truncate">
              {role === 'admin' ? 'Admin Portal' : role === 'trainer' ? 'Trainer Portal' : 'Client Portal'}
            </p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400 space-y-3">
        <PWAInstallButton variant="sidebar" />

        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            logout();
          }}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 transition-all cursor-pointer shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out / Sign Out</span>
        </button>

        <div>
          <div className="font-semibold text-slate-300">WAITER WALK FITNESS</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dubai, UAE • AED (GST)</div>
          <div className="mt-1.5 text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700/60">
            Strict 30-Day Expiry & 12h Cancellation Policy
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex-col border-r border-slate-800 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>

          {/* Drawer Sidebar */}
          <aside className="relative w-72 bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
