import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, ArrowUpRight, ArrowDownRight, Edit3, X, Plus, Minus, Check, Calendar, Clock, Sparkles } from 'lucide-react';
import { calculateExpiryDate, formatDubaiDate, getDaysRemaining } from '../../utils/dubaiTime';

export const SessionCreditsModule: React.FC = () => {
  const { clientPackages, clients, transactions, adjustSessionCredits, extendPackageExpiry } = useApp();

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [adjustmentType, setAdjustmentType] = useState<'+' | '-' >('+');
  const [creditAmount, setCreditAmount] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [modalFeedback, setModalFeedback] = useState('');

  // Validity / Expiry Adjustment Modal State
  const [isValidityModalOpen, setIsValidityModalOpen] = useState(false);
  const [validityPkgId, setValidityPkgId] = useState<string>('');
  const [validityExtensionDays, setValidityExtensionDays] = useState<number>(30);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [validityReason, setValidityReason] = useState<string>('');
  const [validityFeedback, setValidityFeedback] = useState<string>('');

  // Selected client object & active package
  const currentClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  
  // Find client's active package or most recent package
  const clientPackagesList = clientPackages.filter((p) => p.clientId === selectedClientId);
  const targetPackage = clientPackagesList.find((p) => p.status === 'Active') || clientPackagesList[0];

  const currentBalance = targetPackage ? targetPackage.remainingSessions : 0;
  const calculatedDelta = adjustmentType === '+' ? creditAmount : -creditAmount;
  const newBalance = Math.max(0, currentBalance + calculatedDelta);

  const openValidityModalForPkg = (pkgId?: string) => {
    const target = pkgId
      ? clientPackages.find((p) => p.id === pkgId)
      : clientPackages.find((p) => p.status === 'Active' || p.status === 'Expired') || clientPackages[0];

    if (target) {
      setValidityPkgId(target.id);
      const newCalculated = calculateExpiryDate(target.expiryDate || formatDubaiDate(new Date()), 30);
      setCustomExpiryDate(newCalculated);
      setValidityExtensionDays(30);
      setValidityReason('Validity adjustment upon expiry');
      setValidityFeedback('');
      setIsValidityModalOpen(true);
    }
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback('');

    if (!adjustReason.trim()) {
      setModalFeedback('Please enter a reason for the manual credit adjustment.');
      return;
    }

    if (!targetPackage) {
      setModalFeedback('Selected client has no package history to adjust.');
      return;
    }

    adjustSessionCredits(targetPackage.id, calculatedDelta, adjustReason);
    setModalFeedback(`Success! Credits adjusted for ${currentClient?.fullName || 'Client'}.`);
    
    setTimeout(() => {
      setIsAdjustModalOpen(false);
      setAdjustReason('');
      setCreditAmount(1);
      setModalFeedback('');
    }, 1200);
  };

  const handleConfirmValidityAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    setValidityFeedback('');

    const target = clientPackages.find((p) => p.id === validityPkgId);
    if (!target) {
      setValidityFeedback('Error: Package record not found.');
      return;
    }

    if (!validityReason.trim()) {
      setValidityFeedback('Error: Please enter a reason for extending package validity.');
      return;
    }

    if (!customExpiryDate) {
      setValidityFeedback('Error: Please select or specify a valid new expiry date.');
      return;
    }

    extendPackageExpiry(target.id, customExpiryDate, validityReason);
    setValidityFeedback(`Success! Expiry date updated to ${customExpiryDate}. Status set to Active.`);

    setTimeout(() => {
      setIsValidityModalOpen(false);
      setValidityReason('');
      setValidityFeedback('');
    }, 1300);
  };

  const selectedValidityPkg = clientPackages.find((p) => p.id === validityPkgId) || clientPackages[0];
  const selectedValidityClient = clients.find((c) => c.id === selectedValidityPkg?.clientId);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Session Credit Wallet & Transaction Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade credit tracking. Every credit addition, completion, refund, late cancellation, and 30-day expiry is logged in the ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openValidityModalForPkg()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Adjust Package Validity on Expiry</span>
          </button>

          <button
            onClick={() => {
              if (clients.length > 0 && !selectedClientId) {
                setSelectedClientId(clients[0].id);
              }
              setModalFeedback('');
              setIsAdjustModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Manual Credit Adjustment (Admin Override)</span>
          </button>
        </div>
      </div>

      {/* Active Package Wallets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex justify-between items-center">
          <span>Active & Expired Client Credit Wallets</span>
          <span className="text-[11px] text-slate-400 font-normal">Click "Adjust Validity" to extend expiry on any package</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Purchased</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Refunded</th>
                <th className="py-3 px-4">Late Deductions</th>
                <th className="py-3 px-4">Expired</th>
                <th className="py-3 px-4">Available Balance</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {clients.map((client) => {
                const activePkg = clientPackages.find((p) => p.clientId === client.id && p.status === 'Active');
                const lastPkg = clientPackages
                  .filter((p) => p.clientId === client.id)
                  .sort((a, b) => new Date(b.startDate || b.purchasedAt || '').getTime() - new Date(a.startDate || a.purchasedAt || '').getTime())[0];

                const pkg = activePkg || lastPkg;
                const daysRemaining = pkg ? getDaysRemaining(pkg.expiryDate) : 0;

                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{client.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {client.id} {pkg ? `• ${pkg.packageName}` : '• No Package'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          pkg?.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pkg?.status === 'Expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pkg?.status || 'None'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold">{pkg?.totalSessions || 0}</td>
                    <td className="py-3.5 px-4 text-blue-700 font-bold">{pkg?.completedSessions || 0}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-bold">{pkg?.refundedSessions || 0}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-bold">{pkg?.lateCancellationDeductions || 0}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-bold">{pkg?.expiredSessions || 0}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {pkg?.remainingSessions || 0} Credits
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {pkg ? (
                        <>
                          <div className="font-extrabold text-amber-900">{pkg.expiryDate}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days left`}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {pkg ? (
                        <button
                          type="button"
                          onClick={() => openValidityModalForPkg(pkg.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-extrabold text-[11px] inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Adjust or extend validity on expiry"
                        >
                          <Calendar className="w-3 h-3 text-amber-700" />
                          <span>Adjust Expiry</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No package</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Immutable Transaction Ledger</h3>
          </div>
          <span className="text-xs text-slate-400">Asia/Dubai GST Audit Trail</span>
        </div>

        <div className="space-y-2">
          {transactions.map((tx) => {
            const isPositive = tx.creditChange > 0;
            const isNegative = tx.creditChange < 0;

            return (
              <div
                key={tx.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg font-bold shrink-0 ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-800'
                        : isNegative
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="font-bold text-slate-900">{tx.type.replace(/_/g, ' ')}</div>
                    <div className="text-slate-600 mt-0.5">{tx.reason}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      User ID: {tx.responsibleUserId} ({tx.responsibleRole}) • Client: {tx.clientId}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`font-black text-sm ${
                      isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-600'
                    }`}
                  >
                    {isPositive ? `+${tx.creditChange}` : tx.creditChange} Credit
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Bal: {tx.previousBalance} → <strong className="text-slate-900">{tx.newBalance}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MANUAL PACKAGE VALIDITY & EXPIRY ADJUSTMENT MODAL */}
      {isValidityModalOpen && selectedValidityPkg && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Adjust Package Validity on Expiry</h3>
                  <p className="text-[11px] text-slate-500">Extend expiry date & reactivate session credits</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsValidityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validityFeedback && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  validityFeedback.startsWith('Success')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{validityFeedback}</span>
              </div>
            )}

            <form onSubmit={handleConfirmValidityAdjust} className="space-y-4 text-xs">
              {/* Select Package / Client */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Select Client Package</label>
                <select
                  value={validityPkgId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setValidityPkgId(pid);
                    const sel = clientPackages.find((p) => p.id === pid);
                    if (sel) {
                      const newCalc = calculateExpiryDate(sel.expiryDate || formatDubaiDate(new Date()), 30);
                      setCustomExpiryDate(newCalc);
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {clients.map((c) => {
                    const activePkg = clientPackages.find((p) => p.clientId === c.id && p.status === 'Active');
                    const lastPkg = clientPackages
                      .filter((p) => p.clientId === c.id)
                      .sort((a, b) => new Date(b.startDate || b.purchasedAt || '').getTime() - new Date(a.startDate || a.purchasedAt || '').getTime())[0];
                    const pkg = activePkg || lastPkg;
                    if (!pkg) return null;
                    return (
                      <option key={pkg.id} value={pkg.id}>
                        {c.fullName} — {pkg.packageName} ({pkg.status} • Current Expiry: {pkg.expiryDate})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Package Details Display Box */}
              <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">Client:</span>
                  <span className="font-extrabold text-slate-900">{selectedValidityClient?.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">Package Name:</span>
                  <span className="font-bold text-slate-800">{selectedValidityPkg.packageName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">Current Expiry Date:</span>
                  <span className="font-extrabold text-amber-900">{selectedValidityPkg.expiryDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">Package Status:</span>
                  <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded ${
                    selectedValidityPkg.status === 'Active' ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                  }`}>
                    {selectedValidityPkg.status}
                  </span>
                </div>
              </div>

              {/* Quick Validity Extension Duration Buttons */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1.5">Quick Validity Extension (+ Days)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      type="button"
                      key={days}
                      onClick={() => {
                        setValidityExtensionDays(days);
                        const baseDate = selectedValidityPkg.expiryDate < formatDubaiDate(new Date())
                          ? formatDubaiDate(new Date())
                          : selectedValidityPkg.expiryDate;
                        const calc = calculateExpiryDate(baseDate, days);
                        setCustomExpiryDate(calc);
                      }}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        validityExtensionDays === days
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Input for Exact Expiry Date */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Specify New Expiry Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Reason for Validity Override */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Reason for Validity Adjustment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel extension / Medical hold / Admin courtesy extension..."
                  value={validityReason}
                  onChange={(e) => setValidityReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsValidityModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save New Expiry Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Credit Override Modal (Adjust by Client Name Only) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Manual Credit Adjustment</h3>
                  <p className="text-[11px] text-slate-500">Admin override by Client Name</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  modalFeedback.startsWith('Success')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{modalFeedback}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAdjust} className="space-y-4 text-xs">
              {/* Select Client Name Only */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Select Client Name</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setModalFeedback('');
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-extrabold text-slate-900 focus:ring-2 focus:ring-purple-500"
                >
                  {clients.map((c) => {
                    const activePkg =
                      clientPackages.find((p) => p.clientId === c.id && p.status === 'Active') ||
                      clientPackages.find((p) => p.clientId === c.id);
                    const bal = activePkg ? activePkg.remainingSessions : 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.fullName} (Current Bal: {bal} Credits)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Current Balance Display Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Client Selected</span>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{currentClient?.fullName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Current Balance</span>
                  <div className="text-xl font-black text-emerald-700">{currentBalance} Credits</div>
                </div>
              </div>

              {/* Simple + or - Toggle */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1.5">Adjustment Action (+ / -)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('+')}
                    className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                      adjustmentType === '+'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add Credits</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('-')}
                    className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                      adjustmentType === '-'
                        ? 'bg-red-600 text-white border-red-600 shadow-md scale-102'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Minus className="w-4 h-4 stroke-[3]" />
                    <span>- Deduct Credits</span>
                  </button>
                </div>
              </div>

              {/* Quantity Picker */}
              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1.5">Number of Credits to {adjustmentType === '+' ? 'Add' : 'Deduct'}</label>
                <div className="flex items-center space-x-2 mb-2">
                  {[1, 2, 3, 5, 10].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setCreditAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        creditAmount === amt
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {amt} {amt === 1 ? 'Credit' : 'Credits'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-extrabold text-center text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Live Preview Calculation */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-950 flex justify-between items-center">
                <span>Preview New Balance:</span>
                <span className="text-sm font-black">
                  {currentBalance} {adjustmentType === '+' ? `+ ${creditAmount}` : `- ${creditAmount}`} ={' '}
                  <span className={newBalance >= currentBalance ? 'text-emerald-700' : 'text-red-700'}>
                    {newBalance} Credits
                  </span>
                </span>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 uppercase mb-1">Reason for Override (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reschedule goodwill gesture / manual balance update..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply {adjustmentType === '+' ? '+' : '-'}{creditAmount} Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
