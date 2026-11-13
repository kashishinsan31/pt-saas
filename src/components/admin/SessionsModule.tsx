import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SessionBooking } from '../../types';
import { formatReadableDate, evaluateCancellationPolicy, formatDubaiDate } from '../../utils/dubaiTime';
import { CompleteSessionModal } from '../common/CompleteSessionModal';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  AlertCircle,
  RefreshCw,
  X,
  Dumbbell,
  AlertTriangle,
  Search,
  Star,
  MessageSquare,
} from 'lucide-react';

export const SessionsModule: React.FC = () => {
  const {
    bookings,
    clients,
    trainers,
    clientPackages,
    currentUser,
    createBooking,
    markSessionCompleted,
    cancelSessionByAdmin,
    markNoShow,
    rescheduleBooking,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SessionBooking | null>(null);

  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleMsg, setRescheduleMsg] = useState('');

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelAction, setCancelAction] = useState<'refund' | 'deduct'>('refund');
  const [cancelReason, setCancelReason] = useState('');

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const handleConfirmRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const res = rescheduleBooking(selectedBooking.id, rescheduleDate, rescheduleStartTime, rescheduleEndTime);
    if (res.success) {
      setIsRescheduleModalOpen(false);
      setSelectedBooking(null);
      setRescheduleMsg('');
    } else {
      setRescheduleMsg(res.message);
    }
  };


  // Booking Form
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedTrainerId, setSelectedTrainerId] = useState(trainers[0]?.id || '');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [sessionDate, setSessionDate] = useState(formatDubaiDate(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('Client Home Villa');
  const [notes, setNotes] = useState('');

  const [bookingError, setBookingError] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const filteredClientsForBooking = clients.filter((c) => {
    const isAccessible = currentUser?.role === 'trainer' ? c.assignedTrainerId === currentUser.associatedId : true;
    if (!isAccessible) return false;
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.communityName && c.communityName.toLowerCase().includes(q)) ||
      (c.whatsappNumber && c.whatsappNumber.includes(q))
    );
  });

  // When client changes, auto-select active package
  const activePackagesForSelectedClient = clientPackages.filter(
    (p) => p.clientId === selectedClientId && p.status === 'Active'
  );

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    const targetPackageId = selectedPackageId || activePackagesForSelectedClient[0]?.id;
    if (!targetPackageId) {
      setBookingError('Selected client has no active package with available session credits.');
      return;
    }

    const effectiveTrainerId = (currentUser?.role === 'trainer' ? currentUser.associatedId : selectedTrainerId) || trainers[0]?.id || '';

    const res = createBooking(
      selectedClientId,
      effectiveTrainerId,
      targetPackageId,
      sessionDate,
      startTime,
      endTime,
      location,
      notes
    );

    if (res.success) {
      setIsBookModalOpen(false);
    } else {
      setBookingError(res.message);
    }
  };

  const handleConfirmCancelAdmin = () => {
    if (!selectedBooking) return;
    cancelSessionByAdmin(selectedBooking.id, cancelAction, cancelReason || 'Admin administrative cancellation');
    setIsCancelModalOpen(false);
  };

  // Role-based data isolation: Trainers see ONLY bookings and clients allotted to them
  const accessibleBookings = bookings.filter((b) => {
    if (currentUser?.role === 'trainer') {
      return b.trainerId === currentUser.associatedId;
    }
    return true;
  });

  const accessibleClients = clients.filter((c) => {
    if (currentUser?.role === 'trainer') {
      return c.assignedTrainerId === currentUser.associatedId;
    }
    return true;
  });

  const filteredBookings = accessibleBookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Session Booking & Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule personal training sessions, process completions, and manage cancellations under the 12-hour policy.
          </p>
        </div>

        <button
          onClick={() => {
            setBookingError('');
            setIsBookModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Session</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['ALL', 'Scheduled', 'Rescheduled', 'Completed', 'Cancelled by Client', 'Cancelled by Trainer', 'Late Cancellation', 'No Show'].map(
          (st) => (
            <button
              type="button"
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Trainer</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No sessions found in this category.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const client = clients.find((c) => c.id === b.clientId);
                  const trainer = trainers.find((t) => t.id === b.trainerId);
                  const { isEligibleForRefund, hoursDiff } = evaluateCancellationPolicy(b.sessionDate, b.startTime);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{b.id}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{formatReadableDate(b.sessionDate)}</div>
                        <div className="text-[11px] text-blue-700 font-semibold font-mono">{b.startTime} - {b.endTime}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{client?.fullName || 'Client'}</div>
                        <div className="text-[10px] text-slate-500">{client?.communityName}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">{trainer?.fullName || 'Trainer'}</td>

                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">{b.location}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'Rescheduled'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : b.status === 'Scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : b.status === 'Late Cancellation' || b.status === 'No Show'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.exercises && b.exercises.length > 0 && (
                          <div className="text-[10px] text-blue-700 font-semibold mt-1 tabular-nums">
                            {b.exercises.length} exercise{b.exercises.length === 1 ? '' : 's'} logged
                          </div>
                        )}
                        {b.trainerRating && (
                          <div className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
                            <span>⭐ {b.trainerRating}/5</span>
                          </div>
                        )}
                        {b.clientReview && (
                          <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={b.clientReview}>
                            "{b.clientReview}"
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {(b.status === 'Scheduled' || b.status === 'Rescheduled') && (
                          <div className="flex items-center justify-end space-x-1">
                            {client?.whatsappNumber && (
                              <a
                                href={`https://wa.me/${client.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(client.fullName)},%20this%20is%20a%20reminder%20for%20your%20upcoming%20personal%20training%20session%20on%20${encodeURIComponent(b.sessionDate)}%20at%20${encodeURIComponent(b.startTime)}%20with%20${encodeURIComponent(trainer?.fullName || 'your trainer')}.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-[10px] flex items-center space-x-1 shrink-0"
                                title="Send WhatsApp Notification to Client"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(b);
                                setRescheduleDate(b.sessionDate);
                                setRescheduleStartTime(b.startTime);
                                setRescheduleEndTime(b.endTime);
                                setRescheduleMsg('');
                                setIsRescheduleModalOpen(true);
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] shrink-0 cursor-pointer"
                              title="Reschedule session date and timing"
                            >
                              Reschedule Time
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(b);
                                setIsCompleteModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer"
                            >
                              Complete
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(b);
                                setCancelReason('');
                                setIsCancelModalOpen(true);
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => markNoShow(b.id)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-[10px] cursor-pointer"
                            >
                              No Show
                            </button>
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

      {/* Book New Session Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Book New Personal Training Session</h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">Note: Policy limits 1 session per client per day.</p>
              </div>
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
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Search & Select Client</label>

                {/* Real-time Client Search Input */}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by client name, ID, or community..."
                    value={clientSearchQuery}
                    onChange={(e) => {
                      const query = e.target.value;
                      setClientSearchQuery(query);
                      const q = query.toLowerCase();
                      const matches = accessibleClients.filter(
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
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {filteredClientsForBooking.length === 0 ? (
                    <option value="" disabled>
                      No clients found matching "{clientSearchQuery}"
                    </option>
                  ) : (
                    filteredClientsForBooking.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.id} • {c.communityName})
                      </option>
                    ))
                  )}
                </select>

                {clientSearchQuery && (
                  <div className="text-[10px] text-blue-600 font-medium mt-1">
                    Found {filteredClientsForBooking.length} client{filteredClientsForBooking.length === 1 ? '' : 's'} matching "{clientSearchQuery}"
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Active Client Package</label>
                {activePackagesForSelectedClient.length === 0 ? (
                  <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    Client has no active package with available session credits. Purchase package first.
                  </div>
                ) : (
                  <select
                    value={selectedPackageId}
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

              {currentUser?.role === 'trainer' ? (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Session Trainer</span>
                  <div className="font-extrabold text-blue-900 text-sm flex items-center justify-between">
                    <span>{trainers.find((t) => t.id === currentUser.associatedId)?.fullName || 'Logged-In Trainer'}</span>
                    <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                      Current Login
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700">Session will be automatically created under your trainer profile.</p>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Select Trainer</label>
                  <select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
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
                  disabled={activePackagesForSelectedClient.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Confirm & Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Cancellation Decision Modal */}
      {isCancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Admin Session Cancellation</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">Session {selectedBooking.id}</div>
                <div className="text-slate-600">{selectedBooking.sessionDate} at {selectedBooking.startTime}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Credit Action</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="radio"
                      name="cancelAct"
                      checked={cancelAction === 'refund'}
                      onChange={() => setCancelAction('refund')}
                    />
                    <span>Refund Credit (+1)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-red-800">
                    <input
                      type="radio"
                      name="cancelAct"
                      checked={cancelAction === 'deduct'}
                      onChange={() => setCancelAction('deduct')}
                    />
                    <span>Deduct Credit (-1)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Cancellation Reason</label>
                <input
                  type="text"
                  required
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelAdmin}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Session Modal with Compulsory Exercise Logging */}
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

      {/* Reschedule Date & Timing Modal */}
      {isRescheduleModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reschedule Requested Session</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update session date and timing for {clients.find((c) => c.id === selectedBooking.clientId)?.fullName || 'Client'}
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

            <form onSubmit={handleConfirmRescheduleSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Schedule</span>
                <div className="font-bold text-slate-800">
                  {formatReadableDate(selectedBooking.sessionDate)} • {selectedBooking.startTime} - {selectedBooking.endTime}
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
    </div>
  );
};

