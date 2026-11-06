import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HealthIssueCategory, HealthIssueSeverity, HealthIssueStatus, HealthIssueNote } from '../../types';
import {
  HeartPulse,
  AlertTriangle,
  X,
  Plus,
  CheckCircle,
  FileText,
  Activity,
  ShieldAlert,
  Bell,
} from 'lucide-react';

interface AddHealthIssueModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (note: HealthIssueNote) => void;
  initialNote?: HealthIssueNote;
}

const CATEGORIES: HealthIssueCategory[] = [
  'Injury',
  'Cardiovascular',
  'Chronic Condition',
  'Surgery',
  'Allergy',
  'Doctor Clearance',
  'Medication',
  'Physical Restriction',
  'General Health',
];

const SEVERITIES: HealthIssueSeverity[] = ['Low', 'Moderate', 'High', 'Critical'];
const STATUSES: HealthIssueStatus[] = ['Active', 'Monitoring', 'Resolved'];

export const AddHealthIssueModal: React.FC<AddHealthIssueModalProps> = ({
  clientId,
  clientName,
  isOpen,
  onClose,
  onAdded,
  initialNote,
}) => {
  const { addClientHealthIssue, updateClientHealthIssue, currentUser } = useApp();

  const [category, setCategory] = useState<HealthIssueCategory>(initialNote?.category || 'Injury');
  const [title, setTitle] = useState(initialNote?.title || '');
  const [description, setDescription] = useState(initialNote?.description || '');
  const [severity, setSeverity] = useState<HealthIssueSeverity>(initialNote?.severity || 'Moderate');
  const [status, setStatus] = useState<HealthIssueStatus>(initialNote?.status || 'Active');
  const [affectedArea, setAffectedArea] = useState(initialNote?.affectedArea || '');
  const [treatmentPlan, setTreatmentPlan] = useState(initialNote?.treatmentPlan || '');
  const [trainerAlert, setTrainerAlert] = useState(initialNote?.trainerAlert ?? true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please provide a condition title (e.g. Lumbar Disc Strain, Asthma, Knee Surgery).');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide clinical or exercise notes for the trainer.');
      return;
    }

    if (initialNote) {
      updateClientHealthIssue(clientId, initialNote.id, {
        category,
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        affectedArea: affectedArea.trim(),
        treatmentPlan: treatmentPlan.trim(),
        trainerAlert,
      });
      setSuccessMessage('Health condition note successfully updated.');
    } else {
      const recordedBy = currentUser?.name || 'Chief Admin';
      const createdNote = addClientHealthIssue(clientId, {
        category,
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        recordedBy,
        trainerAlert,
        affectedArea: affectedArea.trim() || undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
      });
      if (onAdded) onAdded(createdNote);
      setSuccessMessage('Health condition note successfully added.');
    }

    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {initialNote ? 'Edit Health Condition Note' : 'Add Health Condition / Issue'}
              </h3>
              <p className="text-xs text-slate-300">
                Client: <span className="font-semibold text-white">{clientName}</span> ({clientId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category / Type of Note */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Condition Type / Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HealthIssueCategory)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Rating */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Severity / Risk Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as HealthIssueSeverity)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-xs"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev === 'Critical'
                      ? 'Critical (Medical Alert)'
                      : sev === 'High'
                      ? 'High (Strict Modification)'
                      : sev === 'Moderate'
                      ? 'Moderate (Routine Care)'
                      : 'Low (Informational)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition Title */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Condition Title / Diagnosis <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lumbar Disc Strain L4/L5, Asthma Inhaler, Latex Band Allergy"
              className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Affected Area / Body System */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Affected Area / Joint / System</label>
              <input
                type="text"
                value={affectedArea}
                onChange={(e) => setAffectedArea(e.target.value)}
                placeholder="e.g. Lower Back, Right Shoulder, Respiratory"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Clinical Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as HealthIssueStatus)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-xs"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Clinical / Exercise Notes */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Detailed Notes & Movement Restrictions <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of symptoms, restricted movements (e.g. avoid spinal flexion, overhead pressing), triggers, or precautions..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs leading-relaxed"
            />
          </div>

          {/* Treatment Plan or Doctor Instructions */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Doctor Instructions / Coaching Recommendations
            </label>
            <input
              type="text"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="e.g. Warm up rotator cuff with bands; doctor clearance renewed Jan 2026."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          {/* Trainer Session Alert Checkbox */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="trainerAlert"
              checked={trainerAlert}
              onChange={(e) => setTrainerAlert(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="trainerAlert" className="text-xs text-amber-900 font-medium cursor-pointer">
              <span className="font-bold block flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-600 inline" />
                Alert Trainer During Session Check-in
              </span>
              Display high-priority warning badge to assigned trainer during bookings.
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md text-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{initialNote ? 'Update Note' : 'Save Health Condition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
