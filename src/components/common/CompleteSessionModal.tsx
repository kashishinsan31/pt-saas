import React, { useState, useEffect } from 'react';
import { SessionBooking, SessionExerciseEntry } from '../../types';
import { formatReadableDate } from '../../utils/dubaiTime';
import { AlertCircle, Dumbbell, Plus, Trash2, X, Clock, Layers } from 'lucide-react';

interface CompleteSessionModalProps {
  isOpen: boolean;
  booking: SessionBooking | null;
  clientName?: string;
  onClose: () => void;
  onComplete: (
    bookingId: string,
    workoutNotes: string,
    exercises: SessionExerciseEntry[]
  ) => { success: boolean; message: string };
}

interface ExerciseDraftRow {
  id: string;
  exerciseName: string;
  weightKg: string;
  reps: string;
  trackingMode: 'sets' | 'time_period';
  sets: string;
  durationValue: string;
  durationUnit: 'sec' | 'min';
}

const COMMON_EXERCISES = [
  'Barbell Squat',
  'Bench Press',
  'Deadlift',
  'Shoulder Press',
  'Lat Pulldown',
  'Dumbbell Row',
  'Lunges',
  'Plank',
  'Treadmill Run',
];

const createEmptyRow = (): ExerciseDraftRow => ({
  id: `EX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  exerciseName: '',
  weightKg: '',
  reps: '',
  trackingMode: 'sets',
  sets: '',
  durationValue: '',
  durationUnit: 'sec',
});

export const CompleteSessionModal: React.FC<CompleteSessionModalProps> = ({
  isOpen,
  booking,
  clientName,
  onClose,
  onComplete,
}) => {
  const [rows, setRows] = useState<ExerciseDraftRow[]>([createEmptyRow()]);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setRows([createEmptyRow()]);
      setWorkoutNotes(booking.workoutNotes || '');
      setErrorMsg(null);
    }
  }, [isOpen, booking?.id]);

  if (!isOpen || !booking) return null;

  const updateRow = (id: string, patch: Partial<ExerciseDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (errorMsg) setErrorMsg(null);
  };

  const handleQuickFillExercise = (name: string) => {
    setRows((prev) => {
      const emptyIdx = prev.findIndex((r) => !r.exerciseName.trim());
      if (emptyIdx !== -1) {
        return prev.map((r, idx) => (idx === emptyIdx ? { ...r, exerciseName: name } : r));
      }
      return [...prev, { ...createEmptyRow(), exerciseName: name }];
    });
    if (errorMsg) setErrorMsg(null);
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rows.length === 0) {
      setErrorMsg('Please log at least one exercise performed in this session.');
      return;
    }

    const parsedExercises: SessionExerciseEntry[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.exerciseName.trim();
      if (!name) {
        setErrorMsg(`Exercise #${i + 1}: Name of the exercise is required.`);
        return;
      }

      const weight = parseFloat(row.weightKg);
      if (row.weightKg.trim() === '' || isNaN(weight) || weight < 0) {
        setErrorMsg(`Exercise #${i + 1} (${name}): Please enter weight used in kg (use 0 for bodyweight).`);
        return;
      }

      const reps = parseInt(row.reps, 10);
      if (row.reps.trim() === '' || isNaN(reps) || reps < 0 || (row.trackingMode === 'sets' && reps < 1)) {
        setErrorMsg(`Exercise #${i + 1} (${name}): Please enter number of reps performed.`);
        return;
      }

      if (row.trackingMode === 'sets') {
        const sets = parseInt(row.sets, 10);
        if (row.sets.trim() === '' || isNaN(sets) || sets < 1) {
          setErrorMsg(`Exercise #${i + 1} (${name}): Please enter number of sets completed (at least 1).`);
          return;
        }
        parsedExercises.push({
          id: row.id,
          exerciseName: name,
          weightKg: Math.round(weight * 100) / 100,
          reps,
          trackingMode: 'sets',
          sets,
        });
      } else {
        const durVal = parseFloat(row.durationValue);
        if (row.durationValue.trim() === '' || isNaN(durVal) || durVal <= 0) {
          setErrorMsg(`Exercise #${i + 1} (${name}): Please enter a valid time period greater than 0.`);
          return;
        }
        const durationSeconds = row.durationUnit === 'min' ? Math.round(durVal * 60) : Math.round(durVal);
        parsedExercises.push({
          id: row.id,
          exerciseName: name,
          weightKg: Math.round(weight * 100) / 100,
          reps,
          trackingMode: 'time_period',
          durationValue: Math.round(durVal * 100) / 100,
          durationUnit: row.durationUnit,
          durationSeconds,
        });
      }
    }

    const res = onComplete(booking.id, workoutNotes.trim(), parsedExercises);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Complete Session & Log Exercises</h3>
              <p className="text-xs text-slate-500">
                {clientName || 'Client'} · {formatReadableDate(booking.sessionDate)} · {booking.startTime} - {booking.endTime}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <span className="font-bold block mb-0.5">Action Required</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-blue-950">
              <span className="font-bold block">Compulsory Session Exercise Log</span>
              <span className="text-[11px] text-blue-800">
                Record every exercise completed in this session (exercise name, weight in kg, reps, and either sets or time period). This updates the client&apos;s workout analytics immediately.
              </span>
            </div>

            {/* Quick-Fill Common Exercises */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">Quick-fill exercise:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_EXERCISES.map((exName) => (
                  <button
                    key={exName}
                    type="button"
                    onClick={() => handleQuickFillExercise(exName)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    + {exName}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Rows */}
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Exercise #{index + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Exercise Name */}
                    <div className="sm:col-span-6">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Name of Exercise <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Barbell Squat, Plank, Bench Press"
                        value={row.exerciseName}
                        onChange={(e) => updateRow(row.id, { exerciseName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>

                    {/* Weight Used */}
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Weight Used (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        placeholder="0 = bodyweight"
                        value={row.weightKg}
                        onChange={(e) => updateRow(row.id, { weightKg: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>

                    {/* Number of Reps */}
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Number of Reps <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={row.trackingMode === 'sets' ? '1' : '0'}
                        step="1"
                        placeholder={row.trackingMode === 'sets' ? 'e.g. 12' : 'e.g. 1 (0 if hold)'}
                        value={row.reps}
                        onChange={(e) => updateRow(row.id, { reps: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Sets OR Time Period */}
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="block font-semibold text-slate-700">
                        Measure By (Sets or Time Period) <span className="text-red-500">*</span>
                      </span>
                      <div className="inline-flex p-1 bg-slate-200/80 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { trackingMode: 'sets' })}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            row.trackingMode === 'sets'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Number of Sets</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { trackingMode: 'time_period' })}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            row.trackingMode === 'time_period'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Time Period</span>
                        </button>
                      </div>
                    </div>

                    {row.trackingMode === 'sets' ? (
                      <div className="sm:w-48">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Sets Completed <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          placeholder="e.g. 4"
                          value={row.sets}
                          onChange={(e) => updateRow(row.id, { sets: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        />
                      </div>
                    ) : (
                      <div className="sm:w-64">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Time Period Done <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            required
                            min="1"
                            step="1"
                            placeholder="e.g. 60"
                            value={row.durationValue}
                            onChange={(e) => updateRow(row.id, { durationValue: e.target.value })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <select
                            value={row.durationUnit}
                            onChange={(e) => updateRow(row.id, { durationUnit: e.target.value as 'sec' | 'min' })}
                            className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                          >
                            <option value="sec">Seconds</option>
                            <option value="min">Minutes</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Exercise</span>
            </button>

            {/* Optional Workout Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Coach Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Client posture, form cues, energy levels, or goals for next session..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              {rows.length} exercise{rows.length === 1 ? '' : 's'} queued
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Save Exercises &amp; Complete Session
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
