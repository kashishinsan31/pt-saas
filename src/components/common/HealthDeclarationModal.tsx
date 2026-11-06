import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, HealthDeclaration } from '../../types';
import { SignatureCanvas } from './SignatureCanvas';
import { formatReadableDate } from '../../utils/dubaiTime';
import {
  FileText,
  ShieldCheck,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  PenTool,
  RotateCcw,
  Check,
  User,
  HeartPulse,
} from 'lucide-react';

interface HealthDeclarationModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export const HealthDeclarationModal: React.FC<HealthDeclarationModalProps> = ({
  client,
  isOpen,
  onClose,
  canEdit = true,
}) => {
  const { settings, saveClientHealthDeclaration, currentUser } = useApp();

  const existingDecl = client.healthDeclaration;

  const [hasHeartCondition, setHasHeartCondition] = useState(existingDecl?.hasHeartCondition ?? false);
  const [hasChestPain, setHasChestPain] = useState(existingDecl?.hasChestPain ?? false);
  const [hasDizzinessOrFainting, setHasDizzinessOrFainting] = useState(existingDecl?.hasDizzinessOrFainting ?? false);
  const [hasBoneJointIssue, setHasBoneJointIssue] = useState(existingDecl?.hasBoneJointIssue ?? false);
  const [hasBloodPressureIssue, setHasBloodPressureIssue] = useState(existingDecl?.hasBloodPressureIssue ?? false);
  const [hasAsthmaOrBreathing, setHasAsthmaOrBreathing] = useState(existingDecl?.hasAsthmaOrBreathing ?? false);
  const [hasChronicIllness, setHasChronicIllness] = useState(existingDecl?.hasChronicIllness ?? false);
  const [isPregnantOrRecentPostpartum, setIsPregnantOrRecentPostpartum] = useState(
    existingDecl?.isPregnantOrRecentPostpartum ?? false
  );
  const [additionalMedicalDetails, setAdditionalMedicalDetails] = useState(
    existingDecl?.additionalMedicalDetails || ''
  );
  const [doctorClearanceProvided, setDoctorClearanceProvided] = useState(
    existingDecl?.doctorClearanceProvided ?? true
  );
  const [agreedToDeclaration, setAgreedToDeclaration] = useState(existingDecl?.agreedToDeclaration ?? false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(existingDecl?.signatureDataUrl || '');
  const [witnessName, setWitnessName] = useState(existingDecl?.witnessOrTrainerName || currentUser?.name || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(!existingDecl?.signed);

  if (!isOpen) return null;

  const handleSaveSignature = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreedToDeclaration) {
      setErrorMessage('Please check the confirmation box acknowledging you agree to the health declaration.');
      return;
    }

    if (!signatureDataUrl) {
      setErrorMessage('Please draw your digital signature on the signature pad before submitting.');
      return;
    }

    const newDeclaration: HealthDeclaration = {
      signed: true,
      signedAt: new Date().toISOString(),
      signatureDataUrl,
      clientName: client.fullName,
      emergencyContactName: client.emergencyContact.name,
      emergencyContactPhone: client.emergencyContact.phone,
      hasHeartCondition,
      hasChestPain,
      hasDizzinessOrFainting,
      hasBoneJointIssue,
      hasBloodPressureIssue,
      hasAsthmaOrBreathing,
      hasChronicIllness,
      isPregnantOrRecentPostpartum,
      additionalMedicalDetails,
      doctorClearanceProvided,
      agreedToDeclaration: true,
      witnessOrTrainerName: witnessName,
    };

    saveClientHealthDeclaration(client.id, newDeclaration);
    setSaveSuccess(true);
    setIsEditingExisting(false);

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const isSigned = client.healthDeclaration?.signed;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header - Native App Style */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Declaration of Health & Illness (PAR-Q)</h3>
              <p className="text-xs text-slate-300">
                Client: <span className="font-semibold text-white">{client.fullName}</span> ({client.id})
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

        {/* Status Banner */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            {isSigned ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-800">
                  Declaration Electronically Signed & Verified
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-bold text-amber-800">
                  Signature Pending • Action Required
                </span>
              </>
            )}
          </div>

          {isSigned && !isEditingExisting && canEdit && (
            <button
              onClick={() => setIsEditingExisting(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Update / Re-Sign</span>
            </button>
          )}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs text-slate-700">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Declaration & Digital Signature successfully recorded!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If already signed and not currently re-editing, show signature receipt view */}
          {isSigned && !isEditingExisting ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Official Signed Declaration Record</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Valid in Dubai, UAE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Signatory Full Name:</span>
                    <span className="font-bold text-slate-900">{existingDecl?.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date & Time of Signature:</span>
                    <span className="font-bold text-slate-900">
                      {existingDecl?.signedAt
                        ? new Date(existingDecl.signedAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })
                        : 'Recorded'}{' '}
                      GST
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Emergency Contact:</span>
                    <span className="font-bold text-slate-900">
                      {existingDecl?.emergencyContactName} ({existingDecl?.emergencyContactPhone})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Witness / Trainer:</span>
                    <span className="font-bold text-slate-900">{existingDecl?.witnessOrTrainerName || 'Admin'}</span>
                  </div>
                </div>

                {existingDecl?.additionalMedicalDetails && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/50">
                    <span className="text-slate-500 block text-[11px] font-semibold">
                      Disclosed Medical & Health Notes:
                    </span>
                    <p className="font-medium text-slate-800 mt-0.5">{existingDecl.additionalMedicalDetails}</p>
                  </div>
                )}
              </div>

              {/* Signature Image Preview */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-600" />
                    <span>Captured Digital Signature</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ Verified
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center min-h-[100px]">
                  {existingDecl?.signatureDataUrl ? (
                    <img
                      src={existingDecl.signatureDataUrl}
                      alt="Client Digital Signature"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic">Signature on file</span>
                  )}
                </div>
              </div>

              {/* View Terms */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Declaration Terms Accepted by Client</span>
                </div>
                <div className="p-4 bg-slate-50/50 max-h-40 overflow-y-auto whitespace-pre-line font-mono text-[11px] text-slate-600 leading-relaxed">
                  {settings.healthDeclarationText}
                </div>
              </div>
            </div>
          ) : (
            /* Signing Form */
            <form onSubmit={handleSaveSignature} className="space-y-6">
              {/* Official Declaration Text Box */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-blue-50/70 font-bold text-blue-950 border-b border-blue-200/50 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Physical Activity Readiness Agreement (PAR-Q)</span>
                </div>
                <div className="p-4 bg-slate-50 max-h-36 overflow-y-auto whitespace-pre-line text-[11px] text-slate-600 leading-relaxed font-sans border-b border-slate-200">
                  {settings.healthDeclarationText ||
                    'Please declare your current physical readiness and health conditions.'}
                </div>
              </div>

              {/* Health Questionnaire Checklist */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                  <span>Medical Readiness Assessment Checklist</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Please answer each item honestly to ensure your personal trainer designs a safe and effective training program.
                </p>

                <div className="space-y-2.5 pt-2">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHeartCondition}
                      onChange={(e) => setHasHeartCondition(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Has a doctor ever said that you have a <strong>heart condition</strong> or murmur?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasChestPain}
                      onChange={(e) => setHasChestPain(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Do you feel pain or tightness in your <strong>chest</strong> when doing physical activity?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDizzinessOrFainting}
                      onChange={(e) => setHasDizzinessOrFainting(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Do you frequently lose balance because of <strong>dizziness</strong> or have you ever lost consciousness?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBoneJointIssue}
                      onChange={(e) => setHasBoneJointIssue(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Do you have a <strong>bone, joint, or spinal injury</strong> that could be worsened by physical exercise?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBloodPressureIssue}
                      onChange={(e) => setHasBloodPressureIssue(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Are you currently taking medication for <strong>blood pressure</strong> or heart condition?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAsthmaOrBreathing}
                      onChange={(e) => setHasAsthmaOrBreathing(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Do you suffer from <strong>asthma, respiratory issues</strong>, or exercise-induced shortness of breath?
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasChronicIllness}
                      onChange={(e) => setHasChronicIllness(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      Do you have any <strong>chronic illnesses</strong> (e.g. diabetes, epilepsy, autoimmune condition)?
                    </span>
                  </label>

                  {client.gender === 'Female' && (
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPregnantOrRecentPostpartum}
                        onChange={(e) => setIsPregnantOrRecentPostpartum(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-700">
                        Are you currently <strong>pregnant</strong> or have given birth within the past 6 months?
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Medical Details Text */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Additional Medical Details, Surgeries, or Regular Medications
                </label>
                <textarea
                  rows={2}
                  value={additionalMedicalDetails}
                  onChange={(e) => setAdditionalMedicalDetails(e.target.value)}
                  placeholder="Provide any details regarding injuries, current medications, or movement restrictions..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Emergency Contact Confirmation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">Emergency Contact on Record:</span>
                  <p className="text-slate-600 text-[11px]">
                    {client.emergencyContact.name} ({client.emergencyContact.relationship}) •{' '}
                    {client.emergencyContact.phone}
                  </p>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  Confirmed
                </span>
              </div>

              {/* Signature Canvas */}
              <div className="space-y-1">
                <SignatureCanvas
                  initialSignature={signatureDataUrl}
                  onSave={(data) => setSignatureDataUrl(data)}
                  height={130}
                />
              </div>

              {/* Agreement Checkbox */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start space-x-2.5 cursor-pointer p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToDeclaration}
                    onChange={(e) => setAgreedToDeclaration(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-700 font-medium">
                    I confirm that the information provided above is complete and correct. I have read, understood, and agreed to the <strong>Physical Activity Readiness & Health Declaration</strong> terms and conditions.
                  </span>
                </label>

                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">
                      Witness / Assigned Coach Name
                    </label>
                    <input
                      type="text"
                      value={witnessName}
                      onChange={(e) => setWitnessName(e.target.value)}
                      placeholder="e.g. Coach Name"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center space-x-1.5 text-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Electronically Sign</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
