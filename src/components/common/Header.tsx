import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  LogOut,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab?: string;
  onToggleSidebarMobile?: () => void;
  onOpenNotifications?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  ops: 'Operations & Workload Automation',
  clients: 'Clients Directory',
  trainers: 'Trainer Team',
  packages: 'Packages & Billing',
  sessions: 'Sessions Schedule',
  calendar: 'Session Calendar',
  payments: 'Payments & Receipts',
  subscriptions: 'Client Subscriptions',
  credits: 'Session Credits',
  reports: 'Reports & Analytics',
  settings: 'System Settings',
  tests: 'System Test Suite',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  onToggleSidebarMobile,
  onOpenNotifications,
}) => {
  const { currentUser, logout, loginAsRole, notifications, trainers, clients } = useApp();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const activeTitle = TAB_TITLES[activeTab] || 'Dashboard';

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'trainer':
        return 'Trainer';
      case 'client':
        return 'Client';
      default:
        return 'User';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'trainer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left side: Mobile Menu + App Logo + User Avatar + Title */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          {onToggleSidebarMobile && (
            <button
              onClick={onToggleSidebarMobile}
              className="lg:hidden w-10 h-10 rounded-2xl bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-800 transition-colors focus:outline-none shrink-0"
              aria-label="Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}

          {/* App Brand Logo */}
          <div className="flex items-center shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-white p-0.5 shadow-sm flex items-center justify-center border border-slate-200">
              <img src="/logo.png" alt="Waiter Walk Fitness Logo" className="w-9 h-9 object-contain" />
            </div>
          </div>

          {/* User Avatar with active status indicator */}
          <div className="relative shrink-0 hidden xs:block">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold text-sm flex items-center justify-center border-2 border-white shadow-xs">
                {currentUser?.name?.slice(0, 2).toUpperCase() || 'WW'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </div>

          {/* Stacked Native App Bar Typography */}
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                {getRoleDisplayName(currentUser?.role)} Portal
              </span>
              <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-full">
                Dubai
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                Waiter Walk Fitness
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Admin Portal Switcher OR Static Role Badge (Strictly no switching in trainer/client portals) */}
        {currentUser?.role === 'admin' ? (
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center space-x-1.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 px-3 py-1.5 rounded-full border border-slate-200/80 transition-all cursor-pointer text-xs font-bold shadow-2xs"
              title="Admin Portal Switcher"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="capitalize">{currentUser?.role || 'Admin'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800 animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Admin Switcher
                </div>
                <button
                  onClick={() => {
                    loginAsRole('admin');
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-purple-50 transition-colors ${
                    currentUser?.role === 'admin' ? 'bg-purple-50 font-bold text-purple-900' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <span>Admin Portal</span>
                  </div>
                  {currentUser?.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </button>

                <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 border-t border-slate-100 pt-2">
                  Trainers
                </div>
                {trainers.length === 0 ? (
                  <div className="px-4 py-2 text-[11px] text-slate-400 italic">No trainers registered yet</div>
                ) : (
                  trainers.map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => {
                        loginAsRole('trainer', tr.id);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        currentUser?.associatedId === tr.id ? 'bg-blue-50 font-bold text-blue-900' : ''
                      }`}
                    >
                      <span>{tr.fullName} ({tr.specialization || 'Personal Trainer'})</span>
                      {currentUser?.associatedId === tr.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))
                )}

                <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 border-t border-slate-100 pt-2">
                  Clients
                </div>
                {clients.length === 0 ? (
                  <div className="px-4 py-2 text-[11px] text-slate-400 italic">No clients registered yet</div>
                ) : (
                  clients.map((cl) => (
                    <button
                      key={cl.id}
                      onClick={() => {
                        loginAsRole('client', cl.id);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                        currentUser?.associatedId === cl.id ? 'bg-emerald-50 font-bold text-emerald-900' : ''
                      }`}
                    >
                      <span>{cl.fullName} ({cl.communityName || 'Dubai'})</span>
                      {currentUser?.associatedId === cl.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          /* Trainer & Client Portals: Static role badge only - account switching is completely removed */
          <div className="flex items-center space-x-1.5 bg-slate-100/90 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold select-none">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUser?.role === 'trainer' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            ></span>
            <span className="capitalize">
              {currentUser?.role === 'trainer' ? 'Trainer Portal' : 'Client Portal'}
            </span>
          </div>
        )}

        {/* Right side: Native Actions (Install PWA + Notification Bell + Log Out) */}
        <div className="flex items-center space-x-2 shrink-0">
          <PWAInstallButton variant="header" />

          {/* Notification Bell Button - directly opens Notifications Center */}
          <button
            onClick={onOpenNotifications}
            className="w-10 h-10 rounded-2xl bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-700 relative transition-all cursor-pointer shadow-2xs"
            title="Open Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* Native Log Out Button */}
          <button
            onClick={() => logout()}
            className="h-10 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs font-bold text-xs"
            title="Log Out of Waiter Walk"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4 text-red-600 shrink-0" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
