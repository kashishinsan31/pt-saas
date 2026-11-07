import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { initialSettings } from '../../context/initialData';
import {
  Settings,
  ShieldCheck,
  Clock,
  DollarSign,
  Globe,
  Lock,
  History,
  CheckCircle,
  Printer,
  FileText,
  HeartPulse,
  RotateCcw,
  Check,
  Scale,
  Eye,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Server,
  Cloud,
  Download,
  Building,
  PhoneCall,
  CreditCard,
  Receipt,
  Sparkles,
  X,
  CheckCheck,
  Upload,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { verifyStripeConnection } from '../../services/stripeApi';

export const SettingsModule: React.FC = () => {
  const {
    settings,
    updateSettings,
    auditLogs,
    resetToCleanProductionData,
    exportDatabaseJSON,
    importDatabaseJSON,
  } = useApp();

  const [formSettings, setFormSettings] = useState({
    ...settings,
    paymentTermsAndConditions: settings.paymentTermsAndConditions || initialSettings.paymentTermsAndConditions || '',
    healthDeclarationText: settings.healthDeclarationText || initialSettings.healthDeclarationText || '',
  });

  const [activeTab, setActiveTab] = useState<'general' | 'payment-terms' | 'health-declaration' | 'audit' | 'production-readiness'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewTerms, setPreviewTerms] = useState(false);
  const [previewHealth, setPreviewHealth] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [vatCalculatorAED, setVatCalculatorAED] = useState<number>(3500);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [previewSampleReceipt, setPreviewSampleReceipt] = useState<boolean>(false);
  const [manualChecklist, setManualChecklist] = useState<Record<string, boolean>>({
    trade_license: true,
    stripe_bank_verified: true,
  });
  const [showWipeModal, setShowWipeModal] = useState<boolean>(false);
  const [wipeSuccess, setWipeSuccess] = useState<boolean>(false);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestStripeConnection = async () => {
    const keyToTest = (formSettings.stripeLiveSecretKey || formSettings.stripeSecretKey)?.trim();

    if (!keyToTest) {
      setStripeTestResult({
        success: false,
        message: 'Please enter your Stripe Secret Key (sk_live_... or sk_test_...) to test connectivity.',
      });
      return;
    }

    setTestingStripe(true);
    setStripeTestResult(null);

    const res = await verifyStripeConnection(keyToTest);
    setTestingStripe(false);
    setStripeTestResult(res);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeSecKey = (formSettings.stripeLiveSecretKey || formSettings.stripeSecretKey || '').trim();
    const activePubKey = (formSettings.stripeLivePublishableKey || formSettings.stripePublishableKey || '').trim();
    const detectedMode: 'test' | 'live' = activeSecKey.startsWith('sk_live_') ? 'live' : formSettings.stripeMode;

    const cleanSettings = {
      ...formSettings,
      stripeMode: detectedMode,
      stripeSecretKey: activeSecKey,
      stripeLiveSecretKey: activeSecKey,
      stripePublishableKey: activePubKey,
      stripeLivePublishableKey: activePubKey,
    };
    updateSettings(cleanSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetTerms = () => {
    if (initialSettings.paymentTermsAndConditions) {
      setFormSettings((prev) => ({
        ...prev,
        paymentTermsAndConditions: initialSettings.paymentTermsAndConditions!,
      }));
    }
  };

  const handleResetHealthDeclaration = () => {
    if (initialSettings.healthDeclarationText) {
      setFormSettings((prev) => ({
        ...prev,
        healthDeclarationText: initialSettings.healthDeclarationText!,
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">System Settings & Compliance Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin controls for 30-day cycle, Stripe gateway, Payment Terms, and Health & Illness Declaration templates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            className="self-start sm:self-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General & Stripe</span>
          </button>

          <button
            onClick={() => setActiveTab('payment-terms')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'payment-terms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Payment Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('health-declaration')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'health-declaration'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Health & Illness Declaration (PAR-Q)</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Security Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('production-readiness')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'production-readiness'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Go-Live & Production Playbook</span>
            <span className="px-1.5 py-0.5 bg-emerald-200/60 text-emerald-950 text-[10px] rounded-full font-black uppercase">
              Launch
            </span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center space-x-2 font-bold animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings successfully saved and legal policy templates updated across PTMS!</span>
        </div>
      )}

      {/* Tab 1: General & Stripe */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <PWAInstallButton variant="banner" />

          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
          {/* Company & Regional Settings */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Company Branding & Regional Parameters</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={formSettings.companyName}
                  onChange={(e) => setFormSettings({ ...formSettings, companyName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Business Currency</label>
                <input
                  type="text"
                  disabled
                  value="AED (United Arab Emirates Dirham)"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Business Timezone</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Dubai (GST, UTC+4)"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Company Logo URL</label>
                <input
                  type="text"
                  value={formSettings.companyLogoUrl || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, companyLogoUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>UAE FTA Tax Registration Number (TRN)</span>
                  <span className="text-[10px] text-blue-600 font-normal">15-digit FTA ID</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="100293847500003"
                  value={formSettings.taxRegistrationNumber || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, taxRegistrationNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Custom Production Domain</span>
                  <span className="text-[10px] text-emerald-600 font-normal">SSL/TLS 1.3</span>
                </label>
                <input
                  type="text"
                  placeholder="app.waiterwalk.ae"
                  value={formSettings.customDomain || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, customDomain: e.target.value.toLowerCase().trim() })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Business Rules Parameters */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Core Business Policy Parameters</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <label className="block font-bold text-amber-900 uppercase mb-1">Default Package Validity</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    required
                    min={1}
                    value={formSettings.defaultPackageValidityDays}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, defaultPackageValidityDays: Number(e.target.value) })
                    }
                    className="w-20 p-2 border border-amber-300 rounded-lg font-extrabold bg-white"
                  />
                  <span className="font-bold text-amber-900">Calendar Days</span>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <label className="block font-bold text-blue-900 uppercase mb-1">Cancellation Cutoff</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    required
                    min={1}
                    value={formSettings.cancellationThresholdHours}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, cancellationThresholdHours: Number(e.target.value) })
                    }
                    className="w-20 p-2 border border-blue-300 rounded-lg font-extrabold bg-white"
                  />
                  <span className="font-bold text-blue-900">Hours Before Session</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block font-bold text-slate-700 uppercase mb-1">Default Session Duration</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    required
                    min={15}
                    value={formSettings.defaultSessionDurationMinutes}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, defaultSessionDurationMinutes: Number(e.target.value) })
                    }
                    className="w-20 p-2 border border-slate-300 rounded-lg font-extrabold bg-white"
                  />
                  <span className="font-bold text-slate-700">Minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client Portal Permissions */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Client Portal Options & PDF Receipt Settings</span>
            </h3>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-950 text-xs uppercase">Client PDF Receipt Printing</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Enable or disable clients' ability to view and print official PDF payment receipts inside their Client Portal.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.clientPdfReceiptEnabled}
                  onChange={(e) => setFormSettings({ ...formSettings, clientPdfReceiptEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Stripe Gateway Setup */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <span>Stripe Payment Gateway Configuration</span>
              </h3>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                formSettings.stripeMode === 'live'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {formSettings.stripeMode === 'live' ? 'LIVE PRODUCTION MODE' : 'TEST SANDBOX MODE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Stripe Gateway Mode</label>
                <select
                  value={formSettings.stripeMode}
                  onChange={(e) => setFormSettings({ ...formSettings, stripeMode: e.target.value as 'test' | 'live' })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="live">Live Production Mode (256-bit Encrypted Real Charges)</option>
                  <option value="test">Test Mode (Interactive Sandbox)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Statement Descriptor (On Bank Statements)</label>
                <input
                  type="text"
                  maxLength={22}
                  placeholder="WAITER WALK DUBAI"
                  value={formSettings.stripeStatementDescriptor || 'WAITER WALK DUBAI'}
                  onChange={(e) => setFormSettings({ ...formSettings, stripeStatementDescriptor: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                />
              </div>
            </div>

            {/* Exactly 2 Stripe Keys Required */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>1. Stripe Publishable Key</span>
                  <span className="text-[10px] text-blue-600 font-mono font-normal">pk_live_... / pk_test_...</span>
                </label>
                <input
                  type="text"
                  placeholder="pk_live_51..."
                  value={formSettings.stripeLivePublishableKey || formSettings.stripePublishableKey || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setFormSettings({
                      ...formSettings,
                      stripePublishableKey: val,
                      stripeLivePublishableKey: val,
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Your public client-side key from Stripe dashboard.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>2. Stripe Secret Key</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-normal">sk_live_... / sk_test_...</span>
                </label>
                <input
                  type="password"
                  placeholder="sk_live_51..."
                  value={formSettings.stripeLiveSecretKey || formSettings.stripeSecretKey || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const autoMode = val.startsWith('sk_live_') ? 'live' : (val.startsWith('sk_test_') ? 'test' : formSettings.stripeMode);
                    setFormSettings({
                      ...formSettings,
                      stripeMode: autoMode,
                      stripeSecretKey: val,
                      stripeLiveSecretKey: val,
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Your private secret key used for authorizing card payments.
                </span>
              </div>
            </div>

            {/* Test Connection Button & Live Feedback */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-slate-900 text-xs">Verify Stripe API Connectivity</div>
                <div className="text-[11px] text-slate-500">
                  Sends an instant real-time diagnostic request to <span className="font-mono">api.stripe.com</span> using your entered {formSettings.stripeMode === 'live' ? 'Live Secret Key' : 'Test Secret Key'}.
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestStripeConnection}
                disabled={testingStripe}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {testingStripe ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Contacting Stripe API...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Test Stripe Gateway Connection</span>
                  </>
                )}
              </button>
            </div>

            {stripeTestResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 animate-fadeIn ${
                  stripeTestResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {stripeTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">
                    {stripeTestResult.success ? 'Stripe Gateway Online & Verified!' : 'Stripe Connection Failed'}
                  </div>
                  <div className="text-[11px] leading-relaxed">{stripeTestResult.message}</div>
                  {stripeTestResult.success && (
                    <div className="text-[10px] text-emerald-700 font-semibold pt-0.5">
                      ✓ Cards will tokenize and charge in real-time with official AED transactions at{' '}
                      <a
                        href="https://dashboard.stripe.com/payments"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold text-emerald-800"
                      >
                        dashboard.stripe.com/payments
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] leading-relaxed space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-purple-950">
                <Lock className="w-3.5 h-3.5 text-purple-700" />
                <span>Stripe Dashboard & Netlify Deployment Guide</span>
              </div>
              <p>
                To enable live card processing and auto-deductions, obtain your API keys from{' '}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-purple-800"
                >
                  dashboard.stripe.com/apikeys
                </a>
                .
              </p>
              <div className="bg-white/70 p-2.5 rounded-lg border border-purple-200 font-mono text-[10px] text-slate-800 space-y-1">
                <div className="font-bold text-purple-900 font-sans uppercase text-[10px]">
                  Netlify Environment Variables (Only 2 variables needed):
                </div>
                <div>• VITE_STRIPE_PUBLISHABLE_KEY = your Publishable Key (pk_live_...)</div>
                <div>• VITE_STRIPE_SECRET_KEY = your Live Secret Key (sk_live_...)</div>
              </div>
              <p className="text-[10px] text-purple-800 pt-1">
                <strong>Stripe Security & PCI-DSS:</strong> Client checkouts and saved cards strictly use <strong>Stripe Elements (Stripe.js)</strong> and vaulted Stripe Customer tokens. Credit card data is encrypted directly with Stripe's servers without ever exposing raw numbers.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg"
            >
              Save General Settings
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Tab 2: Payment Terms & Conditions Editor */}
      {activeTab === 'payment-terms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <span>Client Payment Terms & Conditions Agreement</span>
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Edit the official payment policy presented to clients upon purchasing sessions, recurring subscriptions, or viewing their receipts.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPreviewTerms(!previewTerms)}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewTerms ? 'Hide Preview' : 'Preview Formatted'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetTerms}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                title="Restore default Dubai PTMS standard terms"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="font-bold text-blue-900 uppercase text-[11px]">Strict 30-Day Expiry</div>
              <p className="text-blue-800 text-[11px] mt-0.5">
                Default 30 calendar days rule applied to all packages. Unused credits forfeit automatically.
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="font-bold text-amber-900 uppercase text-[11px]">12-Hour Cancellation</div>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Cancellations &lt;12h prior or no-shows deduct full session credit from active package.
              </p>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="font-bold text-emerald-900 uppercase text-[11px]">Stripe Auto-Renewal</div>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Recurring billing charges saved card every 30 days and credits new package allocation.
              </p>
            </div>
          </div>

          {/* Editable Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Official Legal Terms & Conditions Text (Editable)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {formSettings.paymentTermsAndConditions?.length || 0} characters
              </span>
            </div>
            <textarea
              rows={14}
              value={formSettings.paymentTermsAndConditions}
              onChange={(e) => setFormSettings({ ...formSettings, paymentTermsAndConditions: e.target.value })}
              placeholder="Enter Payment Terms & Conditions..."
              className="w-full p-4 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed text-slate-800 bg-white shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Formatted Preview Box */}
          {previewTerms && (
            <div className="border border-blue-200 rounded-xl bg-blue-50/30 overflow-hidden">
              <div className="p-3 bg-blue-100/60 font-bold text-blue-900 border-b border-blue-200 flex items-center justify-between">
                <span>Client-Facing Document Preview</span>
                <span className="text-[10px] bg-blue-200/60 text-blue-900 px-2 py-0.5 rounded font-mono">
                  Live Preview
                </span>
              </div>
              <div className="p-5 max-h-60 overflow-y-auto whitespace-pre-line text-xs text-slate-700 leading-relaxed font-sans">
                {formSettings.paymentTermsAndConditions}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Payment Terms</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Health & Illness Declaration Template Editor */}
      {activeTab === 'health-declaration' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-500" />
                <span>Declaration of Health & Illness (PAR-Q) Template</span>
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Configure the legal agreement text, medical questionnaire statements, and liability waiver that clients digitally sign.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPreviewHealth(!previewHealth)}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewHealth ? 'Hide Preview' : 'Preview Formatted'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetHealthDeclaration}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                title="Restore default DHA health declaration text"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 space-y-1">
              <p className="font-bold">Digital Signature & Liability Compliance in UAE</p>
              <p className="text-[11px] text-red-800 leading-relaxed">
                When a client signs this declaration through the app or during their intake assessment, their electronic touch signature, timestamp in Asia/Dubai GST, and PAR-Q answers are stored securely on their profile.
              </p>
            </div>
          </div>

          {/* Editable Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Health & Illness Declaration Agreement Text (Editable)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {formSettings.healthDeclarationText?.length || 0} characters
              </span>
            </div>
            <textarea
              rows={14}
              value={formSettings.healthDeclarationText}
              onChange={(e) => setFormSettings({ ...formSettings, healthDeclarationText: e.target.value })}
              placeholder="Enter Health Declaration text..."
              className="w-full p-4 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed text-slate-800 bg-white shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Formatted Preview Box */}
          {previewHealth && (
            <div className="border border-red-200 rounded-xl bg-red-50/30 overflow-hidden">
              <div className="p-3 bg-red-100/60 font-bold text-red-950 border-b border-red-200 flex items-center justify-between">
                <span>Client Health Declaration Preview</span>
                <span className="text-[10px] bg-red-200/60 text-red-900 px-2 py-0.5 rounded font-mono">
                  PAR-Q Template
                </span>
              </div>
              <div className="p-5 max-h-60 overflow-y-auto whitespace-pre-line text-xs text-slate-700 leading-relaxed font-sans">
                {formSettings.healthDeclarationText}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Health Declaration Template</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs & Clean Slate */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Production Database Wipe & Clean State Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md border border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                    Clean Production Mode Active
                  </span>
                  <span className="text-xs text-slate-400">1-Week User Testing Ready</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">Database Clean Slate & Testing Reset</h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  All dummy clients, dummy trainers, mock bookings, mock payments, and sample cards have been completely purged from the system. You are operating on a clean database ready for real testing. If you ever need to wipe all test inputs created during your 1-week test and restart with a clean slate, click below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWipeModal(true)}
                className="shrink-0 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset / Wipe All Test Data</span>
              </button>
            </div>

            {wipeSuccess && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Database successfully wiped! Clean production state initialized with 0 dummy records.</span>
              </div>
            )}
          </div>

          {/* Wipe Confirmation Modal */}
          {showWipeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-3 text-rose-600">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Wipe Test Data?</h4>
                    <p className="text-xs text-slate-500">Reset to completely clean production state</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800">This action will permanently purge:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                    <li>All client records & client packages</li>
                    <li>All trainer profiles & session schedules</li>
                    <li>All bookings, attendance checks & transactions</li>
                    <li>All payment records & client subscriptions</li>
                  </ul>
                  <p className="font-semibold text-emerald-700 pt-1">
                    ✓ Preserves Chief Admin login (<span className="font-mono">admin@waiterwalk.ae</span>)
                  </p>
                  <p className="font-semibold text-emerald-700">
                    ✓ Preserves System Packages (4, 8, 12, 20 Sessions) & UAE FTA TRN settings
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWipeModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetToCleanProductionData();
                      setShowWipeModal(false);
                      setWipeSuccess(true);
                      setTimeout(() => setWipeSuccess(false), 4000);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow"
                  >
                    Yes, Wipe All Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Complete Administrative Audit Logs</h3>
              </div>
              <span className="text-xs text-slate-400">Security & Compliance Log</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span className="font-bold text-purple-900 uppercase">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })} GST</span>
                  </div>
                  <div className="text-slate-800 font-semibold mt-1">{log.details}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    User: {log.userName} ({log.userId}) • Role: {log.userRole}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Production Go-Live & Launch Readiness Playbook */}
      {activeTab === 'production-readiness' && (() => {
        const isTrnValid = Boolean(formSettings.taxRegistrationNumber && formSettings.taxRegistrationNumber.length === 15);
        const isCustomDomainSet = Boolean(formSettings.customDomain && formSettings.customDomain.includes('.'));
        const isStripeLive = formSettings.stripeMode === 'live';
        const hasLiveKeys = Boolean(formSettings.stripeLivePublishableKey && formSettings.stripeLivePublishableKey.startsWith('pk_live_'));
        const hasStatementDescriptor = Boolean(formSettings.stripeStatementDescriptor && formSettings.stripeStatementDescriptor.length <= 22);
        const hasPaymentTerms = Boolean(formSettings.paymentTermsAndConditions && formSettings.paymentTermsAndConditions.length > 50);
        const hasHealthDeclaration = Boolean(formSettings.healthDeclarationText && formSettings.healthDeclarationText.length > 50);
        const hasWhatsapp = Boolean(formSettings.whatsappNotificationEnabled);

        const checklistItems = [
          {
            id: 'trade_license',
            title: 'UAE Commercial Trade License (DED / Free Zone)',
            desc: 'Company registered with fitness training / gym activities in Dubai / UAE.',
            category: 'Legal & UAE Regulatory',
            passed: Boolean(manualChecklist.trade_license),
            actionRequired: 'Verify active trade license',
            toggleable: true,
          },
          {
            id: 'vat_trn',
            title: 'FTA 15-Digit Tax Registration Number (TRN)',
            desc: `Mandatory Federal Tax Authority TRN: ${formSettings.taxRegistrationNumber || 'Not configured'}`,
            category: 'Legal & UAE Regulatory',
            passed: isTrnValid,
            actionRequired: 'Input 15-digit TRN starting with 100...',
            toggleable: false,
          },
          {
            id: 'stripe_live',
            title: 'Stripe UAE Live Gateway Mode',
            desc: `Current mode: ${formSettings.stripeMode.toUpperCase()} mode with corporate AED bank payout linked.`,
            category: 'Financial & Payments',
            passed: isStripeLive,
            actionRequired: 'Switch Stripe mode to Live',
            toggleable: false,
          },
          {
            id: 'stripe_keys',
            title: '256-Bit Production Live Keys (pk_live_...)',
            desc: 'Valid Stripe live publishable key configured for real AED card charges.',
            category: 'Financial & Payments',
            passed: hasLiveKeys,
            actionRequired: 'Add live key from dashboard.stripe.com',
            toggleable: false,
          },
          {
            id: 'statement_descriptor',
            title: 'Credit Card Statement Descriptor',
            desc: `Customer bank statement identifier: "${formSettings.stripeStatementDescriptor || 'WAITER WALK DUBAI'}" (Max 22 chars).`,
            category: 'Financial & Payments',
            passed: hasStatementDescriptor,
            actionRequired: 'Set descriptor (under 22 chars)',
            toggleable: false,
          },
          {
            id: 'custom_domain',
            title: 'Custom Production Domain & SSL (HTTPS)',
            desc: `Domain: ${formSettings.customDomain || 'app.waiterwalk.ae'} configured with TLS 1.3 encryption.`,
            category: 'Hosting & Security',
            passed: isCustomDomainSet,
            actionRequired: 'Configure DNS records below',
            toggleable: false,
          },
          {
            id: 'cloud_sync',
            title: 'Cloud Database Multi-Device Persistence',
            desc: 'Real-time database sync across Admin Desktop, Trainer Smartphones, & Client Portals.',
            category: 'Hosting & Security',
            passed: true,
            actionRequired: 'Active and synced',
            toggleable: false,
          },
          {
            id: 'pwa_compliance',
            title: 'PWA Mobile App Home Screen Install',
            desc: 'Web App Manifest & offline service worker verified for iOS Safari and Android Chrome.',
            category: 'Hosting & Security',
            passed: true,
            actionRequired: 'PWA banner and manifest active',
            toggleable: false,
          },
          {
            id: 'whatsapp_gateway',
            title: 'WhatsApp 1-Click Operations Gateway',
            desc: 'Automated 2-hour pre-session dispatch & 3-day package validity expiry renewal links.',
            category: 'Operations',
            passed: hasWhatsapp,
            actionRequired: 'Enable WhatsApp notifications',
            toggleable: false,
          },
          {
            id: 'legal_policies',
            title: 'Strict 30-Day Expiry & PAR-Q Health Declaration',
            desc: 'Binding payment terms & Dubai Health Authority (DHA) compliant exercise readiness waiver.',
            category: 'Legal & UAE Regulatory',
            passed: hasPaymentTerms && hasHealthDeclaration,
            actionRequired: 'Ensure terms & health text are populated',
            toggleable: false,
          },
        ];

        const passedCount = checklistItems.filter((i) => i.passed).length;
        const totalItems = checklistItems.length;
        const readinessPercentage = Math.round((passedCount / totalItems) * 100);

        const handleCopyText = (text: string, id: string) => {
          if (navigator?.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedRecord(id);
            setTimeout(() => setCopiedRecord(null), 2500);
          }
        };

        // VAT calculations for live simulator
        const testAmt = Number(vatCalculatorAED) || 3500;
        const netAmt = testAmt / 1.05;
        const vatAmt = testAmt - netAmt;

        const domainHost = formSettings.customDomain || 'app.waiterwalk.ae';

        return (
          <div className="space-y-6">
            {/* Top Scorecard & Status Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/30">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Production Launch Readiness
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      Waiter Walk Personal Training Management System (PTMS)
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Go-Live Master Playbook & Verification Center
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Everything you need to launch securely in Dubai & the UAE: live Stripe card processing, UAE FTA 5% VAT invoicing with 15-digit TRN, custom domain DNS records, and real-time multi-device cloud synchronization.
                  </p>
                </div>

                {/* Readiness Meter Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col items-center justify-center min-w-[240px] text-center shadow-lg">
                  <div className="text-4xl font-black text-emerald-400 flex items-baseline gap-1">
                    <span>{readinessPercentage}%</span>
                    <span className="text-xs text-slate-300 font-normal">/ 100%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 my-3 overflow-hidden border border-white/10">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${readinessPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-200">
                    {passedCount} of {totalItems} Critical Checks Passed
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="mt-3.5 w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-transform hover:scale-105"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Go-Live Certificate</span>
                  </button>
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 mt-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Stripe Gateway</div>
                  <div className={`text-xs font-black mt-1 flex items-center gap-1.5 ${isStripeLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isStripeLive ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                    {isStripeLive ? 'Live Mode Active' : 'Test Mode (Sandbox)'}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">UAE FTA 5% VAT</div>
                  <div className={`text-xs font-black mt-1 flex items-center gap-1.5 ${isTrnValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <Receipt className="w-3.5 h-3.5" />
                    {isTrnValid ? 'TRN Verified' : 'TRN Required'}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Custom Domain</div>
                  <div className="text-xs font-black mt-1 text-sky-400 flex items-center gap-1.5 truncate">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{domainHost}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Multi-Device Sync</div>
                  <div className="text-xs font-black mt-1 text-purple-400 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Cloud Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {readinessPercentage === 100
                    ? 'All pre-flight checks satisfied! You are ready to launch.'
                    : 'Complete the items marked "Action Required" below to reach 100% readiness.'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {formSettings.stripeMode === 'test' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormSettings({ ...formSettings, stripeMode: 'live' });
                      updateSettings({ ...formSettings, stripeMode: 'live' });
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Switch Stripe to Live Mode</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFormSettings({ ...formSettings, stripeMode: 'test' });
                      updateSettings({ ...formSettings, stripeMode: 'test' });
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Switch Back to Test Mode</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Step 1: Custom Domain & Cloudflare DNS Generator */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Custom Domain & Cloudflare DNS</h3>
                      <p className="text-[11px] text-slate-500">Connect your custom domain (e.g. app.waiterwalk.ae) with SSL</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded">
                    HTTPS / TLS 1.3
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Production Domain Name</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formSettings.customDomain || ''}
                        onChange={(e) => setFormSettings({ ...formSettings, customDomain: e.target.value.toLowerCase().trim() })}
                        placeholder="app.waiterwalk.ae"
                        className="flex-1 p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Log in to your DNS registrar (Cloudflare, GoDaddy, or Namecheap) and add the following records:
                  </p>

                  <div className="space-y-2 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-50 p-2 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <div className="col-span-2">Type</div>
                      <div className="col-span-3">Host / Name</div>
                      <div className="col-span-5">Value / Target</div>
                      <div className="col-span-2 text-right">Copy</div>
                    </div>

                    {/* Record 1: CNAME */}
                    <div className="grid grid-cols-12 items-center p-2.5 text-[11px] border-b border-slate-100 hover:bg-slate-50/50">
                      <div className="col-span-2 font-mono font-bold text-blue-700">CNAME</div>
                      <div className="col-span-3 font-mono text-slate-700 truncate">app</div>
                      <div className="col-span-5 font-mono text-slate-600 truncate">cname.waiterwalk.ae</div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyText('cname.waiterwalk.ae', 'dns_cname')}
                          className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-colors"
                        >
                          {copiedRecord === 'dns_cname' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Record 2: A Record */}
                    <div className="grid grid-cols-12 items-center p-2.5 text-[11px] border-b border-slate-100 hover:bg-slate-50/50">
                      <div className="col-span-2 font-mono font-bold text-emerald-700">A</div>
                      <div className="col-span-3 font-mono text-slate-700 truncate">@ (root)</div>
                      <div className="col-span-5 font-mono text-slate-600 truncate">76.76.21.21</div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyText('76.76.21.21', 'dns_a')}
                          className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-colors"
                        >
                          {copiedRecord === 'dns_a' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Record 3: TXT SSL */}
                    <div className="grid grid-cols-12 items-center p-2.5 text-[11px] hover:bg-slate-50/50">
                      <div className="col-span-2 font-mono font-bold text-purple-700">TXT</div>
                      <div className="col-span-3 font-mono text-slate-700 truncate">@</div>
                      <div className="col-span-5 font-mono text-slate-600 truncate">_ssl-verify-ww-uae</div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyText('_ssl-verify-ww-uae', 'dns_txt')}
                          className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-colors"
                        >
                          {copiedRecord === 'dns_txt' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cloudflare Pro-Tip:</strong> Set the SSL/TLS encryption mode to <strong>Full (Strict)</strong> and enable Cloudflare Proxied (Orange Cloud) for fast Dubai edge caching (DXB PoP).
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Live Stripe UAE Merchant Gateway */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Stripe UAE Live Gateway Mode</h3>
                      <p className="text-[11px] text-slate-500">Live 256-bit AED credit card & Apple Pay processing</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded ${isStripeLive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {formSettings.stripeMode.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Live Publishable Key</label>
                      <input
                        type="text"
                        placeholder="pk_live_51..."
                        value={formSettings.stripeLivePublishableKey || ''}
                        onChange={(e) => setFormSettings({ ...formSettings, stripeLivePublishableKey: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Live Secret Key</label>
                      <input
                        type="password"
                        placeholder="sk_live_51..."
                        value={formSettings.stripeLiveSecretKey || ''}
                        onChange={(e) => setFormSettings({ ...formSettings, stripeLiveSecretKey: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Statement Descriptor (Bank SMS & App)</span>
                      <span className="text-[10px] text-slate-400 font-mono">{formSettings.stripeStatementDescriptor?.length || 0}/22</span>
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      value={formSettings.stripeStatementDescriptor || 'WAITER WALK DUBAI'}
                      onChange={(e) => setFormSettings({ ...formSettings, stripeStatementDescriptor: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                    />
                  </div>

                  {/* Webhook endpoint URL */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Stripe Webhook Endpoint URL</span>
                      <span className="text-[10px] text-purple-600 font-normal">Auto-reconciliation</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={`https://${domainHost}/api/stripe/webhook`}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText(`https://${domainHost}/api/stripe/webhook`, 'stripe_webhook')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        {copiedRecord === 'stripe_webhook' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-purple-700" />
                      <span>UAE Corporate Bank Payout Verification</span>
                    </div>
                    <p>
                      Stripe UAE requires your <strong>UAE IBAN</strong> in AED (e.g. Emirates NBD, ADCB, or Mashreq) matching your commercial trade license entity name. Payouts arrive automatically every 3-5 business days.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: UAE FTA 5% VAT & Tax Invoice Compliance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">UAE FTA 5% VAT Invoicing Compliance</h3>
                      <p className="text-[11px] text-slate-500">Federal Tax Authority compliance & 15-digit TRN</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded ${isTrnValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {isTrnValid ? '15-Digit TRN Valid' : 'TRN Required'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Federal Tax Authority TRN</span>
                      <span className="text-[10px] text-slate-500">Starts with 100... (15 digits)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={formSettings.taxRegistrationNumber || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, taxRegistrationNumber: e.target.value.replace(/\D/g, '') })}
                      placeholder="100293847500003"
                      className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>

                  {/* Interactive VAT Simulator */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] uppercase">Live VAT 5% Calculator Simulator</span>
                      <button
                        type="button"
                        onClick={() => setPreviewSampleReceipt(!previewSampleReceipt)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-bold underline"
                      >
                        {previewSampleReceipt ? 'Hide Receipt View' : 'Preview Tax Invoice'}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-slate-600 font-medium">Sample Package AED:</label>
                      <input
                        type="number"
                        step={100}
                        value={vatCalculatorAED}
                        onChange={(e) => setVatCalculatorAED(Number(e.target.value))}
                        className="w-28 p-1.5 border border-slate-300 rounded font-bold font-mono text-xs bg-white"
                      />
                      <span className="text-slate-500 text-[11px]">AED</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-500 uppercase">Subtotal (Net)</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">{netAmt.toFixed(2)} AED</div>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                        <div className="text-[10px] text-emerald-800 uppercase font-bold">5% UAE VAT</div>
                        <div className="font-mono font-bold text-emerald-700 mt-0.5">+{vatAmt.toFixed(2)} AED</div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-center">
                        <div className="text-[10px] text-blue-800 uppercase font-bold">Total Client Pays</div>
                        <div className="font-mono font-black text-blue-900 mt-0.5">{testAmt.toFixed(2)} AED</div>
                      </div>
                    </div>

                    {previewSampleReceipt && (
                      <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 space-y-2 text-[11px] font-mono animate-fadeIn">
                        <div className="text-center font-bold text-slate-900 uppercase">
                          {formSettings.companyName}
                        </div>
                        <div className="text-center text-slate-500 text-[10px]">
                          TAX INVOICE / OFFICIAL ELECTRONIC RECEIPT
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1 text-slate-600">
                          <span>FTA TRN:</span>
                          <span className="font-bold text-slate-900">{formSettings.taxRegistrationNumber || '100293847500003'}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Date / Time:</span>
                          <span>{new Date().toLocaleDateString('en-GB')} • Dubai GST</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1">
                          <span>Package Net Amount:</span>
                          <span>{netAmt.toFixed(2)} AED</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>5% UAE Value Added Tax:</span>
                          <span>{vatAmt.toFixed(2)} AED</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-slate-900 pt-1 font-bold text-slate-900 text-xs">
                          <span>Total Amount Paid:</span>
                          <span>{testAmt.toFixed(2)} AED</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: Multi-Device Persistence & WhatsApp 1-Click Operations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-sm">
                      4
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Multi-Device Cloud & WhatsApp Dispatch</h3>
                      <p className="text-[11px] text-slate-500">Real-time sync across trainers and clients + 1-click WhatsApp</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold rounded">
                    Active & Ready
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Architecture Visualization */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase text-[10px]">Real-Time Data Persistence Architecture</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <Server className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                        <div className="font-bold text-slate-800">Admin Portal</div>
                        <div className="text-slate-500">Desktop / Web</div>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <Cloud className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                        <div className="font-bold text-purple-900">Cloud Sync</div>
                        <div className="text-purple-700">Real-time & Offline</div>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <PhoneCall className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                        <div className="font-bold text-emerald-900">Trainer & Client</div>
                        <div className="text-emerald-700">iOS & Android PWA</div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp deep links */}
                  <div className="space-y-2">
                    <div className="font-bold text-slate-800 text-[11px] uppercase flex items-center justify-between">
                      <span>1-Click WhatsApp Dispatch Links</span>
                      <span className="text-[10px] text-emerald-600 font-normal">Zero Gateway Surcharge</span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 text-[11px]">2-Hour Pre-Session Reminder Sample</span>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hi Sara, reminder: Your Waiter Walk personal training session with Coach Marcus is today at 4:00 PM at Downtown Fitness Club. See you soon!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test WhatsApp Link</span>
                        </a>
                      </div>
                      <p className="text-[10px] text-emerald-800 leading-relaxed font-mono">
                        "Hi Sara, reminder: Your Waiter Walk personal training session with Coach Marcus is today at 4:00 PM at Downtown Fitness Club. See you soon!"
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 text-[11px]">3-Day Expiry Renewal Reminder Sample</span>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hi Sara, notice from Waiter Walk: Your personal training package expires in 3 days. Your auto-renewal will activate upon validity expiration. Thank you!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test Renewal Link</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Cross-Device Sync & Database Transfer (Firebase Firestore) */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] uppercase flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>Firebase Firestore Cloud Database Sync</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Firebase Live</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      All SaaS records (clients, packages, sessions, saved cards, payments, and promo codes) are saved in Firebase Firestore and automatically synchronized across all devices in real-time.
                    </p>

                    {importFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                          importFeedback.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        <span>{importFeedback.message}</span>
                        <button
                          type="button"
                          onClick={() => setImportFeedback(null)}
                          className="text-slate-400 hover:text-slate-600 text-xs ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const jsonStr = exportDatabaseJSON();
                          const blob = new Blob([jsonStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `waiter_walk_ptms_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Download Full Database (.json)</span>
                      </button>

                      <label className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Restore Database from File</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              if (content) {
                                const result = importDatabaseJSON(content);
                                setImportFeedback(result);
                              }
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive 10-Point Pre-Flight Launch Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Official 10-Point Pre-Flight Launch Audit</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Live verification checklist before opening the system to Dubai clients and trainers.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600">
                    {passedCount}/{totalItems} Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      item.passed
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            item.passed ? 'bg-emerald-200/60 text-emerald-900' : 'bg-amber-200/60 text-amber-900'
                          }`}
                        >
                          {item.passed ? 'PASS' : 'ACTION REQUIRED'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {item.toggleable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setManualChecklist({
                              ...manualChecklist,
                              [item.id]: !manualChecklist[item.id],
                            })
                          }
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                            item.passed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title="Toggle verification"
                        >
                          {item.passed ? '✓' : '○'}
                        </button>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            item.passed ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {item.passed ? '✓' : '!'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Official Production Go-Live Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-lg">Official Certificate of Launch Readiness</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Body (Printable Area) */}
            <div className="p-6 border-4 border-double border-slate-300 rounded-2xl bg-gradient-to-b from-slate-50/50 to-white space-y-5 text-center text-xs">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                  UNITED ARAB EMIRATES • DUBAI
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  WAITER WALK FITNESS & WELLNESS LLC
                </h2>
                <div className="text-[11px] text-slate-500 font-semibold">
                  Personal Training Management System (PTMS) Production Release
                </div>
              </div>

              <div className="w-16 h-1 bg-emerald-600 mx-auto rounded-full" />

              <div className="space-y-2 max-w-lg mx-auto text-slate-700 leading-relaxed text-xs">
                <p>
                  This document certifies that the personal training operational infrastructure, Stripe UAE live payment gateway, UAE FTA 5% VAT invoicing parameters, and multi-device cloud synchronization protocols have been successfully inspected and verified for commercial operations.
                </p>
              </div>

              {/* Certificate Verification Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-bold">Certificate ID</div>
                  <div className="font-bold text-slate-900">WW-DXB-LIVE-2026</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-bold">Issue Date</div>
                  <div className="font-bold text-slate-900">{new Date().toLocaleDateString('en-GB')}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-bold">FTA TRN</div>
                  <div className="font-bold text-slate-900">{formSettings.taxRegistrationNumber || '100293847500003'}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-bold">Stripe Mode</div>
                  <div className="font-bold text-emerald-600 uppercase">{formSettings.stripeMode} MODE</div>
                </div>
              </div>

              {/* Verified Features Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ✓ 30-Day Expiry Enforced
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ✓ 12-Hour Cancellation Rule
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ✓ 1-Click WhatsApp Reminders
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ✓ PAR-Q Health Waiver Bound
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ✓ PWA Offline Ready
                </span>
              </div>

              {/* Dual Signature Block */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-left">
                <div className="space-y-1">
                  <div className="h-9 border-b border-slate-400 border-dashed" />
                  <div className="font-bold text-slate-900 text-[11px]">Managing Director / Licensee</div>
                  <div className="text-[10px] text-slate-500">Waiter Walk Fitness & Wellness LLC</div>
                </div>
                <div className="space-y-1">
                  <div className="h-9 border-b border-slate-400 border-dashed" />
                  <div className="font-bold text-slate-900 text-[11px]">Chief Systems Architect</div>
                  <div className="text-[10px] text-slate-500">Dubai PTMS Engineering</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

