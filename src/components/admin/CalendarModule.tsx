import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatReadableDate, formatDubaiDate } from '../../utils/dubaiTime';
import { CompleteSessionModal } from '../common/CompleteSessionModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserCheck,
  Users,
  Filter,
  Plus,
  X,
  CheckCircle,
  Dumbbell,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const CalendarModule: React.FC = () => {
  const {
    bookings,
    clients,
    trainers,
    currentUser,
    clientPackages,
    markSessionCompleted,
    rescheduleBooking,
    cancelSessionByClient,
  } = useApp();

  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [currentDateObj, setCurrentDateObj] = useState<Date>(new Date());
  const [trainerFilter, setTrainerFilter] = useState('ALL');

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleMsg, setRescheduleMsg] = useState('');
  const [completeBookingTarget, setCompleteBookingTarget] = useState<any>(null);

  const handleOpenCompleteModalCalendar = (session: any) => {
    setCompleteBookingTarget(session);
  };

  const role = currentUser?.role || 'admin';

  // Filter bookings according to user role & trainer filter
  const accessibleBookings = bookings.filter((b) => {
    if (role === 'trainer') {
      return b.trainerId === currentUser?.associatedId;
    }
    if (role === 'client') {
      return b.clientId === currentUser?.associatedId;
    }
    if (trainerFilter !== 'ALL') {
      return b.trainerId === trainerFilter;
    }
    return true;
  });

  // Date Navigation Helpers
  const selectedDateStr = formatDubaiDate(currentDateObj);

  const handlePrev = () => {
    const next = new Date(currentDateObj);
    if (viewMode === 'daily') next.setDate(next.getDate() - 1);
    else if (viewMode === 'weekly') next.setDate(next.getDate() - 7);
    else if (viewMode === 'monthly') next.setMonth(next.getMonth() - 1);
    setCurrentDateObj(next);
  };

  const handleNext = () => {
    const next = new Date(currentDateObj);
    if (viewMode === 'daily') next.setDate(next.getDate() + 1);
    else if (viewMode === 'weekly') next.setDate(next.getDate() + 7);
    else if (viewMode === 'monthly') next.setMonth(next.getMonth() + 1);
    setCurrentDateObj(next);
  };

  const handleToday = () => {
    setCurrentDateObj(new Date());
  };

  // Helper to compute 7 days for current week view starting from Sunday/Monday
  const getWeekDates = (baseDate: Date) => {
    const dates: Date[] = [];
    const curr = new Date(baseDate);
    const dayOfWeek = curr.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start Monday
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() + distanceToMon);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  // Helper to compute calendar grid for month view
  const getMonthDaysGrid = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
    const padBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon start

    const gridDays: { dateStr: string; dayNum: number; isCurrentMonth: boolean; dateObj: Date }[] = [];

    // Pad before
    for (let i = padBefore; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      gridDays.push({
        dateStr: formatDubaiDate(prevDate),
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
        dateObj: prevDate,
      });
    }

    // Days in month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currDate = new Date(year, month, i);
      gridDays.push({
        dateStr: formatDubaiDate(currDate),
        dayNum: i,
        isCurrentMonth: true,
        dateObj: currDate,
      });
    }

    // Pad after to complete 35 or 42 grid cells
    const remaining = (7 - (gridDays.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      gridDays.push({
        dateStr: formatDubaiDate(nextDate),
        dayNum: i,
        isCurrentMonth: false,
        dateObj: nextDate,
      });
    }

    return gridDays;
  };

  const weekDates = getWeekDates(currentDateObj);
  const monthDaysGrid = getMonthDaysGrid(currentDateObj);

  const hoursList = [
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
  ];

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-600 text-white border-emerald-700';
      case 'Scheduled':
        return 'bg-blue-600 text-white border-blue-700';
      case 'Late Cancellation':
      case 'No Show':
        return 'bg-rose-600 text-white border-rose-700';
      default:
        return 'bg-amber-600 text-white border-amber-700';
    }
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    const res = rescheduleBooking(selectedSession.id, rescheduleDate, rescheduleStartTime, rescheduleEndTime);
    if (res.success) {
      setIsRescheduleOpen(false);
      setSelectedSession(null);
    } else {
      setRescheduleMsg(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>Interactive PT Session Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trainzo-grade scheduling grid in Asia/Dubai. Real-time availability & booking management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role === 'admin' && (
            <select
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
            >
              <option value="ALL">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'daily' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'weekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs border border-slate-300 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="font-extrabold text-slate-900 text-base md:text-lg">
            {viewMode === 'monthly'
              ? currentDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' })
              : viewMode === 'weekly'
              ? `Week of ${formatReadableDate(formatDubaiDate(weekDates[0]))} - ${formatReadableDate(formatDubaiDate(weekDates[6]))}`
              : formatReadableDate(selectedDateStr)}
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-slate-600 font-medium">Scheduled</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-slate-600 font-medium">Completed</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span className="text-slate-600 font-medium">Cancelled / Late</span>
          </span>
        </div>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDaysGrid.map((day, idx) => {
              const dayBookings = accessibleBookings.filter((b) => b.sessionDate === day.dateStr);
              const isToday = day.dateStr === formatDubaiDate(new Date());

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentDateObj(day.dateObj);
                    setViewMode('daily');
                  }}
                  className={`min-h-[110px] p-2 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                    day.isCurrentMonth
                      ? isToday
                        ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                      : 'bg-slate-50/60 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 rounded">
                        {dayBookings.length} sessions
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                    {dayBookings.map((b) => {
                      const client = clients.find((c) => c.id === b.clientId);
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(b);
                          }}
                          className={`text-[10px] font-bold p-1 rounded truncate border ${getStatusColorClass(b.status)}`}
                          title={`${b.startTime} - ${client?.fullName || 'Client'}`}
                        >
                          {b.startTime} {client?.fullName?.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* WEEK VIEW TIMELINE GRID */}
      {viewMode === 'weekly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-8 gap-2 border-b border-slate-200 pb-3 text-center text-xs">
              <div className="font-bold text-slate-400 uppercase py-1">Time (GST)</div>
              {weekDates.map((d, i) => {
                const dateStr = formatDubaiDate(d);
                const isToday = dateStr === formatDubaiDate(new Date());

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setCurrentDateObj(d);
                      setViewMode('daily');
                    }}
                    className={`p-2 rounded-xl cursor-pointer transition-colors ${
                      isToday ? 'bg-blue-600 text-white font-extrabold shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-80">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-black">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots Rows */}
            <div className="divide-y divide-slate-100">
              {hoursList.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-2 py-2 items-start text-xs min-h-[50px]">
                  <div className="font-mono text-slate-400 font-semibold text-center text-[11px] pt-1">{hour}</div>

                  {weekDates.map((d, dayIdx) => {
                    const dateStr = formatDubaiDate(d);
                    const matchingBookings = accessibleBookings.filter(
                      (b) => b.sessionDate === dateStr && b.startTime.startsWith(hour.slice(0, 2))
                    );

                    return (
                      <div key={dayIdx} className="min-h-[40px] relative">
                        {matchingBookings.map((b) => {
                          const client = clients.find((c) => c.id === b.clientId);
                          const trainer = trainers.find((t) => t.id === b.trainerId);

                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedSession(b)}
                              className={`p-1.5 rounded-lg border text-[11px] cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getStatusColorClass(
                                b.status
                              )}`}
                            >
                              <div className="font-bold truncate">{client?.fullName}</div>
                              <div className="text-[10px] opacity-90 truncate">{b.startTime} • {trainer?.fullName}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW DETAILED TIMELINE */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="text-sm font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Schedule for {formatReadableDate(selectedDateStr)}</span>
            <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded">
              {accessibleBookings.filter((b) => b.sessionDate === selectedDateStr).length} Sessions Booked
            </span>
          </div>

          <div className="space-y-3">
            {accessibleBookings.filter((b) => b.sessionDate === selectedDateStr).length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No sessions scheduled for this date.</div>
            ) : (
              accessibleBookings
                .filter((b) => b.sessionDate === selectedDateStr)
                .map((b) => {
                  const client = clients.find((c) => c.id === b.clientId);
                  const trainer = trainers.find((t) => t.id === b.trainerId);

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedSession(b)}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-900 text-white p-3 rounded-xl text-center min-w-[70px] shrink-0">
                          <div className="font-mono text-xs font-bold">{b.startTime}</div>
                          <div className="text-[10px] text-blue-300 uppercase">{b.durationMinutes}m</div>
                        </div>

                        <div>
                          <div className="font-extrabold text-slate-900 text-base">{client?.fullName || 'Client'}</div>
                          <div className="text-slate-600 font-medium">Trainer: {trainer?.fullName}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">Location: {b.location}</div>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColorClass(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Interactive Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Session Details ({selectedSession.id})</h3>
              <button onClick={() => setSelectedSession(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Client:</span>
                  <span className="font-extrabold text-slate-900">
                    {clients.find((c) => c.id === selectedSession.clientId)?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Trainer:</span>
                  <span className="font-bold text-blue-900">
                    {trainers.find((t) => t.id === selectedSession.trainerId)?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Date & Time:</span>
                  <span className="font-bold text-slate-900">
                    {selectedSession.sessionDate} at {selectedSession.startTime} - {selectedSession.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Location:</span>
                  <span className="text-slate-800">{selectedSession.location}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-bold">Status:</span>
                  <span className="font-bold text-blue-700">{selectedSession.status}</span>
                </div>
              </div>

              {selectedSession.exercises && selectedSession.exercises.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900">Logged Session Exercises:</div>
                  <div className="space-y-1">
                    {selectedSession.exercises.map((ex: any) => (
                      <div key={ex.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                        <span className="font-semibold text-slate-800">{ex.exerciseName}</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {ex.weightKg > 0 ? `${ex.weightKg}kg` : 'BW'} · {ex.reps} reps ·{' '}
                          {ex.trackingMode === 'sets' ? `${ex.sets} sets` : `${ex.durationValue || ex.durationSeconds}${ex.durationUnit || 's'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSession.workoutNotes && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-900">
                  <strong>Workout Notes:</strong> {selectedSession.workoutNotes}
                </div>
              )}

              {selectedSession.status === 'Scheduled' && (
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setRescheduleDate(selectedSession.sessionDate);
                      setRescheduleStartTime(selectedSession.startTime);
                      setRescheduleEndTime(selectedSession.endTime);
                      setRescheduleMsg('');
                      setIsRescheduleOpen(true);
                    }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    Reschedule Session
                  </button>
                  <button
                    onClick={() => handleOpenCompleteModalCalendar(selectedSession)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CompleteSessionModal
        isOpen={Boolean(completeBookingTarget)}
        booking={completeBookingTarget}
        clientName={completeBookingTarget ? clients.find((c) => c.id === completeBookingTarget.clientId)?.fullName : undefined}
        onClose={() => setCompleteBookingTarget(null)}
        onComplete={(bookingId, notes, exercises) => {
          const res = markSessionCompleted(bookingId, notes, exercises);
          if (res.success) {
            setCompleteBookingTarget(null);
            setSelectedSession(null);
          }
          return res;
        }}
      />

      {/* Reschedule Modal */}
      {isRescheduleOpen && selectedSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Reschedule Session</h3>
              <button onClick={() => setIsRescheduleOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                {rescheduleMsg}
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">New Session Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
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
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Rescheduled Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
