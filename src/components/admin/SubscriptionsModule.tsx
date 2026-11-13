import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED, formatDubaiDate } from '../../utils/dubaiTime';
import {
  RefreshCw,
  CreditCard,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  XCircle,
  Zap,
  CheckCircle,
  AlertCircle,
  Table,
  LayoutGrid,
  Search,
  Filter,
} from 'lucide-react';

export const SubscriptionsModule: React.FC = () => {
  const {
    subscriptions,
    clients,
    payments,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    triggerAutoDeductionRenewal,
    runAutoPaySweepEngine,
  } = useApp();

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Pending' | 'Payment Failed' | 'Cancelled'>('all');
  const [autoPayLogFilter, setAutoPayLogFilter] = useState<'all' | 'Paid' | 'Failed'>('all');

  const [loadingSubId, setLoadingSubId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepReport, setSweepReport] = useState<{ count: number; details: string[] } | null>(null);

  const handleRunSweep = async () => {
    setIsSweeping(true);
    setSweepReport(null);
    const res = await runAutoPaySweepEngine();
    setIsSweeping(false);
    setSweepReport({ count: res.processedCount, details: res.details });
  };

  const handleTestAutoPay = async (subId: string, clientId: string, packageDefId?: string) => {
    setLoadingSubId(subId);
    setFeedbackMsg(null);
    const res = await triggerAutoDeductionRenewal(clientId, packageDefId);
    setLoadingSubId(null);
    if (res.success) {
      setFeedbackMsg({
        id: subId,
        type: 'success',
        text: `Auto-Pay Authorized! ${res.message}`,
      });
    } else {
      setFeedbackMsg({
        id: subId,
        type: 'error',
        text: `Auto-Pay Failed: ${res.message}`,
      });
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const client = clients.find((c) => c.id === sub.clientId);
    const matchesSearch =
      sub.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client && client.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client && client.communityName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Stripe Recurring Subscriptions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated 30-day card billing engine. Strictly 1 active subscription per client account maximum.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Stripe Billing Active</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg flex items-center space-x-1 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client or package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-600 shrink-0">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="p-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Subscriptions ({subscriptions.length})</option>
              <option value="Active">Active ({subscriptions.filter((s) => s.status === 'Active').length})</option>
              <option value="Pending">Paused / Pending ({subscriptions.filter((s) => s.status === 'Pending').length})</option>
              <option value="Payment Failed">Payment Failed ({subscriptions.filter((s) => s.status === 'Payment Failed').length})</option>
              <option value="Cancelled">Cancelled ({subscriptions.filter((s) => s.status === 'Cancelled').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auto-Pay Engine Diagnostic & Continuous Sweep Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 text-white shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                  Continuous Scheduler Active
                </span>
                <span className="text-xs text-indigo-200 font-mono font-bold">
                  {formatDubaiDate(new Date())} • Asia/Dubai GST
                </span>
              </div>
              <h3 className="text-sm font-black text-white mt-1">
                Automated Auto-Pay Deduction & Validity Expiry Sweeper
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed">
                Auto-pay charges saved cards <strong>strictly when package validity expires</strong> (or sessions reach 0). Sweeps continuously on app startup and every 30 seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              disabled={isSweeping}
              onClick={handleRunSweep}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-transform hover:scale-105 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSweeping ? 'animate-spin' : ''}`} />
              <span>{isSweeping ? 'Sweeping System...' : 'Run Auto-Pay Sweep Engine Now'}</span>
            </button>
          </div>
        </div>

        {/* Sweep Diagnostics Report */}
        {sweepReport && (
          <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 space-y-2 text-xs font-mono animate-fadeIn">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span>Diagnostic Sweep Report: {sweepReport.count} renewal{sweepReport.count === 1 ? '' : 's'} processed</span>
              <button
                type="button"
                onClick={() => setSweepReport(null)}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Close Report
              </button>
            </div>
            <div className="space-y-1 text-[11px] text-slate-200">
              {sweepReport.details.map((d, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <span>•</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-bold">{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold underline cursor-pointer ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabular Form View (Default) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Client & ID</th>
                  <th className="py-3.5 px-4">Recurring Package</th>
                  <th className="py-3.5 px-4">Amount / Cycle</th>
                  <th className="py-3.5 px-4">Saved Card</th>
                  <th className="py-3.5 px-4">Next Auto Charge</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Stripe Ref</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No matching recurring subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const client = clients.find((c) => c.id === sub.clientId);
                    const isThisLoading = loadingSubId === sub.id;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Client & ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0">
                              {client?.fullName?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">
                                {client?.fullName || 'Client'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sub.clientId} • {sub.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Recurring Package */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{sub.packageName}</div>
                          <div className="text-[10px] text-slate-400">30-Day Auto Renewal</div>
                        </td>

                        {/* Amount / Cycle */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">{formatAED(sub.amountAED)}</div>
                          <div className="text-[10px] text-emerald-700 font-extrabold">5% VAT Included</div>
                        </td>

                        {/* Saved Card */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800 flex items-center space-x-1">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{sub.cardBrand} •••• {sub.last4Digits}</span>
                          </div>
                        </td>

                        {/* Next Auto Charge */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 inline-block text-[11px]">
                            {sub.nextPaymentDate}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                              sub.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : sub.status === 'Payment Failed'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : sub.status === 'Cancelled'
                                ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>

                        {/* Stripe Ref */}
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                          {sub.stripeSubscriptionId.slice(0, 14)}...
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {sub.status === 'Active' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTestAutoPay(sub.id, sub.clientId, sub.packageDefinitionId)}
                                  disabled={isThisLoading}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-extrabold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Trigger immediate Stripe auto-pay charge test"
                                >
                                  {isThisLoading ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3 text-amber-300" />
                                  )}
                                  <span>{isThisLoading ? 'Testing...' : 'Test Auto-Pay'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => pauseSubscription(sub.id)}
                                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                  title="Pause auto-deduction billing"
                                >
                                  <PauseCircle className="w-3 h-3" />
                                  <span>Pause</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => cancelSubscription(sub.id)}
                                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                  title="Cancel subscription"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : sub.status === 'Pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => resumeSubscription(sub.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                  <span>Resume</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelSubscription(sub.id)}
                                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                  title="Cancel subscription"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : sub.status === 'Payment Failed' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTestAutoPay(sub.id, sub.clientId, sub.packageDefinitionId)}
                                  disabled={isThisLoading}
                                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-extrabold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                                  title="Retry automatic Stripe charge"
                                >
                                  {isThisLoading ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3 text-amber-300" />
                                  )}
                                  <span>{isThisLoading ? 'Retrying...' : 'Retry Auto-Pay'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelSubscription(sub.id)}
                                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                  title="Cancel subscription"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Cancelled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card Grid View Option */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSubscriptions.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No matching recurring subscriptions found.
            </div>
          ) : (
            filteredSubscriptions.map((sub) => {
              const client = clients.find((c) => c.id === sub.clientId);
              const isThisLoading = loadingSubId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{sub.id}</span>
                        <h3 className="font-extrabold text-slate-900 text-base">{client?.fullName || 'Client'}</h3>
                        <p className="text-xs text-slate-500">{client?.communityName}</p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          sub.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'Payment Failed'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : sub.status === 'Cancelled'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Recurring Package:</span>
                        <span className="font-bold text-slate-900">{sub.packageName}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Subscription Amount:</span>
                        <span className="font-black text-slate-900">{formatAED(sub.amountAED)} / 30 Days</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Saved Card:</span>
                        <span className="font-mono font-semibold text-slate-800 flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <span>{sub.cardBrand} •••• {sub.last4Digits}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                        <span className="text-slate-500">Next Automatic Charge:</span>
                        <span className="font-bold text-amber-800">{sub.nextPaymentDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {sub.status === 'Active' ? (
                      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                        <button
                          type="button"
                          onClick={() => handleTestAutoPay(sub.id, sub.clientId, sub.packageDefinitionId)}
                          disabled={isThisLoading}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                        >
                          {isThisLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          <span>{isThisLoading ? 'Testing Auto-Pay...' : 'Test Auto-Pay Renewal'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => pauseSubscription(sub.id)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelSubscription(sub.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : sub.status === 'Pending' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => resumeSubscription(sub.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Resume Subscription</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelSubscription(sub.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : sub.status === 'Payment Failed' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleTestAutoPay(sub.id, sub.clientId, sub.packageDefinitionId)}
                          disabled={isThisLoading}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                        >
                          {isThisLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          <span>{isThisLoading ? 'Retrying...' : 'Retry Auto-Pay'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelSubscription(sub.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">Subscription Cancelled</span>
                    )}

                    <span className="text-[10px] text-slate-400 font-mono">
                      Stripe ID: {sub.stripeSubscriptionId.slice(0, 15)}...
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Auto-Pay Recurring Billing Transaction Log (Success & Failed Charges) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Auto-Pay Recurring Charge Log (Successful & Failed Transactions)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete history of automated 30-day card renewals, live Stripe authorizations, and declined card attempts.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setAutoPayLogFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                autoPayLogFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Logs ({payments.filter((p) => (p.paymentMethod === 'Stripe' || p.status === 'Failed') && p.status !== 'Superseded').length})
            </button>
            <button
              type="button"
              onClick={() => setAutoPayLogFilter('Paid')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                autoPayLogFilter === 'Paid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Successful ({payments.filter((p) => p.paymentMethod === 'Stripe' && p.status === 'Paid').length})
            </button>
            <button
              type="button"
              onClick={() => setAutoPayLogFilter('Failed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                autoPayLogFilter === 'Failed' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Failed / Declined ({payments.filter((p) => p.status === 'Failed').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Payment ID & Timestamp</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Recurring Package</th>
                <th className="py-3 px-4">Financial Breakdown</th>
                <th className="py-3 px-4">Stripe Charge / Error Ref</th>
                <th className="py-3 px-4 text-right">Auto-Pay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payments
                .filter((p) => (p.paymentMethod === 'Stripe' || p.status === 'Failed') && p.status !== 'Superseded')
                .filter((p) => autoPayLogFilter === 'all' || p.status === autoPayLogFilter)
                .length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No auto-pay transaction logs found matching filter.
                  </td>
                </tr>
              ) : (
                payments
                  .filter((p) => (p.paymentMethod === 'Stripe' || p.status === 'Failed') && p.status !== 'Superseded')
                  .filter((p) => autoPayLogFilter === 'all' || p.status === autoPayLogFilter)
                  .sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.paymentDate || 0).getTime() || 0;
                    const timeB = new Date(b.createdAt || b.paymentDate || 0).getTime() || 0;
                    return timeB - timeA;
                  })
                  .map((pay) => {
                    const client = clients.find((c) => c.id === pay.clientId);

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-extrabold text-slate-900 text-xs">{pay.id}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(pay.createdAt || pay.paymentDate).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })} GST
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{client?.fullName || `Unmatched (${pay.clientId})`}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{pay.clientId}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{pay.packageName}</div>
                          <div className="text-[10px] text-slate-400">30-Day Auto Renewal</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">{formatAED(pay.amountAED)}</div>
                          <div className="text-[10px] text-slate-500">
                            Base: {formatAED(pay.baseAmountAED || pay.amountAED)} • 5% VAT: {formatAED(pay.vatAmountAED || 0)}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[10px] text-slate-600">
                          {pay.transactionReference || pay.stripePaymentIntentId || 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-black inline-flex items-center space-x-1 ${
                              pay.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : pay.status === 'Failed'
                                ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {pay.status === 'Paid' ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>SUCCESSFUL CHARGE</span>
                              </>
                            ) : pay.status === 'Failed' ? (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span>FAILED / DECLINED</span>
                              </>
                            ) : (
                              <span>{pay.status.toUpperCase()}</span>
                            )}
                          </span>
                          {pay.status === 'Failed' && pay.notes && (
                            <div className="text-[10px] text-red-600 mt-1 max-w-[220px] ml-auto text-right leading-tight">
                              {pay.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
