import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDubaiDate } from '../../utils/dubaiTime';
import { X, Scale, CheckCircle2 } from 'lucide-react';

interface LogBodyMetricModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LogBodyMetricModal: React.FC<LogBodyMetricModalProps> = ({
  clientId,
  isOpen,
  onClose,
}) => {
  const { logClientBodyMetric } = useApp();
  const [date, setDate] = useState(() => formatDubaiDate(new Date()));
  const [weightKg, setWeightKg] = useState<number | ''>(81.5);
  const [muscleMassKg, setMuscleMassKg] = useState<number | ''>(34.5);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | ''>(21.5);
  const [habitScore, setHabitScore] = useState<number>(90);
  const [waterLitres, setWaterLitres] = useState<number | ''>(3.0);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg || Number(weightKg) <= 0) return;

    setIsSubmitting(true);
    const res = await logClientBodyMetric(clientId, {
      date,
      weightKg: Number(weightKg),
      muscleMassKg: muscleMassKg ? Number(muscleMassKg) : undefined,
      bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
      habitConsistencyScore: habitScore,
      waterLitres: waterLitres ? Number(waterLitres) : undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    if (res.success) {
      setFeedback(res.message);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } else {
      setFeedback(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg">Log Body Metric Check-In</h3>
              <p className="text-xs text-emerald-100">Record your latest physical transformation data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {feedback && (
            <div className="p-3.5 rounded-xl border text-xs font-bold flex items-center space-x-2 bg-emerald-50 border-emerald-300 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Check-in Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                min={30}
                max={300}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-blue-900 text-sm"
                placeholder="e.g. 81.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Muscle Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                min={10}
                max={150}
                value={muscleMassKg}
                onChange={(e) => setMuscleMassKg(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-emerald-800"
                placeholder="e.g. 34.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Body Fat (%)</label>
              <input
                type="number"
                step="0.1"
                min={3}
                max={60}
                value={bodyFatPercentage}
                onChange={(e) => setBodyFatPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-orange-800"
                placeholder="e.g. 21.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Water Intake (L)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={waterLitres}
                onChange={(e) => setWaterLitres(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-cyan-800"
                placeholder="e.g. 3.2"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700 uppercase">Habit Consistency: {habitScore}%</label>
              <span className="text-[10px] text-slate-500 font-semibold">Diet & Steps Compliance</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={habitScore}
              onChange={(e) => setHabitScore(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Workout & Energy Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              placeholder="e.g. Completed 12,000 steps, feeling stronger during upper body push session..."
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Saving to Server...' : 'Save Check-in Metric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
