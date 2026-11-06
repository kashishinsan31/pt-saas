import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED, formatDubaiDate, getDaysRemaining } from '../../utils/dubaiTime';
import { DashboardSlider } from '../common/DashboardSlider';
import {
  Users,
  UserCheck,
  Package,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const {
    clients,
    trainers,
    clientPackages,
    bookings,
    payments,
    subscriptions,
    auditLogs,
  } = useApp();

  const todayStr = formatDubaiDate(new Date());

  // Metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const inactiveClients = clients.filter((c) => c.status === 'Inactive').length;

  const totalTrainers = trainers.length;
  const activePackages = clientPackages.filter((p) => p.status === 'Active').length;

  const todaySessions = bookings.filter((b) => b.sessionDate === todayStr);
  const upcomingSessions = bookings.filter((b) => b.sessionDate >= todayStr && b.status === 'Scheduled');
  const completedSessions = bookings.filter((b) => b.status === 'Completed').length;
  const cancelledSessions = bookings.filter((b) => b.status.includes('Cancelled') || b.status === 'Late Cancellation').length;

  const monthlyRevenue = payments
    .filter((p) => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amountPaidAED, 0);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'Pending' || p.status === 'Partially Paid').length;
  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === 'Active').length;
  const failedPaymentsCount = payments.filter((p) => p.status === 'Failed').length;

  const expiringPackages = clientPackages.filter((p) => {
    if (p.status !== 'Active') return false;
    const days = getDaysRemaining(p.expiryDate);
    return days >= 0 && days <= 7;
  });

  const remainingSessionCredits = clientPackages
    .filter((p) => p.status === 'Active')
    .reduce((sum, p) => sum + p.remainingSessions, 0);

  return (
    <div className="space-y-6">
      {/* Operations Workload Automation Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-2 border-indigo-500/30 rounded-2xl p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
            <Zap className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                WORKLOAD REDUCTION
              </span>
              <span className="text-xs text-indigo-200 font-bold">Smart Operations Control</span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5">
              Automated Operations & Daily Workload Dispatch Center
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Auto-send WhatsApp daily reminders, optimize Dubai trainer travel routes, & enforce pre-session health safety.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('ops')}
          className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 shrink-0 transition-transform hover:scale-105 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>Launch Operations Hub</span>
        </button>
      </div>

      {/* Interactive Hero Slider */}
      <DashboardSlider onActionClick={(tab) => onNavigateTab(tab)} />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total Clients */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalClients}</div>
          <div className="mt-1 flex items-center text-xs text-slate-500 space-x-1">
            <span className="text-emerald-600 font-bold">{activeClients} Active</span>
            <span>•</span>
            <span className="text-slate-400">{inactiveClients} Inactive</span>
          </div>
        </div>

        {/* Active Packages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Packages</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activePackages}</div>
          <div className="mt-1 text-xs text-purple-700 font-medium">30-day strict expiry active</div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{formatAED(monthlyRevenue)}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>Stripe & Bank Collections</span>
          </div>
        </div>

        {/* Remaining Credits */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Wallet</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{remainingSessionCredits}</div>
          <div className="mt-1 text-xs text-amber-700 font-medium">Total active credits</div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeSubscriptionsCount}</div>
          <div className="mt-1 text-xs text-indigo-600 font-medium">Auto-renewing Stripe</div>
        </div>
      </div>

      {/* Secondary Detailed Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Today's Sessions</div>
          <div className="text-xl font-extrabold text-blue-900 mt-1">{todaySessions.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Upcoming</div>
          <div className="text-xl font-extrabold text-indigo-900 mt-1">{upcomingSessions.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Completed</div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{completedSessions}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Cancelled</div>
          <div className="text-xl font-extrabold text-slate-700 mt-1">{cancelledSessions}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Expiring (7 Days)</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{expiringPackages.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Failed Payments</div>
          <div className="text-xl font-extrabold text-red-600 mt-1">{failedPaymentsCount}</div>
        </div>
      </div>

      {/* Action Center & Attention Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Packages Alert Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Packages Nearing 30-Day Expiry</h3>
            </div>
            <button
              onClick={() => onNavigateTab('packages')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Manage Packages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {expiringPackages.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">No active packages expiring within 7 days.</div>
          ) : (
            <div className="space-y-3">
              {expiringPackages.map((pkg) => {
                const client = clients.find((c) => c.id === pkg.clientId);
                const daysLeft = getDaysRemaining(pkg.expiryDate);
                return (
                  <div
                    key={pkg.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{client?.fullName || 'Client'}</div>
                      <div className="text-[11px] text-slate-600">
                        {pkg.packageName} • {pkg.remainingSessions} credits remaining
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="bg-amber-200 text-amber-900 font-extrabold text-[11px] px-2.5 py-1 rounded-md">
                        {daysLeft === 0 ? 'Expires Today!' : `${daysLeft} days left`}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">Expiry: {pkg.expiryDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Audit Log Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Live Audit Log</h3>
            </div>
            <button
              onClick={() => onNavigateTab('settings')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View Full Logs
            </button>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-200/60">
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span className="font-bold text-slate-700 uppercase">{log.action}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai' })} GST</span>
                </div>
                <div className="text-slate-800 font-medium mt-1">{log.details}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">By {log.userName} ({log.userRole})</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
