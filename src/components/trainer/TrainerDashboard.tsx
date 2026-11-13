import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatReadableDate, formatDubaiDate, formatDubaiTime, canMarkSessionCompleted } from '../../utils/dubaiTime';
import {
  CalendarDays,
  CheckCircle,
  Users,
  Clock,
  Dumbbell,
  FileText,
  AlertCircle,
  X,
  Edit2,
  Calendar,
  CreditCard,
  Lock,
  Eye,
  ShieldCheck,
  Receipt,
  HeartPulse,
  AlertTriangle,
  Stethoscope,
  Activity,
  Check,
  Plus,
  Search,
  Star,
} from 'lucide-react';
import { DashboardSlider } from '../common/DashboardSlider';
import { CompleteSessionModal } from '../common/CompleteSessionModal';

export const TrainerDashboard: React.FC = () => {
  const {
    currentUser,
    trainers,
    clients,
    clientPackages,
    bookings,
    payments,
    markSessionCompleted,
    cancelSessionByTrainer,
    updateClient,
    createBooking,
    rescheduleBooking,
  } = useApp();

  const trainerId = currentUser?.associatedId || 'WW-TR-2001';
  const trainer = trainers.find((t) => t.id === trainerId);

  // Strictly filter clients to ONLY those allotted/assigned to this trainer by Admin
  const assignedClients = clients.filter((c) => c.assignedTrainerId === trainerId);
  const assignedClientIds = assignedClients.map((c) => c.id);

  const todayStr = formatDubaiDate(new Date());

  const trainerBookings = bookings.filter((b) => b.trainerId === trainerId);
  const todaySessions = trainerBookings.filter((b) => b.sessionDate === todayStr);
  const upcomingSessions = trainerBookings.filter(
    (b) => b.sessionDate >= todayStr && (b.status === 'Scheduled' || b.status === 'Rescheduled')
  );
  const completedSessions = trainerBookings.filter((b) => b.status === 'Completed');

  // Client Ratings & Review Feedback Summary
  const reviewedBookings = trainerBookings.filter((b) => b.trainerRating);
  const avgTrainerRating = reviewedBookings.length > 0
    ? (reviewedBookings.reduce((sum, b) => sum + (b.trainerRating || 0), 0) / reviewedBookings.length).toFixed(1)
    : 'N/A';
  const avgSessionRating = reviewedBookings.length > 0
    ? (reviewedBookings.reduce((sum, b) => sum + (b.sessionRating || 0), 0) / reviewedBookings.length).toFixed(1)
    : 'N/A';

  // Filter payment history for ONLY assigned clients
  const assignedPayments = payments.filter((p) => assignedClientIds.includes(p.clientId));

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Trainer Reschedule Modal State
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedRescheduleBooking, setSelectedRescheduleBooking] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleMsg, setRescheduleMsg] = useState('');

  // Trainer Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<any>(null);
  const [cancelReasonTrainer, setCancelReasonTrainer] = useState('');

  const handleConfirmRescheduleTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRescheduleBooking) return;
    const res = rescheduleBooking(
      selectedRescheduleBooking.id,
      rescheduleDate,
      rescheduleStartTime,
      rescheduleEndTime
    );
    if (res.success) {
      setIsRescheduleModalOpen(false);
      setSelectedRescheduleBooking(null);
      setRescheduleMsg('');
    } else {
      setRescheduleMsg(res.message);
    }
  };

  const handleConfirmCancelTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelBooking) return;
    cancelSessionByTrainer(
      selectedCancelBooking.id,
      cancelReasonTrainer.trim() || 'Cancelled by trainer'
    );
    setIsCancelModalOpen(false);
    setSelectedCancelBooking(null);
    setCancelReasonTrainer('');
  };


  // Create Session Modal for Logged-In Trainer
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(assignedClients[0]?.id || '');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [sessionDate, setSessionDate] = useState(formatDubaiDate(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('Client Home Villa / Residence');
  const [sessionNotes, setSessionNotes] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const filteredAssignedClients = assignedClients.filter((c) => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.communityName && c.communityName.toLowerCase().includes(q)) ||
      (c.whatsappNumber && c.whatsappNumber.includes(q))
    );
  });

  const activePackagesForSelectedClient = clientPackages.filter(
    (p) => p.clientId === (selectedClientId || assignedClients[0]?.id) && p.status === 'Active'
  );

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    const targetClientId = selectedClientId || assignedClients[0]?.id;
    if (!targetClientId) {
      setBookingError('No allotted client selected.');
      return;
    }

    const targetPackageId = selectedPackageId || activePackagesForSelectedClient[0]?.id;
    if (!targetPackageId) {
      setBookingError('Selected client has no active package with available session credits.');
      return;
    }

    // Automatically create session under logged-in trainer ID!
    const res = createBooking(
      targetClientId,
      trainerId,
      targetPackageId,
      sessionDate,
      startTime,
      endTime,
      location,
      sessionNotes
    );

    if (res.success) {
      setIsBookModalOpen(false);
      setSessionNotes('');
    } else {
      setBookingError(res.message);
    }
  };

  const [selectedClientForNotes, setSelectedClientForNotes] = useState<any>(null);
  const [clientTrainerNotes, setClientTrainerNotes] = useState('');

  const [viewingClientProfile, setViewingClientProfile] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'health' | 'packages' | 'payments'>('info');

  const handleSaveClientProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForNotes) return;
    updateClient(selectedClientForNotes.id, {
      additionalNotes: clientTrainerNotes,
    });
    setSelectedClientForNotes(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src={
              trainer?.profilePhoto ||
              'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80'
            }
            alt={trainer?.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-400/20">
                TRAINER PORTAL
              </span>
              <span className="text-xs text-slate-300">Asia/Dubai GST</span>
            </div>
            <h1 className="text-2xl font-black mt-1">Welcome back, {trainer?.fullName || 'Trainer'}</h1>
            <p className="text-xs text-slate-300">{trainer?.specialization} • Waiter Walk Dubai</p>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <div className="text-2xl font-black text-blue-300">{assignedClients.length}</div>
          <div className="text-xs text-slate-400 font-medium">Allotted Clients</div>
        </div>
      </div>

      {/* Featured Dashboard Slider */}
      <DashboardSlider />

      {/* Quick KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Today's Sessions</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{todaySessions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Upcoming</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{upcomingSessions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Completed Total</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{completedSessions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Allotted Clients</div>
          <div className="text-2xl font-black text-purple-900 mt-1">{assignedClients.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-300 bg-amber-50/50 text-center col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-amber-800 uppercase flex items-center justify-center space-x-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Avg Rating</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {avgTrainerRating !== 'N/A' ? `⭐ ${avgTrainerRating}` : 'N/A'}
          </div>
          <div className="text-[10px] text-amber-700 font-semibold">{reviewedBookings.length} Reviews</div>
        </div>
      </div>

      {/* Main Grid: Today's Sessions & Assigned Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's & Upcoming Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Trainer Session Schedule</h3>
            </div>
            <button
              onClick={() => {
                setBookingError('');
                if (assignedClients.length > 0 && !selectedClientId) {
                  setSelectedClientId(assignedClients[0].id);
                }
                setIsBookModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          </div>

          <div className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No upcoming sessions scheduled.</div>
            ) : (
              upcomingSessions.map((b) => {
                const client = clients.find((c) => c.id === b.clientId);
                const pkg = clientPackages.find((p) => p.id === b.packageId);

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{client?.fullName || 'Client'}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Rescheduled'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">{client?.communityName}</span>
                      </div>

                      <div className="text-blue-700 font-bold mt-0.5">
                        {formatReadableDate(b.sessionDate)} • {b.startTime} - {b.endTime}
                      </div>

                      <div className="text-slate-500 text-[11px] mt-0.5">Location: {b.location}</div>

                      {pkg && (
                        <div className="text-emerald-700 font-medium text-[11px] mt-1">
                          Remaining credits in package: <strong>{pkg.remainingSessions}</strong> / {pkg.totalSessions} (Expiry: {pkg.expiryDate})
                        </div>
                      )}
                    </div>

                    {(() => {
                      const timing = canMarkSessionCompleted(b.sessionDate, b.startTime);
                      return (
                        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRescheduleBooking(b);
                                setRescheduleDate(b.sessionDate);
                                setRescheduleStartTime(b.startTime);
                                setRescheduleEndTime(b.endTime);
                                setRescheduleMsg('');
                                setIsRescheduleModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
                              title="Reschedule session date and timing"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Reschedule</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(b);
                                setIsCompleteModalOpen(true);
                              }}
                              className={`px-3 py-1.5 font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                timing.allowed
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                              }`}
                            >
                              {!timing.allowed && <Lock className="w-3.5 h-3.5" />}
                              <span>Complete</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCancelBooking(b);
                                setCancelReasonTrainer('');
                                setIsCancelModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                              title="Cancel session (credit retained for client)"
                            >
                              Cancel
                            </button>
                          </div>
                          {!timing.allowed && (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 max-w-[200px] sm:text-right">
                              {b.sessionDate > todayStr ? 'Opens session day' : `Opens at ${timing.allowedTimeString || '1h before start'}`}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Allotted Clients Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-base">Allotted Clients Roster</h3>
            </div>
            <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full">
              {assignedClients.length} Clients
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {assignedClients.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No clients currently allotted by Admin.</div>
            ) : (
              assignedClients.map((client) => {
                const activePkg = clientPackages.find((p) => p.clientId === client.id && p.status === 'Active');

                return (
                  <div key={client.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            client.profilePhoto ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={client.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{client.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {client.communityName} • WhatsApp: {client.whatsappNumber}
                          </div>
                          {/* Health & PAR-Q status tags */}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {client.healthDeclaration?.signed ? (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                ✓ PAR-Q Signed
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                PAR-Q Unsigned
                              </span>
                            )}
                            {client.healthIssues && client.healthIssues.filter((i) => i.status === 'Active').length > 0 && (
                              <span className="text-[9px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                <span>{client.healthIssues.filter((i) => i.status === 'Active')[0].title}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setViewingClientProfile(client);
                            setActiveProfileTab('info');
                          }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile & Payments</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedClientForNotes(client);
                            setClientTrainerNotes(client.additionalNotes || '');
                          }}
                          className="text-slate-600 hover:text-slate-900 font-bold text-xs p-1"
                          title="Update Progress Notes"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {activePkg ? (
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-900 flex justify-between items-center text-[11px]">
                        <div>
                          <strong>{activePkg.packageName}</strong> (Expires: {activePkg.expiryDate})
                        </div>
                        <div className="font-black text-emerald-800">
                          {activePkg.remainingSessions} Credits Remaining
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">No active package</div>
                    )}

                    {client.additionalNotes && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                        <strong>Trainer Notes:</strong> {client.additionalNotes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment History for Allotted Clients (Financial Privacy Enforced - Amounts Hidden) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Allotted Clients Payment History</h3>
              <p className="text-xs text-slate-500">Payment receipt status for your assigned clients. Financial amounts are kept confidential.</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-900 px-3 py-1 rounded-lg border border-amber-200 text-xs font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Monetary Amounts Hidden for Trainer Privacy</span>
          </div>
        </div>

        <div className="space-y-3">
          {assignedPayments.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 italic">
              No payment history records found for your allotted clients.
            </div>
          ) : (
            assignedPayments.map((p) => {
              const client = clients.find((c) => c.id === p.clientId);

              return (
                <div
                  key={p.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{client?.fullName || 'Allotted Client'}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({p.clientId})</span>
                    </div>

                    <div className="font-bold text-blue-900 mt-0.5">{p.packageName}</div>

                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Payment Date: {formatReadableDate(p.paymentDate) || p.paymentDate}
                      {(() => {
                        const t = formatDubaiTime((p as any).paidAt || (p as any).failedAt || p.createdAt);
                        return t ? ` at ${t}` : ' GST';
                      })()}
                      {' '}• Method: {p.paymentMethod} • Ref: {p.transactionReference}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-500 flex items-center space-x-1 justify-end">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>[Amount Confidential]</span>
                      </div>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                        STATUS: {p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Client Reviews & Post-Session Ratings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Client Ratings & Review Feedback</h3>
              <p className="text-xs text-slate-500">Post-session ratings provided directly by your clients after completed workouts.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <span className="text-xs font-bold text-amber-900">
              Overall Trainer Score: <strong className="text-sm font-black">⭐ {avgTrainerRating} / 5</strong>
            </span>
            <span className="text-xs font-bold text-amber-900 border-l border-amber-300 pl-3">
              Session Quality: <strong className="text-sm font-black">⭐ {avgSessionRating} / 5</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviewedBookings.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
              No client reviews submitted yet. Client reviews appear here after clients rate completed sessions.
            </div>
          ) : (
            reviewedBookings.map((b) => {
              const clientObj = clients.find((c) => c.id === b.clientId);

              return (
                <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={clientObj?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={clientObj?.fullName || 'Client'}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{clientObj?.fullName || 'Client'}</span>
                        <div className="text-[10px] text-slate-500">Session Date: {b.sessionDate}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center space-x-1 justify-end font-extrabold text-amber-600 text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>Trainer: {b.trainerRating}/5</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">Session: ⭐ {b.sessionRating}/5</div>
                    </div>
                  </div>

                  {b.clientReview ? (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 italic font-medium leading-relaxed">
                      "{b.clientReview}"
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No written feedback provided.</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Client Profile & Detailed Payment Modal */}
      {viewingClientProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    viewingClientProfile.profilePhoto ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={viewingClientProfile.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                />
                <div>
                  <h3 className="text-lg font-bold">{viewingClientProfile.fullName}</h3>
                  <p className="text-xs text-blue-300">
                    ID: {viewingClientProfile.id} • {viewingClientProfile.communityName} • Age {viewingClientProfile.age}
                  </p>
                </div>
              </div>

              <button onClick={() => setViewingClientProfile(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 flex px-4">
              <button
                onClick={() => setActiveProfileTab('info')}
                className={`py-3 px-4 text-xs font-bold border-b-2 ${
                  activeProfileTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Client Information
              </button>
              <button
                onClick={() => setActiveProfileTab('health')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 ${
                  activeProfileTab === 'health'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                <span>Health & PAR-Q</span>
              </button>
              <button
                onClick={() => setActiveProfileTab('packages')}
                className={`py-3 px-4 text-xs font-bold border-b-2 ${
                  activeProfileTab === 'packages'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Package & Credits
              </button>
              <button
                onClick={() => setActiveProfileTab('payments')}
                className={`py-3 px-4 text-xs font-bold border-b-2 ${
                  activeProfileTab === 'payments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Payment Receipts (Amounts Confidential)
              </button>
            </div>

            {/* Profile Tab Contents */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
              {activeProfileTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-bold uppercase">WhatsApp Number</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{viewingClientProfile.whatsappNumber}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase">Email</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{viewingClientProfile.email}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase">Community</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{viewingClientProfile.communityName}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase">Address</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{viewingClientProfile.residentialAddress}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase">Emergency Contact</span>
                    <div className="font-bold text-slate-900 mt-1">
                      {viewingClientProfile.emergencyContact.name} ({viewingClientProfile.emergencyContact.relationship})
                    </div>
                    <div className="text-slate-600 mt-0.5">{viewingClientProfile.emergencyContact.phone}</div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase">Trainer Notes</span>
                    <div className="text-slate-700 mt-1">{viewingClientProfile.additionalNotes || 'No notes recorded.'}</div>
                  </div>
                </div>
              )}

              {activeProfileTab === 'health' && (
                <div className="space-y-4">
                  {/* Declaration Status */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className={`w-4 h-4 ${viewingClientProfile.healthDeclaration?.signed ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <span className="font-bold text-slate-900">Health & Illness Declaration (PAR-Q)</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${viewingClientProfile.healthDeclaration?.signed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {viewingClientProfile.healthDeclaration?.signed ? '✓ Signed & Verified' : 'Unsigned'}
                      </span>
                    </div>

                    {viewingClientProfile.healthDeclaration?.signed && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Signed:</span>
                            <span className="font-bold text-slate-800">
                              {new Date(viewingClientProfile.healthDeclaration.signedAt || '').toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })} GST
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Doctor Clearance:</span>
                            <span className="font-bold text-emerald-700">
                              {viewingClientProfile.healthDeclaration.doctorClearanceProvided ? '✓ On File' : 'Standard'}
                            </span>
                          </div>
                        </div>

                        {viewingClientProfile.healthDeclaration.signatureDataUrl && (
                          <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">Client Touch Signature:</span>
                            <img src={viewingClientProfile.healthDeclaration.signatureDataUrl} alt="Signature" className="h-7 max-w-[140px] object-contain" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Conditions List */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reported Conditions & Training Precautions</span>
                    </h4>

                    {(!viewingClientProfile.healthIssues || viewingClientProfile.healthIssues.length === 0) ? (
                      <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        No health issues recorded for this client.
                      </div>
                    ) : (
                      viewingClientProfile.healthIssues.map((issue: any) => (
                        <div key={issue.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-900 text-white">
                                {issue.category}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{issue.title}</span>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{issue.description}</p>
                          {issue.treatmentPlan && (
                            <div className="text-[10px] text-blue-800 bg-blue-50 p-1.5 rounded border border-blue-200">
                              <strong>Coach Guidance:</strong> {issue.treatmentPlan}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeProfileTab === 'packages' && (
                <div className="space-y-3">
                  {clientPackages
                    .filter((p) => p.clientId === viewingClientProfile.id)
                    .map((pkg) => (
                      <div key={pkg.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-sm">{pkg.packageName}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              pkg.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {pkg.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">TOTAL</div>
                            <div className="font-bold">{pkg.totalSessions}</div>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">COMPLETED</div>
                            <div className="font-bold text-blue-700">{pkg.completedSessions}</div>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-[10px] text-slate-400 font-bold">REMAINING</div>
                            <div className="font-bold text-emerald-700">{pkg.remainingSessions}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-amber-800 font-medium pt-1">
                          30-Day Expiry Date: <strong>{pkg.expiryDate}</strong>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeProfileTab === 'payments' && (
                <div className="space-y-3">
                  {payments
                    .filter((p) => p.clientId === viewingClientProfile.id)
                    .map((p) => (
                      <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{p.packageName}</div>
                            <div className="text-slate-500 text-[11px]">
                              Payment Date: {formatReadableDate(p.paymentDate) || p.paymentDate}
                              {(() => {
                                const t = formatDubaiTime((p as any).paidAt || (p as any).failedAt || p.createdAt);
                                return t ? ` at ${t}` : '';
                              })()}
                              {' '}• Method: {p.paymentMethod}
                            </div>
                            <div className="text-slate-400 font-mono text-[10px]">Ref: {p.transactionReference}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-500 flex items-center space-x-1 justify-end">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>[Amount Confidential]</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded mt-1 inline-block">
                              {p.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compulsory Exercise Logging & Complete Session Modal */}
      <CompleteSessionModal
        isOpen={isCompleteModalOpen}
        booking={selectedBooking}
        clientName={selectedBooking ? clients.find((c) => c.id === selectedBooking.clientId)?.fullName : undefined}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedBooking(null);
        }}
        onComplete={(bookingId, notes, exercises) => markSessionCompleted(bookingId, notes, exercises)}
      />

      {/* Edit Client Trainer Notes Modal */}
      {selectedClientForNotes && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Trainer Notes for {selectedClientForNotes.fullName}</h3>
              <button onClick={() => setSelectedClientForNotes(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientProgress} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Client Health & Progress Guidance</label>
                <textarea
                  rows={4}
                  value={clientTrainerNotes}
                  onChange={(e) => setClientTrainerNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForNotes(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Progress Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Session Modal for Logged-In Trainer */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Schedule New Training Session</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>{bookingError}</div>
              </div>
            )}

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              {/* Logged-In Trainer Badge (No Option to change trainer) */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Session Trainer</span>
                <div className="font-extrabold text-blue-900 text-sm flex items-center justify-between">
                  <span>{trainer?.fullName || 'Logged-In Trainer'}</span>
                  <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                    Current Login
                  </span>
                </div>
                <p className="text-[10px] text-blue-700">Session will be automatically created under your logged-in trainer profile.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Search & Select Allotted Client</label>
                {assignedClients.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    No clients currently allotted to your profile by Admin.
                  </div>
                ) : (
                  <>
                    {/* Real-time Search Input */}
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search allotted client by name, ID, or community..."
                        value={clientSearchQuery}
                        onChange={(e) => {
                          const query = e.target.value;
                          setClientSearchQuery(query);
                          const q = query.toLowerCase();
                          const matches = assignedClients.filter(
                            (c) =>
                              c.fullName.toLowerCase().includes(q) ||
                              c.id.toLowerCase().includes(q) ||
                              (c.communityName && c.communityName.toLowerCase().includes(q)) ||
                              (c.whatsappNumber && c.whatsappNumber.includes(q))
                          );
                          if (matches.length > 0 && !matches.some((c) => c.id === selectedClientId)) {
                            setSelectedClientId(matches[0].id);
                          }
                        }}
                        className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                      {clientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setClientSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={selectedClientId || assignedClients[0]?.id}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {filteredAssignedClients.length === 0 ? (
                        <option value="" disabled>
                          No allotted clients match "{clientSearchQuery}"
                        </option>
                      ) : (
                        filteredAssignedClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.id} • {c.communityName})
                          </option>
                        ))
                      )}
                    </select>

                    {clientSearchQuery && (
                      <div className="text-[10px] text-blue-600 font-medium mt-1">
                        Found {filteredAssignedClients.length} matching client{filteredAssignedClients.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Active Client Package</label>
                {activePackagesForSelectedClient.length === 0 ? (
                  <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    Client has no active package with available session credits.
                  </div>
                ) : (
                  <select
                    value={selectedPackageId || activePackagesForSelectedClient[0]?.id}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {activePackagesForSelectedClient.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.packageName} ({pkg.remainingSessions} credits left • Expiry: {pkg.expiryDate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  placeholder="e.g. Client Villa, Dubai Marina Tower 2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Session / Focus Notes</label>
                <textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                  placeholder="Focus areas (e.g., Core Strength, Posture Correction)..."
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignedClients.length === 0 || activePackagesForSelectedClient.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold"
                >
                  Confirm & Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Trainer Reschedule Date & Timing Modal */}
      {isRescheduleModalOpen && selectedRescheduleBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reschedule Session Date & Timing</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update timing for {clients.find((c) => c.id === selectedRescheduleBooking.clientId)?.fullName || 'Client'}
                </p>
              </div>
              <button onClick={() => setIsRescheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{rescheduleMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRescheduleTrainer} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Schedule</span>
                <div className="font-bold text-slate-800">
                  {formatReadableDate(selectedRescheduleBooking.sessionDate)} • {selectedRescheduleBooking.startTime} - {selectedRescheduleBooking.endTime}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">New Session Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Rescheduled Date & Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainer Cancel Session Modal */}
      {isCancelModalOpen && selectedCancelBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancel Session (Trainer)</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Client session credit is retained &amp; eligible for rescheduling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelTrainer} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {clients.find((c) => c.id === selectedCancelBooking.clientId)?.fullName || 'Client'}
                </div>
                <div className="text-slate-600">
                  {formatReadableDate(selectedCancelBooking.sessionDate)} • {selectedCancelBooking.startTime} - {selectedCancelBooking.endTime}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Cancellation Reason</label>
                <input
                  type="text"
                  required
                  placeholder="Reason for trainer cancellation..."
                  value={cancelReasonTrainer}
                  onChange={(e) => setCancelReasonTrainer(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Keep Session
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

