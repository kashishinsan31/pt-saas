import React, { useMemo, useState } from 'react';
import { SessionBooking } from '../../types';
import { formatReadableDate } from '../../utils/dubaiTime';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Dumbbell, TrendingUp, CalendarDays, Layers, Clock } from 'lucide-react';

interface ClientWorkoutAnalyticsCardProps {
  bookings: SessionBooking[];
}

export const ClientWorkoutAnalyticsCard: React.FC<ClientWorkoutAnalyticsCardProps> = ({ bookings }) => {
  const [selectedExercise, setSelectedExercise] = useState<string>('ALL');

  const completedSessions = useMemo(() => {
    return [...bookings]
      .filter((b) => b.status === 'Completed')
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));
  }, [bookings]);

  const exerciseLogs = useMemo(() => {
    const items: Array<{
      sessionDate: string;
      startTime: string;
      bookingId: string;
      exerciseName: string;
      normalizedName: string;
      weightKg: number;
      reps: number;
      trackingMode: 'sets' | 'time_period';
      sets: number;
      durationSeconds: number;
      volumeKg: number;
    }> = [];

    for (const session of completedSessions) {
      for (const ex of session.exercises || []) {
        const setsCount = ex.trackingMode === 'sets' ? Math.max(1, ex.sets || 1) : 1;
        const durationSec =
          ex.durationSeconds ??
          (ex.trackingMode === 'time_period'
            ? (ex.durationUnit === 'min' ? (ex.durationValue || 0) * 60 : ex.durationValue || 0)
            : 0);
        const volumeKg = Math.round((ex.weightKg || 0) * (ex.reps || 0) * setsCount * 100) / 100;

        items.push({
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          bookingId: session.id,
          exerciseName: ex.exerciseName.trim(),
          normalizedName: ex.exerciseName.trim().toLowerCase(),
          weightKg: ex.weightKg || 0,
          reps: ex.reps || 0,
          trackingMode: ex.trackingMode || 'sets',
          sets: ex.trackingMode === 'sets' ? (ex.sets || 0) : 0,
          durationSeconds: durationSec,
          volumeKg,
        });
      }
    }
    return items;
  }, [completedSessions]);

  const uniqueExercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of exerciseLogs) {
      if (!map.has(item.normalizedName)) {
        map.set(item.normalizedName, item.exerciseName);
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [exerciseLogs]);

  const summary = useMemo(() => {
    const totalVolumeKg = Math.round(exerciseLogs.reduce((sum, e) => sum + e.volumeKg, 0) * 10) / 10;
    const totalSets = exerciseLogs.reduce((sum, e) => sum + e.sets, 0);
    const totalReps = exerciseLogs.reduce((sum, e) => sum + e.reps * (e.sets || 1), 0);
    const totalDurationSeconds = exerciseLogs.reduce((sum, e) => sum + e.durationSeconds, 0);

    let peakExercise: { name: string; weightKg: number } | null = null;
    for (const e of exerciseLogs) {
      if (!peakExercise || e.weightKg > peakExercise.weightKg) {
        peakExercise = { name: e.exerciseName, weightKg: e.weightKg };
      }
    }

    return {
      completedCount: completedSessions.length,
      exerciseCount: exerciseLogs.length,
      totalVolumeKg,
      totalSets,
      totalReps,
      totalDurationSeconds,
      peakExercise,
    };
  }, [completedSessions, exerciseLogs]);

  const formatDurationLabel = (totalSec: number) => {
    if (totalSec <= 0) return '0s';
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Per-session chart data (for "ALL")
  const overviewChartData = useMemo(() => {
    return completedSessions
      .filter((s) => (s.exercises || []).length > 0)
      .map((s) => {
        const exs = s.exercises || [];
        const sessionVolume = exs.reduce((acc, ex) => {
          const setFactor = ex.trackingMode === 'sets' ? Math.max(1, ex.sets || 1) : 1;
          return acc + (ex.weightKg || 0) * (ex.reps || 0) * setFactor;
        }, 0);
        const sessionReps = exs.reduce((acc, ex) => {
          const setFactor = ex.trackingMode === 'sets' ? Math.max(1, ex.sets || 1) : 1;
          return acc + (ex.reps || 0) * setFactor;
        }, 0);
        const sessionSets = exs.reduce((acc, ex) => acc + (ex.trackingMode === 'sets' ? ex.sets || 0 : 0), 0);
        return {
          dateLabel: formatReadableDate(s.sessionDate) || s.sessionDate,
          volumeKg: Math.round(sessionVolume * 10) / 10,
          totalReps: sessionReps,
          totalSets: sessionSets,
        };
      });
  }, [completedSessions]);

  // Per-exercise progression data
  const exerciseChartData = useMemo(() => {
    if (selectedExercise === 'ALL') return [];
    return exerciseLogs
      .filter((item) => item.normalizedName === selectedExercise)
      .map((item) => ({
        dateLabel: formatReadableDate(item.sessionDate) || item.sessionDate,
        weightKg: item.weightKg,
        reps: item.reps,
        sets: item.sets,
        durationMin: Math.round((item.durationSeconds / 60) * 10) / 10,
        volumeKg: item.volumeKg,
      }));
  }, [exerciseLogs, selectedExercise]);

  // Exercise breakdown summary table
  const exerciseBreakdown = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        sessions: Set<string>;
        bestWeightKg: number;
        totalReps: number;
        totalSets: number;
        totalDurationSeconds: number;
        totalVolumeKg: number;
      }
    >();

    for (const item of exerciseLogs) {
      const existing = grouped.get(item.normalizedName) || {
        name: item.exerciseName,
        sessions: new Set<string>(),
        bestWeightKg: 0,
        totalReps: 0,
        totalSets: 0,
        totalDurationSeconds: 0,
        totalVolumeKg: 0,
      };
      existing.sessions.add(item.bookingId);
      existing.bestWeightKg = Math.max(existing.bestWeightKg, item.weightKg);
      existing.totalReps += item.reps * (item.sets || 1);
      existing.totalSets += item.sets;
      existing.totalDurationSeconds += item.durationSeconds;
      existing.totalVolumeKg += item.volumeKg;
      grouped.set(item.normalizedName, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => b.totalVolumeKg - a.totalVolumeKg || b.sessions.size - a.sessions.size);
  }, [exerciseLogs]);

  const latestLoggedSessions = useMemo(() => {
    return [...completedSessions]
      .filter((s) => (s.exercises || []).length > 0)
      .reverse()
      .slice(0, 3);
  }, [completedSessions]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Dumbbell className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-base">
              Training Session &amp; Exercise Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track weights lifted, reps, sets, and timed exercises recorded by your trainer after each completed session.
          </p>
        </div>

        {uniqueExercises.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <label htmlFor="exercise-analytics-filter" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Exercise:
            </label>
            <select
              id="exercise-analytics-filter"
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Exercises (Overview)</option>
              {uniqueExercises.map((ex) => (
                <option key={ex.key} value={ex.key}>
                  {ex.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Empty State */}
      {exerciseLogs.length === 0 ? (
        <div className="py-10 px-4 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">No Exercise Analytics Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {completedSessions.length > 0
              ? `You have ${completedSessions.length} completed session(s). Detailed weights, reps, sets, and duration analytics will appear here as your trainer logs exercises on session completion.`
              : 'Once your trainer completes a training session and logs your exercises (name, weight, reps, sets or time period), your strength and volume progression charts will appear here automatically.'}
          </p>
        </div>
      ) : (
        <>
          {/* 4-Metric KPI Grid (Flat hairline cells, tabular numerals) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                <span>Workouts Logged</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {summary.completedCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {summary.exerciseCount} exercise entries
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Volume Lifted</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {summary.totalVolumeKg.toLocaleString()} kg
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {summary.totalReps.toLocaleString()} total reps
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1.5">
                {summary.totalDurationSeconds > 0 && summary.totalSets === 0 ? (
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>Sets &amp; Timed Work</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {summary.totalSets} sets
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {summary.totalDurationSeconds > 0
                  ? `${formatDurationLabel(summary.totalDurationSeconds)} timed duration`
                  : 'All set-based training'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-amber-600" />
                <span>Peak Weight Used</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {summary.peakExercise ? `${summary.peakExercise.weightKg} kg` : '0 kg'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={summary.peakExercise?.name || ''}>
                {summary.peakExercise ? summary.peakExercise.name : 'Bodyweight'}
              </div>
            </div>
          </div>

          {/* Progression Chart */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800">
                {selectedExercise === 'ALL'
                  ? 'Session Volume (kg) & Total Reps Over Time'
                  : `${uniqueExercises.find((e) => e.key === selectedExercise)?.label || 'Exercise'} — Weight & Reps Progression`}
              </h4>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {selectedExercise === 'ALL' ? overviewChartData.length : exerciseChartData.length} session
                {(selectedExercise === 'ALL' ? overviewChartData.length : exerciseChartData.length) === 1 ? '' : 's'}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {selectedExercise === 'ALL' ? (
                  <BarChart data={overviewChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="volumeKg" name="Volume (kg)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="totalReps" name="Total Reps" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={exerciseChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="weightKg"
                      name="Weight (kg)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reps"
                      name="Reps"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Exercise Performance Summary Table */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800">Exercise Breakdown Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 pr-3">Exercise Name</th>
                    <th className="py-2 px-3 text-right">Sessions</th>
                    <th className="py-2 px-3 text-right">Best Weight</th>
                    <th className="py-2 px-3 text-right">Total Reps</th>
                    <th className="py-2 pl-3 text-right">Sets / Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exerciseBreakdown.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/80">
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {item.sessions.size}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-700">
                        {item.bestWeightKg > 0 ? `${item.bestWeightKg} kg` : 'Bodyweight'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {item.totalReps}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-700">
                        {item.totalSets > 0 && item.totalDurationSeconds > 0
                          ? `${item.totalSets} sets · ${formatDurationLabel(item.totalDurationSeconds)}`
                          : item.totalSets > 0
                          ? `${item.totalSets} sets`
                          : formatDurationLabel(item.totalDurationSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Completed Session Exercises */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800">Recent Completed Session Logs</h4>
            <div className="divide-y divide-slate-100">
              {latestLoggedSessions.map((session) => (
                <div key={session.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-bold text-slate-900">
                      {formatReadableDate(session.sessionDate)} · {session.startTime}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {(session.exercises || []).length} exercise{(session.exercises || []).length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(session.exercises || []).map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/80"
                      >
                        <span className="font-semibold text-slate-800 truncate pr-2">{ex.exerciseName}</span>
                        <span className="text-[11px] text-slate-600 font-mono tabular-nums shrink-0">
                          {ex.weightKg > 0 ? `${ex.weightKg}kg` : 'BW'} · {ex.reps} reps ·{' '}
                          {ex.trackingMode === 'sets'
                            ? `${ex.sets} sets`
                            : `${ex.durationValue || ex.durationSeconds}${ex.durationUnit || 's'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
