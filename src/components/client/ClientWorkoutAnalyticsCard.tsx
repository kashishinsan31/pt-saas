import React, { useMemo, useState } from 'react';
import { SessionBooking } from '../../types';
import { formatReadableDate } from '../../utils/dubaiTime';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Dumbbell, TrendingUp, TrendingDown, Minus, CalendarDays, Layers, Clock, ArrowUpRight } from 'lucide-react';

interface ClientWorkoutAnalyticsCardProps {
  bookings: SessionBooking[];
}

interface ExercisePoint {
  dateLabel: string;
  fullDateLabel: string;
  weightKg: number;
  reps: number;
  sets: number;
  durationSeconds: number;
  volumeKg: number;
  weightDeltaFromStart: number;
  repsDeltaFromStart: number;
}

const WeightTrendTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: ExercisePoint }> }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-md text-xs space-y-1">
      <div className="font-bold text-slate-900">{p.fullDateLabel}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Weight Used:</span>
        <span className="font-mono tabular-nums font-bold text-blue-700">{p.weightKg} kg</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Reps / Volume:</span>
        <span className="font-mono tabular-nums text-slate-700">
          {p.reps} reps · {p.volumeKg} kg vol
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
        <span className="text-slate-500">vs First Session:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            p.weightDeltaFromStart > 0
              ? 'text-emerald-600'
              : p.weightDeltaFromStart < 0
              ? 'text-rose-600'
              : 'text-slate-500'
          }`}
        >
          {p.weightDeltaFromStart > 0 ? `+${p.weightDeltaFromStart} kg` : `${p.weightDeltaFromStart} kg`}
        </span>
      </div>
    </div>
  );
};

const RepsTrendTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: ExercisePoint }> }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-md text-xs space-y-1">
      <div className="font-bold text-slate-900">{p.fullDateLabel}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Reps Performed:</span>
        <span className="font-mono tabular-nums font-bold text-emerald-700">{p.reps} reps</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Load &amp; Work:</span>
        <span className="font-mono tabular-nums text-slate-700">
          {p.weightKg > 0 ? `${p.weightKg} kg` : 'Bodyweight'} ·{' '}
          {p.sets > 0 ? `${p.sets} sets` : `${p.durationSeconds}s`}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
        <span className="text-slate-500">vs First Session:</span>
        <span
          className={`font-mono tabular-nums font-bold ${
            p.repsDeltaFromStart > 0
              ? 'text-emerald-600'
              : p.repsDeltaFromStart < 0
              ? 'text-rose-600'
              : 'text-slate-500'
          }`}
        >
          {p.repsDeltaFromStart > 0 ? `+${p.repsDeltaFromStart} reps` : `${p.repsDeltaFromStart} reps`}
        </span>
      </div>
    </div>
  );
};

export const ClientWorkoutAnalyticsCard: React.FC<ClientWorkoutAnalyticsCardProps> = ({ bookings }) => {
  // Empty string means auto-select the most frequently tracked exercise once available
  const [userSelection, setUserSelection] = useState<string>('');

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
            ? ex.durationUnit === 'min'
              ? (ex.durationValue || 0) * 60
              : ex.durationValue || 0
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
          sets: ex.trackingMode === 'sets' ? ex.sets || 0 : 0,
          durationSeconds: durationSec,
          volumeKg,
        });
      }
    }
    return items;
  }, [completedSessions]);

  // Unique exercises ordered by most sessions logged (so the best multi-point trend shows by default)
  const uniqueExercises = useMemo(() => {
    const map = new Map<string, { label: string; count: number; lastDate: string }>();
    for (const item of exerciseLogs) {
      const prev = map.get(item.normalizedName);
      if (!prev) {
        map.set(item.normalizedName, { label: item.exerciseName, count: 1, lastDate: item.sessionDate });
      } else {
        prev.count += 1;
        if (item.sessionDate >= prev.lastDate) prev.lastDate = item.sessionDate;
      }
    }
    return Array.from(map.entries())
      .map(([key, info]) => ({ key, label: info.label, count: info.count, lastDate: info.lastDate }))
      .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
  }, [exerciseLogs]);

  const activeExerciseKey = useMemo(() => {
    if (userSelection === 'ALL') return 'ALL';
    if (userSelection && uniqueExercises.some((e) => e.key === userSelection)) {
      return userSelection;
    }
    return uniqueExercises[0]?.key || 'ALL';
  }, [userSelection, uniqueExercises]);

  const activeExerciseLabel = useMemo(() => {
    return uniqueExercises.find((e) => e.key === activeExerciseKey)?.label || 'Exercise';
  }, [uniqueExercises, activeExerciseKey]);

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

  // Short axis date formatter (e.g. "13 Nov")
  const formatShortDate = (dateStr: string) => {
    const readable = formatReadableDate(dateStr);
    if (!readable) return dateStr;
    const parts = readable.split(' ');
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : readable;
  };

  // Per-session aggregate chart data (for "ALL")
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
          dateLabel: formatShortDate(s.sessionDate),
          volumeKg: Math.round(sessionVolume * 10) / 10,
          totalReps: sessionReps,
          totalSets: sessionSets,
        };
      });
  }, [completedSessions]);

  // Per-exercise progression data for separate Weight & Reps trend charts
  const exerciseChartData = useMemo<ExercisePoint[]>(() => {
    if (activeExerciseKey === 'ALL') return [];
    const filtered = exerciseLogs.filter((item) => item.normalizedName === activeExerciseKey);
    if (filtered.length === 0) return [];
    const firstWeight = filtered[0].weightKg;
    const firstReps = filtered[0].reps;
    return filtered.map((item) => ({
      dateLabel: formatShortDate(item.sessionDate),
      fullDateLabel: `${formatReadableDate(item.sessionDate) || item.sessionDate} · ${item.startTime}`,
      weightKg: item.weightKg,
      reps: item.reps,
      sets: item.sets,
      durationSeconds: item.durationSeconds,
      volumeKg: item.volumeKg,
      weightDeltaFromStart: Math.round((item.weightKg - firstWeight) * 10) / 10,
      repsDeltaFromStart: item.reps - firstReps,
    }));
  }, [exerciseLogs, activeExerciseKey]);

  const exerciseTrendStats = useMemo(() => {
    if (exerciseChartData.length === 0) return null;
    const first = exerciseChartData[0];
    const latest = exerciseChartData[exerciseChartData.length - 1];
    const peakWeight = Math.max(...exerciseChartData.map((d) => d.weightKg));
    const peakReps = Math.max(...exerciseChartData.map((d) => d.reps));
    const weightGain = Math.round((latest.weightKg - first.weightKg) * 10) / 10;
    const repsGain = latest.reps - first.reps;
    const weightPct = first.weightKg > 0 ? Math.round((weightGain / first.weightKg) * 100) : null;
    const repsPct = first.reps > 0 ? Math.round((repsGain / first.reps) * 100) : null;

    return {
      sessions: exerciseChartData.length,
      startWeight: first.weightKg,
      latestWeight: latest.weightKg,
      peakWeight,
      weightGain,
      weightPct,
      startReps: first.reps,
      latestReps: latest.reps,
      peakReps,
      repsGain,
      repsPct,
    };
  }, [exerciseChartData]);

  const yWeightDomain = useMemo<[number, number]>(() => {
    if (exerciseChartData.length === 0) return [0, 50];
    const vals = exerciseChartData.map((d) => d.weightKg);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) {
      return [Math.max(0, Math.floor(min - 5)), Math.ceil(max + 5)];
    }
    const pad = Math.max(2, Math.ceil((max - min) * 0.25));
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [exerciseChartData]);

  const yRepsDomain = useMemo<[number, number]>(() => {
    if (exerciseChartData.length === 0) return [0, 20];
    const vals = exerciseChartData.map((d) => d.reps);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) {
      return [Math.max(0, Math.floor(min - 3)), Math.ceil(max + 3)];
    }
    const pad = Math.max(1, Math.ceil((max - min) * 0.25));
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [exerciseChartData]);

  // Exercise breakdown summary table
  const exerciseBreakdown = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
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
        key: item.normalizedName,
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

    return Array.from(grouped.values()).sort(
      (a, b) => b.sessions.size - a.sessions.size || b.totalVolumeKg - a.totalVolumeKg
    );
  }, [exerciseLogs]);

  const latestLoggedSessions = useMemo(() => {
    return [...completedSessions]
      .filter((s) => (s.exercises || []).length > 0)
      .reverse()
      .slice(0, 3);
  }, [completedSessions]);

  const renderDeltaBadge = (delta: number, unit: string, pct: number | null) => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 font-mono tabular-nums">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>
            +{delta} {unit}
            {pct !== null ? ` (+${pct}%)` : ''}
          </span>
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 font-mono tabular-nums">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>
            {delta} {unit}
            {pct !== null ? ` (${pct}%)` : ''}
          </span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 font-mono tabular-nums">
        <Minus className="w-3.5 h-3.5" />
        <span>No change vs start</span>
      </span>
    );
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
      {/* Header + Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Dumbbell className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-base">
              Training Session &amp; Exercise Progression Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track improvements in Weight (kg) and Reps over time for each exercise recorded by your trainer.
          </p>
        </div>

        {uniqueExercises.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick Exercise Chips for top 4 exercises */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {uniqueExercises.slice(0, 4).map((ex) => (
                <button
                  key={ex.key}
                  type="button"
                  onClick={() => setUserSelection(ex.key)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeExerciseKey === ex.key
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUserSelection('ALL')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeExerciseKey === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sessions
              </button>
            </div>

            {uniqueExercises.length > 4 && (
              <select
                id="exercise-analytics-filter"
                aria-label="Select exercise for trend charts"
                value={activeExerciseKey}
                onChange={(e) => setUserSelection(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-600"
              >
                {uniqueExercises.map((ex) => (
                  <option key={ex.key} value={ex.key}>
                    {ex.label} ({ex.count})
                  </option>
                ))}
                <option value="ALL">All Exercises (Session Totals)</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {exerciseLogs.length === 0 ? (
        <div className="py-10 px-4 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">No Exercise Trend Data Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {completedSessions.length > 0
              ? `You have ${completedSessions.length} completed session(s). Weight and Reps trend charts will appear automatically as your trainer logs exercises on session completion.`
              : 'Once your trainer completes a training session and logs your exercises (name, weight, reps, sets or time period), dedicated Weight and Reps progression trend charts will appear here.'}
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

          {/* Dedicated Weight & Reps Trend Charts for Specific Exercise */}
          {activeExerciseKey !== 'ALL' && exerciseTrendStats ? (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {activeExerciseLabel} — Weight &amp; Reps Progression
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {exerciseTrendStats.sessions} session{exerciseTrendStats.sessions === 1 ? '' : 's'} tracked · Start{' '}
                    <span className="font-mono tabular-nums text-slate-700">
                      {exerciseTrendStats.startWeight}kg / {exerciseTrendStats.startReps} reps
                    </span>{' '}
                    → Latest{' '}
                    <span className="font-mono tabular-nums text-slate-900 font-semibold">
                      {exerciseTrendStats.latestWeight}kg / {exerciseTrendStats.latestReps} reps
                    </span>
                  </p>
                </div>
                {exerciseChartData.length === 1 && (
                  <span className="text-[11px] text-slate-500">
                    1 session logged — log another session to extend trend line
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart 1: Weight Over Time */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Weight Improvement (kg)</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Peak: {exerciseTrendStats.peakWeight} kg
                      </div>
                    </div>
                    {renderDeltaBadge(exerciseTrendStats.weightGain, 'kg', exerciseTrendStats.weightPct)}
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={exerciseChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="exerciseWeightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis domain={yWeightDomain} tick={{ fontSize: 11, fill: '#64748b' }} unit=" kg" />
                        <Tooltip content={<WeightTrendTooltip />} />
                        {exerciseChartData.length > 1 && (
                          <ReferenceLine
                            y={exerciseTrendStats.peakWeight}
                            stroke="#93c5fd"
                            strokeDasharray="4 4"
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="weightKg"
                          name="Weight (kg)"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          fill="url(#exerciseWeightGrad)"
                          dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 6, fill: '#1d4ed8' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Reps Over Time */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Reps Improvement (per set)</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Peak: {exerciseTrendStats.peakReps} reps
                      </div>
                    </div>
                    {renderDeltaBadge(exerciseTrendStats.repsGain, 'reps', exerciseTrendStats.repsPct)}
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={exerciseChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="exerciseRepsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis allowDecimals={false} domain={yRepsDomain} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip content={<RepsTrendTooltip />} />
                        {exerciseChartData.length > 1 && (
                          <ReferenceLine
                            y={exerciseTrendStats.peakReps}
                            stroke="#6ee7b7"
                            strokeDasharray="4 4"
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="reps"
                          name="Reps"
                          stroke="#059669"
                          strokeWidth={2.5}
                          fill="url(#exerciseRepsGrad)"
                          dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 6, fill: '#047857' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* All Exercises Session Overview */
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Session Volume (kg) &amp; Total Reps Across All Exercises
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Select any exercise above or click a row below to inspect Weight &amp; Reps trend lines.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {overviewChartData.length} session{overviewChartData.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Exercise Performance Summary Table (clickable rows to view Weight & Reps trend) */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">Exercise Breakdown Summary</h4>
              <span className="text-[11px] text-slate-500">Click an exercise to view its Weight &amp; Reps trends</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 pr-3">Exercise Name</th>
                    <th className="py-2 px-3 text-right">Sessions</th>
                    <th className="py-2 px-3 text-right">Best Weight</th>
                    <th className="py-2 px-3 text-right">Total Reps</th>
                    <th className="py-2 px-3 text-right">Sets / Time</th>
                    <th className="py-2 pl-3 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exerciseBreakdown.map((item) => {
                    const isSelected = activeExerciseKey === item.key;
                    return (
                      <tr
                        key={item.key}
                        onClick={() => setUserSelection(item.key)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
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
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {item.totalSets > 0 && item.totalDurationSeconds > 0
                            ? `${item.totalSets} sets · ${formatDurationLabel(item.totalDurationSeconds)}`
                            : item.totalSets > 0
                            ? `${item.totalSets} sets`
                            : formatDurationLabel(item.totalDurationSeconds)}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                              isSelected ? 'text-blue-700' : 'text-slate-500'
                            }`}
                          >
                            <span>{isSelected ? 'Viewing' : 'View'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
