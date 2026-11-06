import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from './Sidebar';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  CreditCard,
  Dumbbell,
  BarChart2,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role;

  let tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [];

  if (role === 'admin') {
    tabs = [
      { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'payments', label: 'Payments', icon: CreditCard },
    ];
  } else if (role === 'trainer') {
    tabs = [
      { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'calendar', label: 'Schedule', icon: Calendar },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'sessions', label: 'Sessions', icon: Dumbbell },
      { id: 'reports', label: 'Reports', icon: BarChart2 },
    ];
  } else {
    tabs = [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'sessions', label: 'Bookings', icon: CalendarDays },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'subscriptions', label: 'Auto-Pay', icon: RefreshCw },
    ];
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl px-2 py-1.5 pb-safe">
      <div className={`grid ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-1 max-w-md mx-auto items-center`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] cursor-pointer ${
                isActive
                  ? 'text-blue-600 bg-blue-50/90 font-extrabold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
              aria-label={`Navigate to ${tab.label}`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-tight mt-1 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
