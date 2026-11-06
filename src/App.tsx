import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { LoginPage } from './components/auth/LoginPage';
import { NotificationsModal } from './components/common/NotificationsModal';

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
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  if (!currentUser) {
    return <LoginPage />;
  }

  const role = currentUser.role;

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
