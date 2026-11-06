import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED } from '../../utils/dubaiTime';
import { exportToCSV, exportToPDFPrint } from '../../utils/exportUtils';
import { FileBarChart, Download, Printer, DollarSign, Users, Award, TrendingUp, AlertTriangle } from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { currentUser, clients, trainers, clientPackages, bookings, payments, subscriptions } = useApp();

  const isTrainer = currentUser?.role === 'trainer';
  const trainerId = currentUser?.associatedId;

  const accessibleClients = isTrainer
    ? clients.filter((c) => c.assignedTrainerId === trainerId)
    : clients;

  const accessibleBookings = isTrainer
    ? bookings.filter((b) => b.trainerId === trainerId)
    : bookings;

  const accessibleClientIds = accessibleClients.map((c) => c.id);

  const accessiblePackages = isTrainer
    ? clientPackages.filter((p) => accessibleClientIds.includes(p.clientId))
    : clientPackages;

  const accessibleTrainers = isTrainer
    ? trainers.filter((t) => t.id === trainerId)
    : trainers;

  const totalRevenue = payments.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + p.amountPaidAED, 0);
  const outstandingRevenue = payments
    .filter((p) => p.status === 'Pending' || p.status === 'Partially Paid')
    .reduce((sum, p) => sum + p.outstandingBalanceAED, 0);

  const completedSessionsCount = accessibleBookings.filter((b) => b.status === 'Completed').length;
  const lateCancellationsCount = accessibleBookings.filter((b) => b.status === 'Late Cancellation').length;
  const trainerCancellationsCount = accessibleBookings.filter((b) => b.status === 'Cancelled by Trainer').length;
  const noShowsCount = accessibleBookings.filter((b) => b.status === 'No Show').length;

  const expiredPackagesCount = accessiblePackages.filter((p) => p.status === 'Expired').length;
  const expiredCreditsCount = accessiblePackages.reduce((sum, p) => sum + p.expiredSessions, 0);
  const totalRemainingCredits = accessiblePackages
    .filter((p) => p.status === 'Active')
    .reduce((sum, p) => sum + p.remainingSessions, 0);

  // Client Retention Ratio Calculations
  const clientRetentionStats = accessibleClients.map((c) => {
    const cPkgs = clientPackages.filter((p) => p.clientId === c.id);
    const hasActiveSub = subscriptions.some((s) => s.clientId === c.id && s.status === 'Active');
    const activePkg = cPkgs.find((p) => p.status === 'Active');
    const progress = activePkg ? activePkg.completedSessions / activePkg.totalSessions : 0;
    const isRetained = cPkgs.length >= 2 || hasActiveSub || progress >= 0.5;
    return { clientId: c.id, isRetained, pkgCount: cPkgs.length };
  });

  const retainedClientsCount = clientRetentionStats.filter((s) => s.isRetained).length;
  const overallRetentionRatioPct = accessibleClients.length > 0
    ? ((retainedClientsCount / accessibleClients.length) * 100).toFixed(1)
    : '0';

  const handleExportCSV = () => {
    const headers = ['Report Category', 'Metric Name', 'Value / Amount (AED)'];
    const rows = [
      ['Retention', 'Total Client Count', accessibleClients.length],
      ['Retention', 'Retained Clients Count', retainedClientsCount],
      ['Retention', 'Overall Retention Ratio (%)', `${overallRetentionRatioPct}%`],
      ['Financial', 'Total Collections', totalRevenue],
      ['Financial', 'Outstanding Balance', outstandingRevenue],
      ['Financial', 'Active Subscriptions Count', subscriptions.filter((s) => s.status === 'Active').length],
      ['Sessions', 'Completed Sessions', completedSessionsCount],
      ['Sessions', 'Late Cancellations', lateCancellationsCount],
      ['Sessions', 'Trainer Cancellations', trainerCancellationsCount],
      ['Sessions', 'No-Shows', noShowsCount],
      ['Credits', 'Expired Packages Count', expiredPackagesCount],
      ['Credits', 'Expired Session Credits Total', expiredCreditsCount],
      ['Credits', 'Active Remaining Session Credits', totalRemainingCredits],
    ];
    exportToCSV('Waiter_Walk_Executive_Business_Report', headers, rows);
  };

  const handlePrintPDF = () => {
    const reportHtml = `
      <div style="font-size: 13px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; pb-2;">Executive Operations & Financial Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 10px; text-align: left;">Category</th>
              <th style="padding: 10px; text-align: left;">Metric</th>
              <th style="padding: 10px; text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Client Retention</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Overall Client Retention Ratio</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #166534;">${overallRetentionRatioPct}% (${retainedClientsCount}/${accessibleClients.length})</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Revenue</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Total Verified Collections</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">AED ${totalRevenue.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Subscriptions</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Active Stripe Subscriptions</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${subscriptions.filter((s) => s.status === 'Active').length}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Attendance</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Completed Training Sessions</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${completedSessionsCount}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Compliance</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Late Cancellations (&lt;12h)</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${lateCancellationsCount}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Credit Wallets</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Expired Unused Credits (30-day rule)</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${expiredCreditsCount}</td></tr>
          </tbody>
        </table>
      </div>
    `;
    exportToPDFPrint('Executive_Business_Report', reportHtml);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Executive Reports & Business Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive business performance overview for Waiter Walk Fitness & Wellness.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* CLIENT RETENTION RATIO KPI HERO CARD */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-500/30">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              CLIENT RETENTION ANALYTICS
            </span>
            <span className="text-xs text-emerald-200">Active vs Recurring Clients</span>
          </div>
          <h3 className="text-2xl font-black text-white">
            Overall Retention Ratio: <span className="text-emerald-400">{overallRetentionRatioPct}%</span>
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Calculated from clients holding $\ge 2$ package renewals, active auto-pay subscriptions, or active packages with &gt;50% completed sessions.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-400">{retainedClientsCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-300">Retained Clients</div>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">{accessibleClients.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-300">Total Clients</div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className={`grid grid-cols-1 ${currentUser?.role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        {currentUser?.role === 'admin' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase">Financial Metrics</div>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Total Collections:</span>
                <span className="font-extrabold text-slate-900">{formatAED(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Outstanding Revenue:</span>
                <span className="font-bold text-amber-700">{formatAED(outstandingRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Active Subscriptions:</span>
                <span className="font-bold text-blue-700">{subscriptions.filter((s) => s.status === 'Active').length}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Session Attendance Metrics</div>
          <div className="mt-3 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Completed Sessions:</span>
              <span className="font-extrabold text-emerald-700">{completedSessionsCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Late Cancellations (&lt;12h):</span>
              <span className="font-bold text-red-600">{lateCancellationsCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Trainer Cancellations:</span>
              <span className="font-bold text-amber-700">{trainerCancellationsCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">No Shows Recorded:</span>
              <span className="font-bold text-red-700">{noShowsCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">30-Day Expiry & Wallet Metrics</div>
          <div className="mt-3 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Expired Packages:</span>
              <span className="font-bold text-slate-700">{expiredPackagesCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Expired Unused Credits:</span>
              <span className="font-bold text-red-600">{expiredCreditsCount} Credits</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Active Remaining Credits:</span>
              <span className="font-extrabold text-emerald-700">{totalRemainingCredits} Credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRAINER PERFORMANCE SCORECARD & MATRIX TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Trainer Performance Scorecard & Matrix</h3>
            <p className="text-xs text-slate-500">Evaluates client retention ratio per trainer, client star score, and completion reliability.</p>
          </div>
          <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Performance Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Trainer Name</th>
                <th className="py-3 px-3">Specialization</th>
                <th className="py-3 px-3">Assigned Clients</th>
                <th className="py-3 px-3">Retention Rate</th>
                <th className="py-3 px-3">Avg Client Rating</th>
                <th className="py-3 px-3">Completion Rate</th>
                <th className="py-3 px-3">Performance Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {accessibleTrainers.map((t) => {
                const assigned = clients.filter((c) => c.assignedTrainerId === t.id);
                const assignedRetained = assigned.filter((c) => {
                  const stat = clientRetentionStats.find((s) => s.clientId === c.id);
                  return stat?.isRetained;
                }).length;

                const trainerRetentionPct = assigned.length > 0
                  ? ((assignedRetained / assigned.length) * 100).toFixed(0)
                  : '100';

                const tBookings = bookings.filter((b) => b.trainerId === t.id);
                const completed = tBookings.filter((b) => b.status === 'Completed').length;
                const totalAttempted = tBookings.filter((b) => ['Completed', 'Late Cancellation', 'No Show'].includes(b.status)).length;
                const completionRatePct = totalAttempted > 0
                  ? ((completed / totalAttempted) * 100).toFixed(0)
                  : '100';

                const ratedBookings = tBookings.filter((b) => b.trainerRating);
                const avgRatingNum = ratedBookings.length > 0
                  ? (ratedBookings.reduce((sum, b) => sum + (b.trainerRating || 0), 0) / ratedBookings.length)
                  : 5.0;

                const ratingBadge = Number(trainerRetentionPct) >= 75 && avgRatingNum >= 4.8
                  ? { label: '🏆 Top Performer', bg: 'bg-amber-100 text-amber-900 border-amber-300' }
                  : Number(trainerRetentionPct) >= 60 && avgRatingNum >= 4.5
                  ? { label: '🌟 Excellent', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
                  : { label: '👍 Good', bg: 'bg-blue-100 text-blue-900 border-blue-300' };

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-extrabold text-slate-900">{t.fullName}</td>
                    <td className="py-3 px-3 text-slate-600">{t.specialization}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{assigned.length} Clients</td>
                    <td className="py-3 px-3 font-extrabold text-emerald-700">
                      {trainerRetentionPct}% ({assignedRetained}/{assigned.length})
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-700">
                      ⭐ {avgRatingNum.toFixed(1)} / 5 ({ratedBookings.length} reviews)
                    </td>
                    <td className="py-3 px-3 font-bold text-blue-900">{completionRatePct}%</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${ratingBadge.bg}`}>
                        {ratingBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
