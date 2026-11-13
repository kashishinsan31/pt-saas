import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SessionBooking } from '../../types';
import { evaluateCancellationPolicy, formatReadableDate } from '../../utils/dubaiTime';
import { BellRing, CalendarClock, CheckCircle2, Clock, MapPin, Bell, X } from 'lucide-react';

interface SessionReminderAlertBarProps {
  bookings: SessionBooking[];
  onManageSession: (booking: SessionBooking) => void;
}

export const SessionReminderAlertBar: React.FC<SessionReminderAlertBarProps> = ({
  bookings,
  onManageSession,
}) => {
  const { trainers, confirmBookingAttendance, requestPushPermission } = useApp();
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [confirmFeedback, setConfirmFeedback] = useState<string | null>(null);

  // All Scheduled or Rescheduled sessions within the next 24 hours
  const upcoming24hSessions = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => b.status === 'Scheduled' || b.status === 'Rescheduled')
      .map((b) => {
        const { hoursDiff, isEligibleForRefund } = evaluateCancellationPolicy(b.sessionDate, b.startTime, now);
        return { booking: b, hoursDiff, isEligibleForRefund };
      })
      .filter((item) => item.hoursDiff > 0 && item.hoursDiff <= 24 && !dismissedIds.includes(item.booking.id))
      .sort((a, b) => a.hoursDiff - b.hoursDiff);
  }, [bookings, dismissedIds]);

  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPushPermission(res);
  };

  const handleConfirm = (bookingId: string) => {
    const res = confirmBookingAttendance(bookingId);
    if (res.success) {
      setConfirmFeedback(res.message);
      setTimeout(() => setConfirmFeedback(null), 3500);
    }
  };

  const formatCountdown = (hoursDiff: number) => {
    if (hoursDiff < 1) {
      return `${Math.max(1, Math.round(hoursDiff * 60))}m`;
    }
    const wholeHours = Math.floor(hoursDiff);
    const mins = Math.round((hoursDiff - wholeHours) * 60);
    return mins > 0 ? `${wholeHours}h ${mins}m` : `${wholeHours}h`;
  };

  if (upcoming24hSessions.length === 0 && pushPermission !== 'default') {
    return null;
  }

  return (
    <div className="space-y-3">
      {confirmFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{confirmFeedback}</span>
        </div>
      )}

      {/* 24-Hour Pre-Session Reminder Cards */}
      {upcoming24hSessions.map(({ booking, hoursDiff, isEligibleForRefund }) => {
        const trainerObj = trainers.find((t) => t.id === booking.trainerId);
        const confirmed = Boolean(booking.clientConfirmedAttendance);

        return (
          <div
            key={booking.id}
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              confirmed
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/80 border-amber-300'
            }`}
          >
            <div className="flex items-start space-x-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {confirmed ? <CheckCircle2 className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className={`font-bold ${confirmed ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {confirmed ? 'Session Attendance Confirmed' : '24-Hour Session Reminder'}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="font-mono tabular-nums font-bold text-slate-800">
                    Starts in {formatCountdown(hoursDiff)}
                  </span>
                </div>

                <div className="text-sm font-extrabold text-slate-900">
                  {formatReadableDate(booking.sessionDate)} at {booking.startTime} GST with{' '}
                  {trainerObj?.fullName || 'your assigned trainer'}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{booking.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isEligibleForRefund
                        ? 'Free cancellation / reschedule closes at 12h prior'
                        : 'Within 12h policy window — confirm attendance'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!confirmed && (
                <button
                  type="button"
                  onClick={() => handleConfirm(booking.id)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Confirm Attendance</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onManageSession(booking)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEligibleForRefund ? 'Reschedule / Cancel' : 'View Session'}</span>
              </button>

              {confirmed && (
                <button
                  type="button"
                  onClick={() => setDismissedIds((prev) => [...prev, booking.id])}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  aria-label="Dismiss reminder"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Browser Push Opt-In Bar (shown cleanly when browser permission is default) */}
      {pushPermission === 'default' && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-xs text-slate-700">
            <Bell className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Enable browser push notifications to receive automatic <strong>24-hour reminders</strong> before every scheduled session.
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnablePush}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Enable Push Alerts
          </button>
        </div>
      )}
    </div>
  );
};
