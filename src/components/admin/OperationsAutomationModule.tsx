import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDubaiDate, getDaysRemaining, evaluateCancellationPolicy } from '../../utils/dubaiTime';
import {
  Zap,
  MessageSquare,
  MapPin,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Clock,
  Send,
  Users,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Calendar,
} from 'lucide-react';

export const OperationsAutomationModule: React.FC = () => {
  const { clients, trainers, clientPackages, bookings, payments, currentUser } = useApp();

  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [activeOpsTab, setActiveOpsTab] = useState<'reminders' | 'route' | 'health' | 'renewals'>('reminders');
  const [batchActionFeedback, setBatchActionFeedback] = useState<string>('');

  const todayStr = formatDubaiDate(new Date());

  // Calculate Tomorrow date string in Asia/Dubai
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = formatDubaiDate(tomorrowObj);

  // Filter bookings based on selected day
  const targetDateStr = selectedDay === 'today' ? todayStr : tomorrowStr;

  const accessibleBookings = bookings.filter((b) => {
    if (currentUser?.role === 'trainer') {
      return b.trainerId === currentUser.associatedId;
    }
    return true;
  });

  const scheduledTargetBookings = accessibleBookings.filter(
    (b) => (selectedDay === 'week' ? true : b.sessionDate === targetDateStr) && b.status === 'Scheduled'
  );

  // Filter expiring packages (<= 3 days left)
  const expiringPackages = clientPackages.filter((pkg) => {
    if (pkg.status !== 'Active') return false;
    const daysLeft = getDaysRemaining(pkg.expiryDate);
    return daysLeft <= 3 && daysLeft >= 0;
  });

  // Filter pending payments
  const pendingPayments = payments.filter((p) => p.status === 'Pending' || p.status === 'Partially Paid');

  // Filter clients with sessions today/tomorrow that have unsigned health declarations or active injuries
  const targetClientIds = Array.from(new Set(scheduledTargetBookings.map((b) => b.clientId)));
  const healthAlertClients = clients.filter((c) => {
    if (!targetClientIds.includes(c.id)) return false;
    const unsignedPARQ = !c.healthDeclaration?.signed;
    const hasActiveInjuries = c.healthIssues && c.healthIssues.some((issue) => issue.status === 'Active');
    return unsignedPARQ || hasActiveInjuries;
  });

  // Dubai Community Grouping for Route Optimization
  const communityClusters = scheduledTargetBookings.reduce((acc, booking) => {
    const client = clients.find((c) => c.id === booking.clientId);
    const comm = client?.communityName || 'Other Dubai Location';
    if (!acc[comm]) acc[comm] = [];
    acc[comm].push({ booking, client });
    return acc;
  }, {} as Record<string, Array<{ booking: typeof bookings[0]; client: typeof clients[0] | undefined }>>);

  const handleBatchSendReminders = () => {
    if (scheduledTargetBookings.length === 0) {
      setBatchActionFeedback('No scheduled sessions found for the selected timeframe.');
      return;
    }

    setBatchActionFeedback(
      `Automation Triggered: Pre-filled WhatsApp notification URLs generated for ${scheduledTargetBookings.length} client sessions!`
    );

    setTimeout(() => {
      setBatchActionFeedback('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-500/30">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 fill-slate-950" />
              OPERATIONAL WORKLOAD AUTOMATION
            </span>
            <span className="text-xs text-indigo-200 font-medium">Asia/Dubai GST Smart Engine</span>
          </div>
          <h2 className="text-2xl font-black text-white">Smart Operations Control Center</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Eliminate operational friction and manual workload. Auto-dispatch WhatsApp reminders, optimize Dubai trainer travel routes, and enforce pre-session health safety automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setSelectedDay('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDay === 'today' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Today ({todayStr})
          </button>
          <button
            onClick={() => setSelectedDay('tomorrow')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDay === 'tomorrow' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>

      {/* Top Operational Efficiency KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Scheduled Sessions</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{scheduledTargetBookings.length}</div>
            <div className="text-[10px] text-blue-700 font-semibold">{selectedDay === 'today' ? 'Today' : 'Tomorrow'}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">WhatsApp Reminders</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{scheduledTargetBookings.length} Ready</div>
            <div className="text-[10px] text-emerald-700 font-semibold">1-Click Dispatch</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Health & Safety Alerts</div>
            <div className="text-xl font-black text-red-600 mt-0.5">{healthAlertClients.length}</div>
            <div className="text-[10px] text-red-700 font-semibold">Pre-Session Flag</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">3-Day Renewals & Due</div>
            <div className="text-xl font-black text-amber-700 mt-0.5">{expiringPackages.length + pendingPayments.length}</div>
            <div className="text-[10px] text-amber-800 font-semibold">Action Required</div>
          </div>
        </div>
      </div>

      {/* Operations Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex flex-wrap gap-2 shadow-xs">
        <button
          onClick={() => setActiveOpsTab('reminders')}
          className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
            activeOpsTab === 'reminders'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp Reminders Dispatch</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('route')}
          className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
            activeOpsTab === 'route'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Dubai Community Route Optimizer</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('health')}
          className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
            activeOpsTab === 'health'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-red-500" />
          <span>Pre-Session Health Guard ({healthAlertClients.length})</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('renewals')}
          className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center space-x-2 transition-all cursor-pointer ${
            activeOpsTab === 'renewals'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Invoice & Renewal Collector ({expiringPackages.length + pendingPayments.length})</span>
        </button>
      </div>

      {batchActionFeedback && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl text-xs font-bold text-emerald-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{batchActionFeedback}</span>
        </div>
      )}

      {/* TAB 1: WHATSAPP REMINDERS DISPATCH CENTER */}
      {activeOpsTab === 'reminders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Automated Daily WhatsApp Reminders Dispatch</h3>
              <p className="text-xs text-slate-500">
                Pre-formatted 1-click WhatsApp messaging for all sessions on {selectedDay === 'today' ? `Today (${todayStr})` : 'Tomorrow'}.
              </p>
            </div>

            <button
              onClick={handleBatchSendReminders}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Send className="w-4 h-4" />
              <span>Trigger Batch WhatsApp Dispatch</span>
            </button>
          </div>

          <div className="space-y-3">
            {scheduledTargetBookings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No scheduled sessions found for {selectedDay === 'today' ? 'today' : 'tomorrow'}.
              </div>
            ) : (
              scheduledTargetBookings.map((b) => {
                const client = clients.find((c) => c.id === b.clientId);
                const trainer = trainers.find((t) => t.id === b.trainerId);
                const cleanPhone = client?.whatsappNumber ? client.whatsappNumber.replace(/[^0-9]/g, '') : '';
                const waMsg = `Hi ${client?.fullName || 'Client'}, this is a reminder from Waiter Walk Fitness for your scheduled personal training session on ${b.sessionDate} at ${b.startTime} GST (${b.location}) with coach ${trainer?.fullName || 'your trainer'}. Please reply to confirm!`;

                return (
                  <div
                    key={b.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{client?.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">{client?.id}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-900 font-extrabold px-2 py-0.5 rounded">
                          {client?.communityName}
                        </span>
                      </div>
                      <div className="text-slate-600 font-medium flex items-center space-x-3">
                        <span className="flex items-center gap-1 font-extrabold text-blue-900">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{b.startTime} - {b.endTime} GST</span>
                        </span>
                        <span>• Trainer: <strong>{trainer?.fullName}</strong></span>
                        <span>• Location: {b.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Send WhatsApp Reminder</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No phone on record</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DUBAI COMMUNITY ROUTE OPTIMIZER */}
      {activeOpsTab === 'route' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Dubai Community Travel & Route Optimizer</h3>
            <p className="text-xs text-slate-500">
              Groups sessions by Dubai community clusters to minimize trainer travel time between Palm Jumeirah, Marina, Downtown, and JBR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(communityClusters).length === 0 ? (
              <div className="col-span-2 text-center py-10 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-200">
                No session clusters found for the selected day.
              </div>
            ) : (
              Object.entries(communityClusters).map(([community, items]) => (
                <div key={community} className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{community}</h4>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Dubai Cluster Zone</span>
                      </div>
                    </div>
                    <span className="bg-blue-100 text-blue-900 font-black text-xs px-2.5 py-1 rounded-full border border-blue-200">
                      {items.length} Session{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {items.map(({ booking, client }) => {
                      const trainer = trainers.find((t) => t.id === booking.trainerId);
                      return (
                        <div key={booking.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900">{client?.fullName}</span>
                            <span className="font-bold text-blue-700 font-mono text-[11px]">{booking.startTime} - {booking.endTime}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex justify-between">
                            <span>Coach: {trainer?.fullName}</span>
                            <span className="truncate max-w-[160px]">{booking.location}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRE-SESSION HEALTH SAFETY GUARD */}
      {activeOpsTab === 'health' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Pre-Session Health Safety & PAR-Q Risk Guard</span>
            </h3>
            <p className="text-xs text-slate-500">
              Flags clients scheduled for workouts who have unsigned PAR-Q readiness declarations or active injury notes.
            </p>
          </div>

          <div className="space-y-3">
            {healthAlertClients.length === 0 ? (
              <div className="text-center py-10 text-emerald-800 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold">
                ✓ All clients scheduled for workouts have signed PAR-Q forms and zero active critical medical alerts!
              </div>
            ) : (
              healthAlertClients.map((c) => {
                const unsignedForm = !c.healthDeclaration?.signed;
                const activeIssues = c.healthIssues ? c.healthIssues.filter((i) => i.status === 'Active') : [];

                return (
                  <div key={c.id} className="p-4 bg-red-50/60 rounded-2xl border border-red-200 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-slate-900 text-sm">{c.fullName} ({c.id})</div>
                        <div className="text-slate-500 text-[11px]">{c.communityName} • Assigned Trainer: {trainers.find(t=>t.id===c.assignedTrainerId)?.fullName}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {unsignedForm && (
                          <span className="px-2.5 py-1 bg-amber-200 text-amber-900 font-extrabold text-[10px] rounded-full border border-amber-300">
                            ⚠️ Unsigned PAR-Q
                          </span>
                        )}
                        {activeIssues.length > 0 && (
                          <span className="px-2.5 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full">
                            {activeIssues.length} Active Medical Note{activeIssues.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>

                    {activeIssues.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-red-200 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-red-700">Coach Pre-Session Alert Notes:</span>
                        {activeIssues.map((issue) => (
                          <div key={issue.id} className="text-[11px] text-slate-800">
                            <strong>[{issue.category} - {issue.severity} Severity]</strong> {issue.title}: {issue.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVOICE & PACKAGE RENEWAL COLLECTOR */}
      {activeOpsTab === 'renewals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Automated Package Renewal & Invoice Collector</h3>
            <p className="text-xs text-slate-500">
              Identifies clients whose packages are expiring within 3 days or have pending invoices, providing 1-click WhatsApp payment links.
            </p>
          </div>

          <div className="space-y-3">
            {expiringPackages.length === 0 && pendingPayments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-200">
                No active package renewals due in the next 3 days.
              </div>
            ) : (
              <>
                {expiringPackages.map((pkg) => {
                  const client = clients.find((c) => c.id === pkg.clientId);
                  const daysLeft = getDaysRemaining(pkg.expiryDate);
                  const cleanPhone = client?.whatsappNumber ? client.whatsappNumber.replace(/[^0-9]/g, '') : '';
                  const renewalMsg = `Hi ${client?.fullName || 'Client'}, your Waiter Walk personal training package "${pkg.packageName}" expires in ${daysLeft} day(s) on ${pkg.expiryDate}. Contact us or renew in your client portal to keep your session momentum!`;

                  return (
                    <div key={pkg.id} className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 text-sm">{client?.fullName}</span>
                          <span className="bg-amber-200 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded">
                            Expires in {daysLeft} Days ({pkg.expiryDate})
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1 font-medium">
                          Package: <strong>{pkg.packageName}</strong> • Remaining Sessions: {pkg.remainingSessions} / {pkg.totalSessions}
                        </div>
                      </div>

                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(renewalMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 shrink-0"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>WhatsApp Renewal Request</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
