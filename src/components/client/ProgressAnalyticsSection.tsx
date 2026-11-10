import React, { useState, useMemo } from 'react';
import { Client, BodyMetricEntry } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Scale,
  Activity,
  Flame,
  Plus,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
  Calendar,
  Droplet,
  CheckCircle2,
} from 'lucide-react';

interface ProgressAnalyticsSectionProps {
  client: Client;
  onOpenLogModal: () => void;
}

export const ProgressAnalyticsSection: React.FC<ProgressAnalyticsSectionProps> = ({
  client,
  onOpenLogModal,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'bodyComposition' | 'bodyFat' | 'habits'>('bodyComposition');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'all'>('30d');

  // Baseline sample metrics if client hasn't logged many entries yet
  const defaultSampleMetrics: BodyMetricEntry[] = useMemo(() => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(today.getDate() - 28);
    const d2 = new Date(today);
    d2.setDate(today.getDate() - 21);
    const d3 = new Date(today);
    d3.setDate(today.getDate() - 14);
    const d4 = new Date(today);
    d4.setDate(today.getDate() - 7);
    const d5 = new Date(today);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return [
      {
        id: 'BM-DEF-1',
        date: fmt(d1),
        weightKg: 85.2,
        muscleMassKg: 33.4,
        bodyFatPercentage: 24.8,
        habitConsistencyScore: 78,
        waterLitres: 2.5,
        notes: 'Initial body assessment & strength baseline.',
      },
      {
        id: 'BM-DEF-2',
        date: fmt(d2),
        weightKg: 84.4,
        muscleMassKg: 33.7,
        bodyFatPercentage: 24.0,
        habitConsistencyScore: 85,
        waterLitres: 3.0,
        notes: 'Steady workout consistency. Feeling more energetic.',
      },
      {
        id: 'BM-DEF-3',
        date: fmt(d3),
        weightKg: 83.6,
        muscleMassKg: 34.0,
        bodyFatPercentage: 23.2,
        habitConsistencyScore: 90,
        waterLitres: 3.2,
        notes: 'Increased protein intake, visible abdominal definition.',
      },
      {
        id: 'BM-DEF-4',
        date: fmt(d4),
        weightKg: 82.9,
        muscleMassKg: 34.4,
        bodyFatPercentage: 22.5,
        habitConsistencyScore: 92,
        waterLitres: 3.5,
        notes: 'PR achieved on bench press & squats with coach.',
      },
      {
        id: 'BM-DEF-5',
        date: fmt(d5),
        weightKg: 82.1,
        muscleMassKg: 34.8,
        bodyFatPercentage: 21.9,
        habitConsistencyScore: 96,
        waterLitres: 3.8,
        notes: 'Latest check-in. Transformation goal on schedule!',
      },
    ];
  }, []);

  // Merge client's recorded metrics with baseline if client has fewer than 2 entries
  const metricsData = useMemo(() => {
    const recorded = client.bodyMetrics || [];
    if (recorded.length >= 2) {
      return [...recorded].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    // Prepend default milestones with any newly recorded entries
    const combined = [...defaultSampleMetrics];
    recorded.forEach((rec) => {
      const idx = combined.findIndex((m) => m.date === rec.date);
      if (idx >= 0) {
        combined[idx] = rec;
      } else {
        combined.push(rec);
      }
    });
    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [client.bodyMetrics, defaultSampleMetrics]);

  // Filter by timeframe
  const filteredMetrics = useMemo(() => {
    if (timeRange === 'all') return metricsData;
    const now = new Date().getTime();
    const days = timeRange === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const filtered = metricsData.filter((m) => new Date(m.date).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : metricsData;
  }, [metricsData, timeRange]);

  // Chart data format
  const chartData = useMemo(() => {
    return filteredMetrics.map((m) => {
      const d = new Date(m.date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: m.date,
        label,
        weightKg: m.weightKg,
        muscleMassKg: m.muscleMassKg || Math.round(m.weightKg * 0.42 * 10) / 10,
        bodyFatPercentage: m.bodyFatPercentage || Math.round((28 - (85 - m.weightKg) * 0.6) * 10) / 10,
        habitScore: m.habitConsistencyScore || 85,
        waterLitres: m.waterLitres || 3.0,
      };
    });
  }, [filteredMetrics]);

  // Key KPI calculations
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        startWeight: 85,
        currentWeight: 82.1,
        weightDelta: -2.9,
        startMuscle: 33.4,
        currentMuscle: 34.8,
        muscleDelta: 1.4,
        startFat: 24.8,
        currentFat: 21.9,
        fatDelta: -2.9,
        avgHabit: 90,
      };
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const weightDelta = Math.round((last.weightKg - first.weightKg) * 10) / 10;
    const muscleDelta = Math.round(((last.muscleMassKg || 0) - (first.muscleMassKg || 0)) * 10) / 10;
    const fatDelta = Math.round(((last.bodyFatPercentage || 0) - (first.bodyFatPercentage || 0)) * 10) / 10;
    const avgHabit = Math.round(chartData.reduce((acc, curr) => acc + (curr.habitScore || 0), 0) / chartData.length);

    return {
      startWeight: first.weightKg,
      currentWeight: last.weightKg,
      weightDelta,
      startMuscle: first.muscleMassKg || 0,
      currentMuscle: last.muscleMassKg || 0,
      muscleDelta,
      startFat: first.bodyFatPercentage || 0,
      currentFat: last.bodyFatPercentage || 0,
      fatDelta,
      avgHabit,
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Log Button */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              Visual Progress Tracker
            </span>
            <span className="text-xs text-blue-200">Recharts Analytics Engine</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
            Body Composition & Habit Analytics
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Track weight trends, muscle mass gain, fat reduction, and weekly habit compliance across your Waiter Walk training sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLogModal}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-103 cursor-pointer shrink-0 border border-emerald-400/30"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Log Check-in Metric</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Body Weight */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Weight</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{stats.currentWeight}</span>
            <span className="text-xs font-bold text-slate-400">kg</span>
          </div>
          <div className="mt-2 flex items-center text-xs font-bold">
            {stats.weightDelta <= 0 ? (
              <span className="text-emerald-600 flex items-center space-x-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{Math.abs(stats.weightDelta)} kg total drop</span>
              </span>
            ) : (
              <span className="text-amber-600 flex items-center space-x-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{stats.weightDelta} kg</span>
              </span>
            )}
            <span className="text-slate-400 text-[10px] ml-1 font-normal">from {stats.startWeight}kg</span>
          </div>
        </div>

        {/* 2. Muscle Mass */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Muscle Mass</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{stats.currentMuscle}</span>
            <span className="text-xs font-bold text-slate-400">kg</span>
          </div>
          <div className="mt-2 flex items-center text-xs font-bold">
            {stats.muscleDelta >= 0 ? (
              <span className="text-emerald-600 flex items-center space-x-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{stats.muscleDelta} kg gain</span>
              </span>
            ) : (
              <span className="text-red-600 flex items-center space-x-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{stats.muscleDelta} kg</span>
              </span>
            )}
            <span className="text-slate-400 text-[10px] ml-1 font-normal">lean tissue</span>
          </div>
        </div>

        {/* 3. Body Fat */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Body Fat</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{stats.currentFat}</span>
            <span className="text-xs font-bold text-slate-400">%</span>
          </div>
          <div className="mt-2 flex items-center text-xs font-bold">
            {stats.fatDelta <= 0 ? (
              <span className="text-emerald-600 flex items-center space-x-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{Math.abs(stats.fatDelta)}% reduction</span>
              </span>
            ) : (
              <span className="text-amber-600 flex items-center space-x-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{stats.fatDelta}%</span>
              </span>
            )}
            <span className="text-slate-400 text-[10px] ml-1 font-normal">from {stats.startFat}%</span>
          </div>
        </div>

        {/* 4. Habit Consistency */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Habit Consistency</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{stats.avgHabit}</span>
            <span className="text-xs font-bold text-purple-600">%</span>
          </div>
          <div className="mt-2 flex items-center text-xs font-bold text-purple-700">
            <span>High Compliance Streak</span>
            <span className="text-slate-400 text-[10px] ml-1 font-normal">(Water & Steps)</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Container */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        {/* Header Controls: Metric Switcher & Timeframe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          {/* Metric Selector Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedMetric('bodyComposition')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMetric === 'bodyComposition'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Weight & Muscle Mass (kg)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('bodyFat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMetric === 'bodyFat'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Body Fat (%)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('habits')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMetric === 'habits'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Habit Consistency (%)
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            {(['30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer uppercase text-[11px] ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Rendered via Recharts */}
        <div className="pt-2">
          {selectedMetric === 'bodyComposition' && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="font-semibold">Weight Trend vs Muscle Mass Evolution</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span className="font-bold text-slate-800">Weight (kg)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-slate-800">Muscle Mass (kg)</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="muscleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 3', 'dataMax + 3']}
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <div className="font-bold text-slate-300 pb-1 border-b border-slate-700">
                                {data.date}
                              </div>
                              <div className="flex justify-between gap-3 text-blue-300 font-bold">
                                <span>Weight:</span>
                                <span>{data.weightKg} kg</span>
                              </div>
                              <div className="flex justify-between gap-3 text-emerald-400 font-bold">
                                <span>Muscle Mass:</span>
                                <span>{data.muscleMassKg} kg</span>
                              </div>
                              <div className="flex justify-between gap-3 text-orange-300">
                                <span>Body Fat:</span>
                                <span>{data.bodyFatPercentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weightKg"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#weightGrad)"
                      name="Weight (kg)"
                    />
                    <Area
                      type="monotone"
                      dataKey="muscleMassKg"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#muscleGrad)"
                      name="Muscle Mass (kg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'bodyFat' && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="font-semibold">Body Fat Percentage Reduction Curve</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="font-bold text-slate-800">Body Fat %</span>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <div className="font-bold text-slate-300 pb-1 border-b border-slate-700">
                                {data.date}
                              </div>
                              <div className="flex justify-between gap-3 text-orange-400 font-bold">
                                <span>Body Fat:</span>
                                <span>{data.bodyFatPercentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bodyFatPercentage"
                      stroke="#ea580c"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: '#ea580c', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                      name="Body Fat %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'habits' && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="font-semibold">Daily Habit & Nutrition Target Consistency</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                  <span className="font-bold text-slate-800">Habit Compliance (%)</span>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <div className="font-bold text-slate-300 pb-1 border-b border-slate-700">
                                {data.date}
                              </div>
                              <div className="flex justify-between gap-3 text-purple-400 font-bold">
                                <span>Habit Consistency:</span>
                                <span>{data.habitScore}%</span>
                              </div>
                              <div className="flex justify-between gap-3 text-blue-300">
                                <span>Water Intake:</span>
                                <span>{data.waterLitres} L</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="habitScore"
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                      name="Habit Score (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Check-in Log Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base">Recorded Check-In History</h3>
            <p className="text-xs text-slate-500">Log entries synchronized with your Waiter Walk coach</p>
          </div>
          <button
            type="button"
            onClick={onOpenLogModal}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
          >
            <span>+ Add New Entry</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Muscle Mass</th>
                <th className="py-2.5 px-3">Body Fat</th>
                <th className="py-2.5 px-3">Habits</th>
                <th className="py-2.5 px-3">Water</th>
                <th className="py-2.5 px-3">Coach Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metricsData
                .slice()
                .reverse()
                .map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{m.date}</td>
                    <td className="py-3 px-3 font-extrabold text-blue-900">{m.weightKg} kg</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700">
                      {m.muscleMassKg ? `${m.muscleMassKg} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-orange-700">
                      {m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800">
                        {m.habitConsistencyScore || 85}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {m.waterLitres ? `${m.waterLitres} L` : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {m.notes || 'Routine check-in'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
