import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED, formatReadableDate } from '../../utils/dubaiTime';
import { exportToCSV, exportToPDFPrint } from '../../utils/exportUtils';
import {
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  X,
  RefreshCw,
} from 'lucide-react';

export const PaymentsModule: React.FC = () => {
  const { payments, clients, packageDefinitions, purchasePackage, refreshDataFromServer } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSyncingStripe, setIsSyncingStripe] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncWithStripe = async () => {
    setIsSyncingStripe(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/stripe/sync-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (refreshDataFromServer) {
          await refreshDataFromServer();
        }
        setSyncFeedback({
          success: true,
          message: data.message || `Successfully synced ${data.syncedCount || 0} charges from Stripe.`,
        });
      } else {
        setSyncFeedback({
          success: false,
          message: data.message || data.error || 'Failed to sync charges from Stripe API.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: err?.message || 'Error communicating with Stripe synchronization endpoint.',
      });
    } finally {
      setIsSyncingStripe(false);
    }
  };

  // Record Offline Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedPackageDefId, setSelectedPackageDefId] = useState(packageDefinitions[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');

  const handleRecordOfflinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    purchasePackage(selectedClientId, selectedPackageDefId, paymentMethod, false);
    setIsRecordModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Payment ID', 'Client Name', 'Package Name', 'Amount (AED)', 'Paid (AED)', 'Date', 'Method', 'Status', 'Ref'];
    const rows = payments.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      return [
        p.id,
        client?.fullName || 'Client',
        p.packageName,
        p.amountAED,
        p.amountPaidAED,
        p.paymentDate,
        p.paymentMethod,
        p.status,
        p.transactionReference,
      ];
    });
    exportToCSV('Waiter_Walk_Payment_Report', headers, rows);
  };

  const printReceipt = (payId: string) => {
    const pay = payments.find((p) => p.id === payId);
    if (!pay) return;
    const client = clients.find((c) => c.id === pay.clientId);

    const receiptHtml = `
      <div style="border: 2px solid #1e3a8a; padding: 24px; border-radius: 12px; max-w: 600px; margin: 0 auto;">
        <div style="display: flex; justify-between: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; color: #1e3a8a;">OFFICIAL PAYMENT RECEIPT</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Receipt ID: ${pay.id} • Stripe Ref: ${pay.transactionReference}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px;">STATUS: ${pay.status.toUpperCase()}</span>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <strong>BILLED TO:</strong><br/>
            ${client?.fullName || 'Client'}<br/>
            ${client?.communityName || 'Dubai'}, UAE<br/>
            ${client?.whatsappNumber || ''}
          </div>
          <div>
            <strong>PAYMENT DETAILS:</strong><br/>
            Date: ${pay.paymentDate}<br/>
            Method: ${pay.paymentMethod}<br/>
            Timezone: Asia/Dubai (GST)
          </div>
        </div>

        <table style="width: 100%; margin-top: 24px; border-collapse: collapse;">
          <thead>
            <tr style="background: #0f172a; color: white; text-align: left;">
              <th style="padding: 8px;">Description</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${pay.packageName} (Strict 30-Day Expiry)</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">AED ${pay.amountAED.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; color: #0f172a;">
          TOTAL PAID: AED ${pay.amountPaidAED.toLocaleString()}
        </div>
      </div>
    `;

    exportToPDFPrint(`Receipt_${pay.id}`, receiptHtml);
  };

  const filteredPayments = payments.filter((p) => {
    const client = clients.find((c) => c.id === p.clientId);
    const matchesSearch =
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client?.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalCollected = payments.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + p.amountPaidAED, 0);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Payment Records & Financial Collections</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
            <span className="text-slate-500">
              Verified: <strong className="text-emerald-700">{formatAED(totalCollected)}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-semibold">
              Pending: {payments.filter((p) => p.status === 'Pending').length} ({formatAED(payments.filter((p) => p.status === 'Pending').reduce((acc, p) => acc + (p.amountAED || 0), 0))})
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-red-700 font-semibold">
              Declined / Failed: {payments.filter((p) => p.status === 'Failed').length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncWithStripe}
            disabled={isSyncingStripe}
            className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            title="Polls Stripe API for recent successful and declined charges"
          >
            <RefreshCw className={`w-4 h-4 text-purple-700 ${isSyncingStripe ? 'animate-spin' : ''}`} />
            <span>{isSyncingStripe ? 'Syncing...' : 'Sync with Stripe'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash / Bank Payment</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${syncFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{syncFeedback.message}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by ID, client, package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="Stripe">Stripe (Recurring/Online)</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Package</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Method & Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No payment records matching filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => {
                  const client = clients.find((c) => c.id === pay.clientId);

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{pay.id}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{client?.fullName || 'Client'}</div>
                        <div className="text-[10px] text-slate-500">{client?.communityName}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">{pay.packageName}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{formatAED(pay.amountPaidAED)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-blue-900">{pay.paymentMethod}</div>
                        <div className="text-[10px] text-slate-500">{pay.paymentDate}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            pay.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : pay.status === 'Failed'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {pay.status === 'Paid' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>SUCCESS / PAID</span>
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
                          <div className="text-[10px] text-red-700 font-medium mt-1 max-w-xs leading-tight bg-red-50 p-1.5 rounded-lg border border-red-200">
                            {pay.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => printReceipt(pay.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[10px] inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Cash / Bank Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Record Cash or Bank Payment</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordOfflinePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Select Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.communityName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Package Purchased</label>
                <select
                  value={selectedPackageDefId}
                  onChange={(e) => setSelectedPackageDefId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                >
                  {packageDefinitions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sessionCount} sessions • AED {p.priceAED})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (Emirates NBD)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Record Payment & Allocate Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
