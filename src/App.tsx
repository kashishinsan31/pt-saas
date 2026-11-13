import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { LoginPage } from './components/auth/LoginPage';
import { NotificationsModal } from './components/common/NotificationsModal';
import { BellRing, CheckCircle2, X } from 'lucide-react';

// Module Imports
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ClientsModule } from './components/admin/ClientsModule';
import { TrainersModule } from './components/admin/TrainersModule';
import { PackagesModule } from './components/admin/PackagesModule';
import { SessionsModule } from './components/admin/SessionsModule';
import { CalendarModule } from './components/admin/CalendarModule';
import { PaymentsModule } from './components/admin/PaymentsModule';
import { SubscriptionsModule } from './components/admin/SubscriptionsModule';
import { SessionCreditsModule } from './components/admin/SessionCreditsModule';
import { ReportsModule } from './components/admin/ReportsModule';
import { OperationsAutomationModule } from './components/admin/OperationsAutomationModule';
import { SettingsModule } from './components/admin/SettingsModule';
import { TestSuiteModule } from './components/admin/TestSuiteModule';

// Role Dashboards
import { TrainerDashboard } from './components/trainer/TrainerDashboard';
import { ClientDashboard } from './components/client/ClientDashboard';

function MainAppContent() {
  const { currentUser, userNotifications, confirmBookingAttendance, markNotificationRead } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const role = currentUser.role;

  // Floating in-app 24h reminder alert toast for logged-in clients
  const activeReminderToast =
    role === 'client'
      ? userNotifications.find(
          (n) => !n.read && n.category === '24h_reminder' && !dismissedToastIds.includes(n.id)
        )
      : undefined;

  const renderTabContent = () => {
    // Shared tabs for all roles
    if (activeTab === 'tests') return <TestSuiteModule />;
    if (activeTab === 'calendar') return <CalendarModule />;
    if (activeTab === 'ops') return <OperationsAutomationModule />;

    // Role Specific
    if (role === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab as any)} />;
        case 'clients':
          return <ClientsModule />;
        case 'trainers':
          return <TrainersModule />;
        case 'packages':
          return <PackagesModule />;
        case 'sessions':
          return <SessionsModule />;
        case 'payments':
          return <PaymentsModule />;
        case 'subscriptions':
          return <SubscriptionsModule />;
        case 'credits':
          return <SessionCreditsModule />;
        case 'reports':
          return <ReportsModule />;
        case 'settings':
          return <SettingsModule />;
        default:
          return <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab as any)} />;
      }
    }

    if (role === 'trainer') {
      switch (activeTab) {
        case 'dashboard':
          return <TrainerDashboard />;
        case 'clients':
          return <ClientsModule />;
        case 'sessions':
          return <SessionsModule />;
        case 'reports':
          return <ReportsModule />;
        default:
          return <TrainerDashboard />;
      }
    }

    if (role === 'client') {
      return <ClientDashboard initialSection={activeTab as any} />;
    }

    return <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      <Header
        activeTab={activeTab}
        onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
      />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-y-auto max-w-full min-w-0">
          {renderTabContent()}
        </main>
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* Non-blocking Floating In-App 24-Hour Session Reminder Alert */}
      {activeReminderToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white">{activeReminderToast.title}</div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {activeReminderToast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedToastIds((prev) => [...prev, activeReminderToast.id])}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                markNotificationRead(activeReminderToast.id);
                setActiveTab('sessions');
                setDismissedToastIds((prev) => [...prev, activeReminderToast.id]);
              }}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              View / Reschedule
            </button>
            {activeReminderToast.bookingId && (
              <button
                type="button"
                onClick={() => {
                  confirmBookingAttendance(activeReminderToast.bookingId!);
                  setDismissedToastIds((prev) => [...prev, activeReminderToast.id]);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Attendance</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
