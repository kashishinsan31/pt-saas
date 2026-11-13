import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED, formatReadableDate, getDaysRemaining, evaluateCancellationPolicy, formatDubaiDate, formatDubaiTime } from '../../utils/dubaiTime';
import { exportToPDFPrint } from '../../utils/exportUtils';
import {
  User,
  Package,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  XCircle,
  ShieldCheck,
  X,
  Printer,
  Sparkles,
  Trash2,
  Check,
  Lock,
  Zap,
  HeartPulse,
  PenTool,
  Scale,
  FileText,
  Stethoscope,
  Activity,
  AlertCircle,
  Star,
  MessageSquare,
  Dumbbell,
  BookOpen,
  Apple,
  Utensils,
  Flame,
  Rocket,
  BellRing,
  ChevronRight,
  Target,
  Compass,
  ListChecks,
} from 'lucide-react';
import { StripeCheckoutModal } from '../stripe/StripeCheckoutModal';
import { processStripeApiCharge, getStripe, createStripeCustomer, attachCardTokenToCustomer } from '../../services/stripeApi';
import { setDocument, updateDocument } from '../../services/firestoreService';
import { DashboardSlider } from '../common/DashboardSlider';
import { HealthDeclarationModal } from '../common/HealthDeclarationModal';
import { AddHealthIssueModal } from '../common/AddHealthIssueModal';
import { ProgressAnalyticsSection } from './ProgressAnalyticsSection';
import { LogBodyMetricModal } from './LogBodyMetricModal';

interface ClientDashboardProps {
  initialSection?: 'dashboard' | 'sessions' | 'payments' | 'subscriptions' | 'health' | 'upcoming';
}

export interface UpcomingFeatureItem {
  id: string;
  title: string;
  category: 'Workout' | 'Diet' | 'Habit';
  version: string;
  eta: string;
  icon: any;
  color: string;
  accentBg: string;
  badgeBg: string;
  description: string;
  keyHighlights: string[];
  mockData: {
    stat1: { label: string; value: string };
    stat2: { label: string; value: string };
    previewSnippet: string;
  };
}

const UPCOMING_FEATURES: UpcomingFeatureItem[] = [
  {
    id: 'workout-tracker',
    title: 'Workout Tracker',
    category: 'Workout',
    version: 'v2.5',
    eta: 'Q1 2026',
    icon: Dumbbell,
    color: 'from-blue-600 to-indigo-600',
    accentBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    description: 'Log sets, reps, weights, RPE, and rest timers in real-time during your personal training sessions. Track personal records (PRs), 1RM estimates, and volume progress graphs.',
    keyHighlights: [
      'Live set counter & automatic rest timer',
      'Personal Record (PR) badges & 1RM calculator',
      'Strength volume & muscle group load breakdown',
      'Direct real-time sync with your coach\'s panel',
    ],
    mockData: {
      stat1: { label: 'Tracked Exercises', value: '45+ Sets' },
      stat2: { label: 'Est. 1RM Bench', value: '110 kg' },
      previewSnippet: 'Bench Press • 4 Sets x 10 Reps @ 80kg • Rest 90s',
    },
  },
  {
    id: 'workout-library',
    title: 'Workout Library',
    category: 'Workout',
    version: 'v2.5',
    eta: 'Q1 2026',
    icon: BookOpen,
    color: 'from-indigo-600 to-purple-600',
    accentBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeBg: 'bg-indigo-600 text-white',
    description: '500+ HD video exercise demonstrations, 3D muscle heatmaps, proper execution form cues, and custom workout routines assigned by your Waiter Walk coach.',
    keyHighlights: [
      '500+ 4K video demonstrations with form cues',
      'Anatomical 3D muscle targeting heatmaps',
      'Coach-curated routines for home, gym, or outdoor',
      'Equipment filters (Dumbbells, Cables, Bodyweight)',
    ],
    mockData: {
      stat1: { label: 'Library Size', value: '500+ Videos' },
      stat2: { label: 'Target Muscles', value: '18 Groups' },
      previewSnippet: 'Barbell Bulgarian Split Squat • Quadriceps & Glutes',
    },
  },
  {
    id: 'diet-tracker',
    title: 'Diet Tracker',
    category: 'Diet',
    version: 'v2.6',
    eta: 'Q2 2026',
    icon: Apple,
    color: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    description: 'Daily calorie & macro counter (Protein, Carbs, Fats), barcode scanner for UAE products, water intake log, and automated nutrition streak scoring.',
    keyHighlights: [
      'Macro counter (Protein, Carbs, Fats, Fiber)',
      'UAE barcode scanner for Carrefour, Spinneys & Lulu products',
      'Hydration logging & water goal reminders',
      'Trainer macro approval & nutrition feedback',
    ],
    mockData: {
      stat1: { label: 'Daily Goal', value: '2,200 kcal' },
      stat2: { label: 'Protein Target', value: '165 g' },
      previewSnippet: 'Grilled Chicken Breast & Quinoa • 45g Protein / 520 kcal',
    },
  },
  {
    id: 'diet-library',
    title: 'Diet Library',
    category: 'Diet',
    version: 'v2.6',
    eta: 'Q2 2026',
    icon: Utensils,
    color: 'from-amber-500 to-orange-600',
    accentBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    description: 'Dubai-tailored healthy recipes, chef prep guides, macro breakdowns, grocery lists, and dining-out recommendations for top UAE restaurants.',
    keyHighlights: [
      'Dubai-inspired healthy recipes with chef prep steps',
      'Automated weekly grocery shopping list generator',
      'Macro breakdowns for popular UAE dining spots',
      'High-protein, Halal, Keto, and Vegan filter tags',
    ],
    mockData: {
      stat1: { label: 'Recipes Available', value: '250+ Dishes' },
      stat2: { label: 'Avg Prep Time', value: '15 Mins' },
      previewSnippet: 'Arabic Spiced Salmon & Grilled Asparagus • 42g Protein',
    },
  },
  {
    id: 'habit-tracker',
    title: 'Habit Tracker',
    category: 'Habit',
    version: 'v2.7',
    eta: 'Q2 2026',
    icon: Flame,
    color: 'from-rose-600 to-pink-600',
    accentBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeBg: 'bg-rose-600 text-white',
    description: 'Daily habit streak counters, sleep duration monitoring, daily step goal tracking (10,000 steps), hydration reminders, and habit consistency scoring.',
    keyHighlights: [
      'Daily streak counters & milestone badges',
      'Step goal sync (Apple Health & Google Fit)',
      'Sleep quality & duration logging (8 hrs goal)',
      'Coach habit accountability check-ins',
    ],
    mockData: {
      stat1: { label: 'Current Streak', value: '14 Days' },
      stat2: { label: 'Daily Step Goal', value: '10,000 Steps' },
      previewSnippet: '8 Hrs Sleep • 3L Water • 10k Steps • Habit Score 98%',
    },
  },
];

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ initialSection = 'dashboard' }) => {
  const {
    currentUser,
    clients,
    trainers,
    packageDefinitions,
    clientPackages,
    bookings,
    payments,
    subscriptions,
    savedCards,
    settings,
    addSavedCard,
    removeSavedCard,
    setDefaultSavedCard,
    triggerAutoDeductionRenewal,
    cancelSessionByClient,
    cancelSubscription,
    createBooking,
    payAndActivatePackage,
    submitSessionReview,
    syncWithStripe,
  } = useApp();

  const clientId = currentUser?.associatedId || 'WW-CL-1001';

  const fallbackClient: any = {
    id: clientId,
    fullName: currentUser?.name || 'Valued Client',
    email: currentUser?.email || 'client@waiterwalk.ae',
    whatsappNumber: '+971 50 000 0000',
    dateOfBirth: '1995-01-01',
    age: 30,
    gender: 'Prefer not to say',
    residentialAddress: 'Dubai, UAE',
    communityName: 'Dubai Marina',
    assignedTrainerId: trainers[0]?.id || 'WW-TR-2001',
    emergencyContact: { name: 'Emergency Contact', relationship: 'Family', phone: '+971 50 000 0000' },
    status: 'Active',
    createdAt: new Date().toISOString(),
  };

  const client =
    clients.find((c) => c.id === clientId) ||
    clients.find((c) => c.email && currentUser?.email && c.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    clients[0] ||
    fallbackClient;

  const activeClientId = client?.id || clientId;
  const trainer = trainers.find((t) => t.id === client?.assignedTrainerId) || trainers[0];

  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'upcoming' | 'sessions' | 'payments' | 'subscriptions' | 'health'>('overview');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [isLogMetricModalOpen, setIsLogMetricModalOpen] = useState(false);
  const [isReloadingStripe, setIsReloadingStripe] = useState(false);
  const [stripeReloadMsg, setStripeReloadMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [showSupersededPayments, setShowSupersededPayments] = useState(false);

  // Upcoming Features Roadmap state
  const [notifiedFeatures, setNotifiedFeatures] = useState<string[]>([]);
  const [selectedUpcomingFeatureModal, setSelectedUpcomingFeatureModal] = useState<any>(null);
  const [featureFilter, setFeatureFilter] = useState<'All' | 'Workout' | 'Diet' | 'Habit'>('All');
  const [betaSuccessMsg, setBetaSuccessMsg] = useState('');

  const handleToggleNotification = (featureId: string) => {
    if (notifiedFeatures.includes(featureId)) {
      setNotifiedFeatures((prev) => prev.filter((id) => id !== featureId));
    } else {
      setNotifiedFeatures((prev) => [...prev, featureId]);
      setBetaSuccessMsg('You have been added to the VIP Beta Access list for this feature!');
      setTimeout(() => setBetaSuccessMsg(''), 3500);
    }
  };

  useEffect(() => {
    if (initialSection === 'payments') setActiveTab('payments');
    else if (initialSection === 'subscriptions') setActiveTab('subscriptions');
    else if (initialSection === 'sessions') setActiveTab('sessions');
    else if (initialSection === 'upcoming') setActiveTab('upcoming');
    else setActiveTab('overview');
  }, [initialSection]);

  const activePackage = clientPackages.find((p) => p.clientId === activeClientId && p.status === 'Active');
  const daysRemaining = activePackage ? getDaysRemaining(activePackage.expiryDate) : 0;

  const clientBookings = bookings.filter((b) => b.clientId === activeClientId);
  const upcomingBookings = clientBookings.filter((b) => b.status === 'Scheduled');
  const pastBookings = clientBookings.filter((b) => b.status !== 'Scheduled');

  const clientPayments = [...payments]
    .filter((p) => p.clientId === activeClientId)
    .sort((a, b) => {
      const tB = new Date(b.createdAt || b.paymentDate || 0).getTime() || 0;
      const tA = new Date(a.createdAt || a.paymentDate || 0).getTime() || 0;
      return tB - tA;
    });
  const clientSavedCards = savedCards.filter((c) => c.clientId === activeClientId);
  const pendingPackages = clientPackages.filter((p) => p.clientId === activeClientId && p.status === 'Pending Payment');
  const activeSubscription = subscriptions.find((s) => s.clientId === activeClientId && s.status === 'Active');
  const failedSubscription = subscriptions.find((s) => s.clientId === activeClientId && s.status === 'Payment Failed');

  const handleClientReloadStripe = async () => {
    setIsReloadingStripe(true);
    setStripeReloadMsg(null);
    try {
      const res = await syncWithStripe();
      setStripeReloadMsg(res);
    } finally {
      setIsReloadingStripe(false);
    }
  };

  // Pending Package Payment Modal State
  const [isPayPendingModalOpen, setIsPayPendingModalOpen] = useState(false);
  const [selectedPendingPkg, setSelectedPendingPkg] = useState<any>(null);
  const [selectedPendingSavedCardId, setSelectedPendingSavedCardId] = useState<string>('NEW_CARD');
  const [payCardHolder, setPayCardHolder] = useState(client?.fullName || currentUser?.name || 'Valued Client');
  const [paySaveDefaultCard, setPaySaveDefaultCard] = useState(true);
  const [payAgreeTerms, setPayAgreeTerms] = useState(false);
  const [payFeedbackMsg, setPayFeedbackMsg] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const pendingStripeRef = React.useRef<HTMLDivElement>(null);
  const [pendingStripeInstance, setPendingStripeInstance] = useState<any>(null);
  const [pendingCardElement, setPendingCardElement] = useState<any>(null);
  const [pendingCardReady, setPendingCardReady] = useState(false);

  // Add Card Stripe Elements & Modal state
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [cardHolderName, setCardHolderName] = useState(client?.fullName || currentUser?.name || 'Valued Client');
  const [makeDefault, setMakeDefault] = useState(true);
  const [agreeTermsAddCard, setAgreeTermsAddCard] = useState(false);
  const [addCardError, setAddCardError] = useState('');
  const addCardStripeRef = React.useRef<HTMLDivElement>(null);
  const [addCardElement, setAddCardElement] = useState<any>(null);
  const [addCardReady, setAddCardReady] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const isTestMode = settings.stripeMode === 'test';
  const livePubKey = (settings.stripeLivePublishableKey || settings.stripePublishableKey || '').trim();
  const testPubKey = (settings.stripePublishableKey || settings.stripeLivePublishableKey || '').trim();
  const activePubKey = isTestMode ? (testPubKey || livePubKey) : (livePubKey || testPubKey);

  useEffect(() => {
    if (!activePubKey || (!activePubKey.startsWith('pk_live_') && !activePubKey.startsWith('pk_test_'))) {
      return;
    }
    let isMounted = true;
    getStripe(activePubKey).then((stripe) => {
      if (!isMounted || !stripe) return;
      setPendingStripeInstance(stripe);
    });
    return () => {
      isMounted = false;
    };
  }, [activePubKey]);

  // Default to first/primary saved card when pending payment modal opens
  useEffect(() => {
    if (isPayPendingModalOpen) {
      if (clientSavedCards.length > 0) {
        const def = clientSavedCards.find((c) => c.isDefault) || clientSavedCards[0];
        setSelectedPendingSavedCardId(def.id);
      } else {
        setSelectedPendingSavedCardId('NEW_CARD');
      }
      setPayFeedbackMsg('');
      setPayAgreeTerms(false);
    }
  }, [isPayPendingModalOpen]);

  // Mount Stripe Elements for pending package payment strictly when entering a new card
  useEffect(() => {
    if (!pendingStripeInstance || !pendingStripeRef.current || !isPayPendingModalOpen || selectedPendingSavedCardId !== 'NEW_CARD') return;

    pendingStripeRef.current.innerHTML = '';
    const elements = pendingStripeInstance.elements();
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '14px',
          color: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '500',
          '::placeholder': {
            color: '#94a3b8',
          },
        },
        invalid: {
          color: '#e11d48',
          iconColor: '#e11d48',
        },
      },
      hidePostalCode: true,
    });

    card.mount(pendingStripeRef.current);
    card.on('ready', () => setPendingCardReady(true));
    card.on('change', (event: any) => {
      if (event.error) {
        setPayFeedbackMsg(`Card Error: ${event.error.message}`);
      } else {
        setPayFeedbackMsg('');
      }
    });

    setPendingCardElement(card);

    return () => {
      try {
        card.destroy();
      } catch (e) {
        // ignore
      }
      setPendingCardReady(false);
    };
  }, [pendingStripeInstance, isPayPendingModalOpen, selectedPendingSavedCardId]);

  // Mount Stripe Elements for Add Saved Card modal
  useEffect(() => {
    if (!pendingStripeInstance || !addCardStripeRef.current || !isAddCardModalOpen) return;

    addCardStripeRef.current.innerHTML = '';
    const elements = pendingStripeInstance.elements();
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '14px',
          color: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '500',
          '::placeholder': {
            color: '#94a3b8',
          },
        },
        invalid: {
          color: '#e11d48',
          iconColor: '#e11d48',
        },
      },
      hidePostalCode: true,
    });

    card.mount(addCardStripeRef.current);
    card.on('ready', () => setAddCardReady(true));
    card.on('change', (event: any) => {
      if (event.error) {
        setAddCardError(`Card Error: ${event.error.message}`);
      } else {
        setAddCardError('');
      }
    });

    setAddCardElement(card);

    return () => {
      try {
        card.destroy();
      } catch (e) {
        // ignore
      }
      setAddCardReady(false);
    };
  }, [pendingStripeInstance, isAddCardModalOpen]);

  const handlePayAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendingPkg) return;
    if (!payAgreeTerms) {
      setPayFeedbackMsg('Error: Please tick the box to agree to the Payment Terms & Conditions and Refund Policy.');
      return;
    }

    const liveKey = (settings.stripeLiveSecretKey || '').trim();
    const testKey = (settings.stripeSecretKey || '').trim();
    const activeSecretKey = isTestMode ? (testKey || liveKey) : (liveKey || testKey);

    const isValidKeyFormat = activeSecretKey && (
      activeSecretKey.startsWith('sk_test_') ||
      activeSecretKey.startsWith('sk_live_') ||
      activeSecretKey.startsWith('rk_test_') ||
      activeSecretKey.startsWith('rk_live_')
    );

    if (!isValidKeyFormat) {
      setPayFeedbackMsg(
        `Stripe Gateway Offline: Stripe API keys are not configured. Your Admin must enter the Stripe Secret Key (${isTestMode ? 'sk_test_...' : 'sk_live_...'}) in System Settings > Stripe Gateway, or set VITE_STRIPE_SECRET_KEY in Netlify to process real card payments.`
      );
      return;
    }

    setIsProcessingPay(true);
    setPayFeedbackMsg('');

    const pkgDef = packageDefinitions.find((p) => p.id === selectedPendingPkg.packageDefinitionId);
    const pkgAmountAED = Number(
      selectedPendingPkg.packagePriceAED ??
      selectedPendingPkg.priceAED ??
      (pkgDef ? Math.round(pkgDef.priceAED * 1.05 * 100) / 100 : 0)
    );

    const isValidStripeCust = (id?: string) => Boolean(id && id.startsWith('cus_') && id !== `cus_${client.id}`);

    const recordFailedAttempt = (message: string, chargeId?: string, paymentIntentId?: string) => {
      try {
        const failPayId = `PAY-FAIL-${Date.now()}`;
        const baseAmt = Math.round((pkgAmountAED / 1.05) * 100) / 100;
        const vatAmt = Math.round((pkgAmountAED - baseAmt) * 100) / 100;
        setDocument('payments', failPayId, {
          id: failPayId,
          clientId: activeClientId,
          packageId: selectedPendingPkg.id,
          packageName: selectedPendingPkg.packageName || pkgDef?.name || 'Personal Training Package',
          baseAmountAED: baseAmt,
          vatAmountAED: vatAmt,
          amountAED: pkgAmountAED,
          amountPaidAED: 0,
          outstandingBalanceAED: pkgAmountAED,
          paymentDate: formatDubaiDate(new Date()),
          paymentMethod: 'Stripe',
          transactionReference: chargeId || `ERR-${Date.now()}`,
          stripePaymentIntentId: paymentIntentId || chargeId || `ERR-${Date.now()}`,
          status: 'Failed',
          notes: `Stripe Card Declined: ${message}`,
          createdAt: new Date().toISOString(),
        });
        const notifId = `NOTIF-${Date.now()}-FAIL`;
        setDocument('notifications', notifId, {
          id: notifId,
          userId: 'admin-all',
          title: `Payment Declined: ${client.fullName}`,
          message: `Pending invoice charge of AED ${pkgAmountAED} for ${client.fullName} failed: ${message}.`,
          type: 'payment',
          read: false,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not record failed pending payment to Firestore:', err);
      }
    };

    // 1. If paying with a Selected Saved Card (PCI Vaulted)
    if (selectedPendingSavedCardId !== 'NEW_CARD') {
      const sc = clientSavedCards.find((c) => c.id === selectedPendingSavedCardId);
      if (!sc) {
        setIsProcessingPay(false);
        setPayFeedbackMsg('Error: Selected saved card was not found. Please select a valid card.');
        return;
      }

      let customerIdToVault =
        (isValidStripeCust(sc.stripeCustomerId) ? sc.stripeCustomerId : undefined) ||
        (isValidStripeCust(client.stripeCustomerId) ? client.stripeCustomerId : undefined);
      const cardTokenToUse = sc.stripeToken;

      if (!customerIdToVault && cardTokenToUse && activeSecretKey) {
        try {
          const custRes = await createStripeCustomer({
            secretKey: activeSecretKey,
            email: client.email,
            name: client.fullName,
            cardToken: cardTokenToUse,
            clientId: activeClientId,
          });
          if (custRes.success && custRes.customerId) {
            customerIdToVault = custRes.customerId;
            updateDocument('savedCards', sc.id, { stripeCustomerId: custRes.customerId });
            updateDocument('clients', activeClientId, { stripeCustomerId: custRes.customerId });
          }
        } catch (e) {
          console.warn('Customer vault notice:', e);
        }
      }

      const stripeRes = await processStripeApiCharge({
        secretKey: activeSecretKey,
        amountAED: pkgAmountAED,
        description: `Pending Package Payment: ${selectedPendingPkg.packageName || pkgDef?.name || 'PT Package'} for ${client.fullName} (Saved Card ${sc.brand} ending in ${sc.last4}) - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? undefined : (cardTokenToUse || (isTestMode ? 'tok_visa' : undefined)),
      });

      if (!stripeRes.success) {
        setIsProcessingPay(false);
        setPayFeedbackMsg(`Stripe Gateway Error: ${stripeRes.message}`);
        recordFailedAttempt(stripeRes.message, stripeRes.stripeChargeId, stripeRes.stripePaymentIntentId);
        return;
      }

      const res = payAndActivatePackage(
        selectedPendingPkg.id,
        {
          cardHolder: sc.cardHolder,
          brand: sc.brand,
          last4: sc.last4,
          expiryMonth: sc.expiryMonth,
          expiryYear: sc.expiryYear,
          isDefault: paySaveDefaultCard,
        },
        stripeRes.stripeChargeId,
        customerIdToVault,
        sc.stripeToken,
        true
      );

      setIsProcessingPay(false);
      if (res.success) {
        setPayFeedbackMsg(
          `Payment Received in Real Time with Saved Card! Live on Stripe Dashboard (Charge ID: ${stripeRes.stripeChargeId})`
        );
        setTimeout(() => {
          setIsPayPendingModalOpen(false);
          setPayFeedbackMsg('');
          setPayAgreeTerms(false);
        }, 2200);
      } else {
        setPayFeedbackMsg(`Error: ${res.message}`);
      }
      return;
    }

    // 2. Paying with New Card (100% Stripe.js Protection)
    if (!pendingStripeInstance || !pendingCardElement) {
      setIsProcessingPay(false);
      setPayFeedbackMsg('Stripe Secure Elements is still loading. Please wait a moment.');
      return;
    }

    try {
      const tokenResult = await pendingStripeInstance.createToken(pendingCardElement, {
        name: (payCardHolder || client.fullName).trim(),
      });

      if (tokenResult.error) {
        setIsProcessingPay(false);
        const errMsg = tokenResult.error.message || '';
        const isKeyExpired =
          tokenResult.error.code === 'api_key_expired' ||
          errMsg.toLowerCase().includes('expired api key') ||
          errMsg.toLowerCase().includes('expired');

        if (isKeyExpired) {
          setPayFeedbackMsg(
            'Stripe Gateway Notice: The online payment key has expired in Stripe Dashboard. Please contact reception or choose Pay by Cash/Bank Transfer while credentials are being updated.'
          );
        } else {
          setPayFeedbackMsg(`Card Error: ${errMsg}`);
        }
        return;
      }

      if (!tokenResult.token) {
        setIsProcessingPay(false);
        setPayFeedbackMsg('Stripe tokenization failed. Please check your card details.');
        return;
      }

      const cardToken = tokenResult.token.id;
      const c = tokenResult.token.card;
      const brand = c?.brand ? (c.brand.charAt(0).toUpperCase() + c.brand.slice(1)) : 'Visa';
      const last4Digits = c?.last4 || '••••';
      const expM = String(c?.exp_month || '12');
      const expY = String(c?.exp_year || '2028');

      // Vault card to Stripe Customer (attach to valid existing customer or create new one)
      let customerIdToVault = isValidStripeCust(client.stripeCustomerId) ? client.stripeCustomerId : undefined;
      let attachedSourceId: string | undefined;
      if (activeSecretKey && paySaveDefaultCard) {
        try {
          if (customerIdToVault) {
            const attachRes = await attachCardTokenToCustomer({
              secretKey: activeSecretKey,
              customerId: customerIdToVault,
              cardToken,
            });
            if (attachRes.success && attachRes.sourceId) {
              attachedSourceId = attachRes.sourceId;
            } else {
              customerIdToVault = undefined;
            }
          }

          if (!customerIdToVault) {
            const custRes = await createStripeCustomer({
              secretKey: activeSecretKey,
              email: client.email,
              name: client.fullName,
              cardToken,
              clientId: activeClientId,
            });
            if (custRes.success && custRes.customerId) {
              customerIdToVault = custRes.customerId;
              updateDocument('clients', activeClientId, { stripeCustomerId: custRes.customerId });
            }
          }
        } catch (e) {
          console.warn('Customer vault notice:', e);
        }
      }

      const stripeRes = await processStripeApiCharge({
        secretKey: activeSecretKey,
        amountAED: pkgAmountAED,
        description: `Pending Package Payment: ${selectedPendingPkg.packageName || pkgDef?.name || 'PT Package'} for ${client.fullName} - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? attachedSourceId : cardToken,
      });

      if (!stripeRes.success) {
        setIsProcessingPay(false);
        setPayFeedbackMsg(`Stripe Gateway Error: ${stripeRes.message}`);
        recordFailedAttempt(stripeRes.message, stripeRes.stripeChargeId, stripeRes.stripePaymentIntentId);
        return;
      }

      const res = payAndActivatePackage(
        selectedPendingPkg.id,
        {
          cardHolder: payCardHolder || client.fullName,
          brand,
          last4: last4Digits,
          expiryMonth: expM,
          expiryYear: expY,
          isDefault: paySaveDefaultCard,
        },
        stripeRes.stripeChargeId,
        customerIdToVault,
        cardToken,
        paySaveDefaultCard
      );

      setIsProcessingPay(false);
      if (res.success) {
        setPayFeedbackMsg(
          `Payment Received in Real Time! Live on Stripe Dashboard (Charge ID: ${stripeRes.stripeChargeId})`
        );
        setTimeout(() => {
          setIsPayPendingModalOpen(false);
          setPayFeedbackMsg('');
          setPayAgreeTerms(false);
        }, 2200);
      } else {
        setPayFeedbackMsg(`Error: ${res.message}`);
      }
    } catch (err: any) {
      setIsProcessingPay(false);
      setPayFeedbackMsg(`Gateway Connection Error: ${err.message || 'Failed to connect to Stripe'}`);
    }
  };

  // Auto-deduction test feedback
  const [autoDeductionMsg, setAutoDeductionMsg] = useState('');

  // Booking & Cancellation Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationResult, setCancellationResult] = useState<any>(null);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedPackageDef, setSelectedPackageDef] = useState(packageDefinitions[2] || packageDefinitions[0]);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(formatDubaiDate(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState(client.residentialAddress);
  const [bookingError, setBookingError] = useState('');

  // Session Rating & Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [trainerRatingInput, setTrainerRatingInput] = useState(5);
  const [sessionRatingInput, setSessionRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState('');
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  const unreviewedCompletedBookings = clientBookings.filter(
    (b) => b.status === 'Completed' && !b.trainerRating
  );

  const handleOpenReviewModal = (b: any) => {
    setSelectedBookingForReview(b);
    setTrainerRatingInput(b.trainerRating || 5);
    setSessionRatingInput(b.sessionRating || 5);
    setReviewTextInput(b.clientReview || '');
    setReviewSuccessMsg('');
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;
    const res = submitSessionReview(
      selectedBookingForReview.id,
      trainerRatingInput,
      sessionRatingInput,
      reviewTextInput
    );
    if (res.success) {
      setReviewSuccessMsg(res.message);
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewSuccessMsg('');
      }, 1500);
    }
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTermsAddCard) {
      setAddCardError('Please tick the box to agree to the Payment Terms & Conditions and Refund Policy.');
      return;
    }

    if (!pendingStripeInstance || !addCardElement) {
      setAddCardError('Stripe Secure Elements is still initializing. Please wait a moment.');
      return;
    }

    setIsAddingCard(true);
    setAddCardError('');

    try {
      const tokenResult = await pendingStripeInstance.createToken(addCardElement, {
        name: (cardHolderName || client.fullName).trim(),
      });

      if (tokenResult.error) {
        setIsAddingCard(false);
        const errMsg = tokenResult.error.message || '';
        const isKeyExpired =
          tokenResult.error.code === 'api_key_expired' ||
          errMsg.toLowerCase().includes('expired api key') ||
          errMsg.toLowerCase().includes('expired');

        if (isKeyExpired) {
          setAddCardError(
            'Stripe Gateway Notice: The online payment key has expired. Please contact administration to update Stripe credentials.'
          );
        } else {
          setAddCardError(`Card Error: ${errMsg}`);
        }
        return;
      }

      if (!tokenResult.token) {
        setIsAddingCard(false);
        setAddCardError('Tokenization failed. Please verify your card details.');
        return;
      }

      const cardToken = tokenResult.token.id;
      const c = tokenResult.token.card;
      const brand = c?.brand ? (c.brand.charAt(0).toUpperCase() + c.brand.slice(1)) : 'Visa';
      const last4Digits = c?.last4 || '••••';
      const expM = String(c?.exp_month || '12');
      const expY = String(c?.exp_year || '2028');

      // Vault card to Stripe Customer if activeSecretKey is available
      const isValidStripeCust = (id?: string) => Boolean(id && id.startsWith('cus_') && id !== `cus_${activeClientId}`);
      let customerIdToVault = isValidStripeCust(client.stripeCustomerId) ? client.stripeCustomerId : undefined;
      const liveKey = (settings.stripeLiveSecretKey || '').trim();
      const testKey = (settings.stripeSecretKey || '').trim();
      const activeSecretKey = isTestMode ? (testKey || liveKey) : (liveKey || testKey);

      if (activeSecretKey) {
        try {
          if (customerIdToVault) {
            const attachRes = await attachCardTokenToCustomer({
              secretKey: activeSecretKey,
              customerId: customerIdToVault,
              cardToken,
            });
            if (!attachRes.success) {
              customerIdToVault = undefined;
            }
          }

          if (!customerIdToVault) {
            const custRes = await createStripeCustomer({
              secretKey: activeSecretKey,
              email: client.email,
              name: client.fullName,
              cardToken,
              clientId: activeClientId,
            });
            if (custRes.success && custRes.customerId) {
              customerIdToVault = custRes.customerId;
              updateDocument('clients', activeClientId, { stripeCustomerId: custRes.customerId });
            }
          }
        } catch (e) {
          console.warn('Vaulting notice:', e);
        }
      }

      addSavedCard(activeClientId, {
        cardHolder: cardHolderName || client.fullName,
        brand,
        last4: last4Digits,
        expiryMonth: expM,
        expiryYear: expY,
        isDefault: makeDefault,
        stripeCustomerId: customerIdToVault,
        stripeToken: cardToken,
      });

      setIsAddingCard(false);
      setIsAddCardModalOpen(false);
      setAgreeTermsAddCard(false);
      setAddCardError('');
    } catch (err: any) {
      setIsAddingCard(false);
      setAddCardError(`Failed to save card: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRunAutoDeductionTest = async () => {
    setAutoDeductionMsg('Authorizing automatic recurring charge with Stripe API...');
    const res = await triggerAutoDeductionRenewal(activeClientId, activePackage?.packageDefinitionId);
    if (res.success) {
      setAutoDeductionMsg(`SUCCESS! ${res.message} Fresh session credits added to your wallet!`);
    } else {
      setAutoDeductionMsg(`FAILED: ${res.message}`);
    }
  };

  const handleOpenCancelModal = (b: any) => {
    setSelectedBookingForCancel(b);
    setCancelReason('');
    setCancellationResult(null);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!selectedBookingForCancel) return;
    const res = cancelSessionByClient(selectedBookingForCancel.id, cancelReason);
    setCancellationResult(res);
    setTimeout(() => {
      setIsCancelModalOpen(false);
    }, 2000);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    if (!activePackage) {
      setBookingError('You do not have an active package. Please purchase a package first.');
      return;
    }

    const res = createBooking(
      client.id,
      client.assignedTrainerId,
      activePackage.id,
      sessionDate,
      startTime,
      endTime,
      location
    );

    if (res.success) {
      setIsBookModalOpen(false);
    } else {
      setBookingError(res.message);
    }
  };

  const printReceipt = (payId: string) => {
    const pay = clientPayments.find((p) => p.id === payId);
    if (!pay) return;
    const matchedDef = packageDefinitions.find(
      (d) => d.name.toLowerCase() === (pay.packageName || '').replace(/\s*\(Auto-Pay Renewal\)$/i, '').trim().toLowerCase()
    );
    const validityDays = matchedDef?.validityDays || 30;

    const receiptHtml = `
      <div style="border: 2px solid #1e3a8a; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; font-family: sans-serif;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; color: #1e3a8a;">OFFICIAL PAYMENT RECEIPT</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Receipt ID: ${pay.id} • Stripe Ref: ${pay.transactionReference}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px;">PAID VERIFIED</span>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 13px;">
          <p><strong>CLIENT NAME:</strong> ${client.fullName}</p>
          <p><strong>COMMUNITY:</strong> ${client.communityName}, Dubai, UAE</p>
          <p><strong>PACKAGE PURCHASED:</strong> ${pay.packageName}</p>
          <p><strong>DESCRIPTION:</strong> Personal Training package containing training sessions with assigned trainer ${trainer?.fullName || 'Specialist'}. Valid for ${validityDays} calendar days in Asia/Dubai timezone.</p>
          <p><strong>PAYMENT METHOD:</strong> ${pay.paymentMethod}</p>
          <p><strong>DATE & TIME:</strong> ${formatReadableDate(pay.paymentDate) || pay.paymentDate}${(() => { const t = formatDubaiTime((pay as any).paidAt || (pay as any).failedAt || pay.createdAt); return t ? ` at ${t}` : ' GST'; })()}</p>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #0f172a; text-align: right; font-size: 18px; font-weight: 800; color: #0f172a;">
          TOTAL AMOUNT PAID: AED ${pay.amountPaidAED.toLocaleString()}
        </div>
      </div>
    `;
    exportToPDFPrint(`Receipt_${pay.id}`, receiptHtml);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src={
              client.profilePhoto ||
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            }
            alt={client.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                CLIENT PORTAL
              </span>
              <span className="text-xs text-slate-300">Asia/Dubai GST</span>
            </div>
            <h1 className="text-2xl font-black mt-1">Welcome, {client.fullName}</h1>
            <p className="text-xs text-slate-300">{client.communityName} • Assigned Trainer: {trainer?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 transition-colors border border-emerald-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Request Session Booking</span>
          </button>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Package Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 cursor-pointer ${
            activeTab === 'progress'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="whitespace-nowrap">Progress & Body Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 ${
            activeTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Bookings & Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Payments & Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 ${
            activeTab === 'subscriptions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Saved Cards & Auto-Pay</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 ${
            activeTab === 'health'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 shrink-0 text-red-500" />
          <span className="whitespace-nowrap">Health & PAR-Q</span>
          {!client.healthDeclaration?.signed ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          ) : (
            <span className="text-[10px] text-emerald-600 font-extrabold ml-1">✓</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 border ${
            activeTab === 'upcoming'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md border-purple-400'
              : 'text-purple-700 bg-purple-50/60 border-purple-200/80 hover:bg-purple-100/80'
          }`}
        >
          <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'upcoming' ? 'text-amber-300 animate-spin' : 'text-purple-600'}`} />
          <span className="whitespace-nowrap">Upcoming Features</span>
          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight">
            5 New
          </span>
        </button>
      </div>

      {/* Mobile Back Button (shown only on mobile when inside a sub-tab) */}
      {activeTab !== 'overview' && (
        <div className="md:hidden flex items-center justify-between pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs"
          >
            <span>&larr; Back to Dashboard Overview</span>
          </button>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Featured Mobile App Slider */}
          <DashboardSlider onActionClick={(tab) => setActiveTab(tab as any)} />

          {/* UPCOMING FEATURES ROADMAP BANNER */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-full tracking-wider shadow-xs">
                      ✨ ROADMAP 2026
                    </span>
                    <span className="text-xs text-indigo-300 font-bold">5 Major Client Modules Coming Soon</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
                    Upcoming Client Fitness & Nutrition Tools
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    We are launching Workout & Diet Trackers, Libraries, and Habit Tracking modules tailored for Dubai personal training clients. Request early VIP Beta access below!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-all hover:scale-105 shrink-0 cursor-pointer border border-purple-400/40"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>View All 5 Roadmap Modules &rarr;</span>
                </button>
              </div>

              {/* Grid of the 5 Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Workout Tracker */}
                <div className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 p-4 rounded-2xl transition-all shadow-md group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase">
                        v2.5 • Q1 2026
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-blue-300 transition-colors">
                      Workout Tracker
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      Log sets, reps, weights, RPE & rest timers. Track personal records (PRs) and strength volume over time.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Live Set Counter & PRs</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('workout-tracker')}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        notifiedFeatures.includes('workout-tracker')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      }`}
                    >
                      {notifiedFeatures.includes('workout-tracker') ? '✓ VIP Access' : 'Request Access'}
                    </button>
                  </div>
                </div>

                {/* 2. Workout Library */}
                <div className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl transition-all shadow-md group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full uppercase">
                        v2.5 • Q1 2026
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-indigo-300 transition-colors">
                      Workout Library
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      500+ HD video exercise guides, 3D muscle heatmaps & custom coach routines assigned by your trainer.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">500+ 4K Form Videos</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('workout-library')}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        notifiedFeatures.includes('workout-library')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                      }`}
                    >
                      {notifiedFeatures.includes('workout-library') ? '✓ VIP Access' : 'Request Access'}
                    </button>
                  </div>
                </div>

                {/* 3. Diet Tracker */}
                <div className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl transition-all shadow-md group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                        <Apple className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full uppercase">
                        v2.6 • Q2 2026
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-emerald-300 transition-colors">
                      Diet Tracker
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      Daily calorie & macro counter (Protein, Carbs, Fats), GCC product barcode scanner & hydration logging.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">UAE Barcode Scanner</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('diet-tracker')}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        notifiedFeatures.includes('diet-tracker')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      }`}
                    >
                      {notifiedFeatures.includes('diet-tracker') ? '✓ VIP Access' : 'Request Access'}
                    </button>
                  </div>
                </div>

                {/* 4. Diet Library */}
                <div className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl transition-all shadow-md group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                        <Utensils className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase">
                        v2.6 • Q2 2026
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-amber-300 transition-colors">
                      Diet Library
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      Dubai-tailored healthy recipes, chef prep guides, macro breakdowns, grocery lists & UAE dining guide.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Dubai Recipe Catalog</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('diet-library')}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        notifiedFeatures.includes('diet-library')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {notifiedFeatures.includes('diet-library') ? '✓ VIP Access' : 'Request Access'}
                    </button>
                  </div>
                </div>

                {/* 5. Habit Tracker */}
                <div className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 p-4 rounded-2xl transition-all shadow-md group flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                        <Flame className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full uppercase">
                        v2.7 • Q2 2026
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-rose-300 transition-colors">
                      Habit Tracker
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      Daily habit streak counters, sleep duration, daily step goal tracking (10,000 steps) & hydration reminders.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Daily Streaks & Steps</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('habit-tracker')}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        notifiedFeatures.includes('habit-tracker')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                      }`}
                    >
                      {notifiedFeatures.includes('habit-tracker') ? '✓ VIP Access' : 'Request Access'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unreviewed Completed Sessions Banner */}
          {unreviewedCompletedBookings.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-yellow-500/10 border-2 border-amber-400 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      Feedback Requested
                    </span>
                    <span className="text-xs font-bold text-amber-900">Post-Session Rating</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    Rate & Review Completed Session ({unreviewedCompletedBookings[0].sessionDate})
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    How was your workout with {trainer?.fullName || 'your trainer'}? Share your 1-5 star rating & feedback.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenReviewModal(unreviewedCompletedBookings[0])}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 transition-all hover:scale-105 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Rate Session Now</span>
              </button>
            </div>
          )}

          {/* 3-DAY EXPIRY ALERT BANNER */}
          {activePackage && daysRemaining <= 3 && daysRemaining >= 0 && (
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-white text-orange-950">
                      RENEWAL NOTICE
                    </span>
                    <span className="text-xs font-bold text-amber-100">Plan Expiring Soon</span>
                  </div>
                  <h3 className="text-base font-black text-white mt-1">
                    Your {activePackage.packageName} expires in {daysRemaining === 0 ? 'today!' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}!
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Fixed Expiry Date: {activePackage.expiryDate}. Auto-pay renewal system or manual top-up will activate to retain session credits.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBuyModalOpen(true)}
                  className="px-4 py-2.5 bg-white text-slate-950 font-black text-xs rounded-xl shadow-md hover:bg-amber-50 transition-transform hover:scale-105 cursor-pointer"
                >
                  Renew Package Now
                </button>
                {trainer?.whatsappNumber && (
                  <a
                    href={`https://wa.me/${trainer.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(trainer.fullName)},%20my%20package%20is%20expiring%20in%20${daysRemaining}%20days.%20I%20would%20like%20to%20renew.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Trainer</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Unsigned Health Declaration Alert Banner */}
          {!client.healthDeclaration?.signed && (
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <HeartPulse className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-200 text-red-900">
                      Action Required
                    </span>
                    <span className="text-xs font-bold text-red-900">PAR-Q Health Declaration</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    Your Physical Activity Readiness Declaration is Pending
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Please complete and digitally sign your health readiness form so your coach can safely conduct sessions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHealthModalOpen(true)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                <PenTool className="w-4 h-4" />
                <span>Digitally Sign PAR-Q</span>
              </button>
            </div>
          )}

          {/* Health & PAR-Q Status Card */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Health & Illness Declaration (PAR-Q)</span>
                  {client.healthDeclaration?.signed ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ✓ Signed
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      Pending
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {client.healthIssues && client.healthIssues.length > 0
                    ? `${client.healthIssues.length} active medical/injury notes on record`
                    : 'Physical Activity Readiness questionnaire & digital signature'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View & Update</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* PENDING PAYMENT DUE BANNER */}
          {pendingPackages.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 border-2 border-amber-500/50 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
                    <CreditCard className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                      ⚠️ PAYMENT DUE - ACTION REQUIRED
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {pendingPackages[0].packageName}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Assigned by Waiter Walk Admin • {pendingPackages[0].totalSessions} Personal Training Sessions • Strict 30-Day Expiry
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black text-slate-900">{formatAED(pendingPackages[0].packagePriceAED)}</div>
                  <button
                    onClick={() => {
                      setSelectedPendingPkg(pendingPackages[0]);
                      setIsPayPendingModalOpen(true);
                    }}
                    className="mt-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Add/Select Card & Pay Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activePackage ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    ACTIVE TRAINING PACKAGE
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">{activePackage.packageName}</h2>
                  <p className="text-xs text-slate-500">Package ID: {activePackage.id} • AED {activePackage.packagePriceAED}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(true)}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Buy / Upgrade Package</span>
                  </button>
                  <div className="text-right bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">30-Day Expiry Counter</div>
                    <div className="text-xl font-black text-amber-900">
                      {daysRemaining === 0 ? 'Expires Today!' : `${daysRemaining} Days Remaining`}
                    </div>
                    <div className="text-[10px] text-slate-500">Fixed Expiry: {activePackage.expiryDate}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Available Session Credit Wallet</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {activePackage.remainingSessions} / {activePackage.totalSessions} Sessions Remaining
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-blue-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (activePackage.remainingSessions / activePackage.totalSessions) * 100))}%`,
                    }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[56px]">
                    <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tight">COMPLETED</div>
                    <div className="text-base font-black text-blue-900 mt-1">{activePackage.completedSessions}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[56px]">
                    <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tight">REFUNDED</div>
                    <div className="text-base font-black text-emerald-800 mt-1">{activePackage.refundedSessions}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[56px]">
                    <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tight leading-none">LATE CANCELS</div>
                    <div className="text-base font-black text-amber-800 mt-1">{activePackage.lateCancellationDeductions}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[56px]">
                    <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tight">EXPIRED</div>
                    <div className="text-base font-black text-red-600 mt-1">{activePackage.expiredSessions}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-900 text-base">No Active Training Package</h3>
                <p className="text-xs text-amber-700 mt-1">Purchase a 30-day package to schedule personal training sessions.</p>
              </div>
              <button
                onClick={() => setIsBuyModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                Browse Packages & Buy
              </button>
            </div>
          )}

          {/* Progress Analytics Summary Banner in Overview */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl border border-emerald-500/30 p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    VISUAL PROGRESS & METRICS
                  </span>
                  <span className="text-xs text-emerald-300 font-bold">Body Composition Analytics</span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  Historical Weight, Muscle Mass & Habit Consistency
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  View interactive Recharts curves of your weight evolution, body fat reductions, and daily hydration compliance.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLogMetricModalOpen(true)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                + Quick Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('progress')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all hover:scale-103 cursor-pointer"
              >
                Open Analytics &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL PROGRESS & BODY ANALYTICS TAB */}
      {activeTab === 'progress' && (
        <ProgressAnalyticsSection
          client={client}
          onOpenLogModal={() => setIsLogMetricModalOpen(true)}
        />
      )}

      {/* SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <span>Bookings & Training Schedule</span>
            </h3>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg"
            >
              + Book Session
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Upcoming Bookings</h4>
            {upcomingBookings.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No upcoming sessions booked.</div>
            ) : (
              upcomingBookings.map((b) => {
                const { isEligibleForRefund, hoursDiff } = evaluateCancellationPolicy(b.sessionDate, b.startTime);

                return (
                  <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {formatReadableDate(b.sessionDate)} at {b.startTime}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{b.location}</div>
                      </div>

                      <button
                        onClick={() => handleOpenCancelModal(b)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded-lg text-xs"
                      >
                        Cancel Session
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200/60">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Starts in {hoursDiff.toFixed(1)}h • 12h Policy:{' '}
                        {isEligibleForRefund ? (
                          <strong className="text-emerald-700">≥12h (Credit Refunded)</strong>
                        ) : (
                          <strong className="text-red-700">&lt;12h (Credit Permanently Deducted)</strong>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pt-4">Past Sessions History</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {pastBookings.map((b) => (
                <div key={b.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{formatReadableDate(b.sessionDate)} • {b.startTime}</div>
                      <div className="text-[11px] text-slate-500">{b.location}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {b.status}
                      </span>
                      {b.status === 'Completed' && (
                        <button
                          onClick={() => handleOpenReviewModal(b)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{b.trainerRating ? `⭐ ${b.trainerRating}/5 (Edit)` : 'Rate Session'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {b.clientReview && (
                    <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-700 italic">
                      "{b.clientReview}" (Trainer: ⭐ {b.trainerRating}/5 • Session: ⭐ {b.sessionRating}/5)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
                <span>Client Payments & Receipts</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sorted newest-first • Currency AED (Asia/Dubai)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {clientPayments.some((p) => p.status === 'Superseded') && (
                <button
                  type="button"
                  onClick={() => setShowSupersededPayments((v) => !v)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {showSupersededPayments ? 'Hide Superseded Drafts' : 'Show Superseded Drafts'}
                </button>
              )}
              <button
                type="button"
                onClick={handleClientReloadStripe}
                disabled={isReloadingStripe}
                className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-purple-700 ${isReloadingStripe ? 'animate-spin' : ''}`} />
                <span>{isReloadingStripe ? 'Syncing with Stripe...' : 'Reload from Stripe'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buy Package</span>
              </button>
            </div>
          </div>

          {stripeReloadMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                stripeReloadMsg.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span>{stripeReloadMsg.message}</span>
              <button type="button" onClick={() => setStripeReloadMsg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {(() => {
              const visiblePayments = showSupersededPayments
                ? clientPayments
                : clientPayments.filter((p) => p.status !== 'Superseded');

              if (visiblePayments.length === 0) {
                return (
                  <div className="text-xs text-slate-400 italic py-6 text-center">
                    No payment receipts found yet. If you just paid via Stripe, click "Reload from Stripe" above.
                  </div>
                );
              }

              return visiblePayments.map((p) => {
                const isPaid = p.status === 'Paid';
                const isFailed = p.status === 'Failed';
                const isPending = p.status === 'Pending';

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border text-xs space-y-3 ${
                      isFailed
                        ? 'bg-red-50/40 border-red-200'
                        : isPending
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-slate-900 text-base">{p.packageName}</span>
                        <div className="text-slate-500 font-mono text-[10px] sm:text-[11px] break-all mt-0.5">
                          Ref: {p.id} • {p.transactionReference}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                        <div className="text-lg font-black text-slate-900">
                          {formatAED(isPaid ? p.amountPaidAED : p.amountAED)}
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isFailed
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 text-xs space-y-1">
                      <div>
                        <strong>Description:</strong> Personal training package with trainer {trainer?.fullName || 'Specialist'}. Valid for{' '}
                        {packageDefinitions.find(
                          (d) => d.name.toLowerCase() === (p.packageName || '').replace(/\s*\(Auto-Pay Renewal\)$/i, '').trim().toLowerCase()
                        )?.validityDays || 30}{' '}
                        calendar days.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Method: {p.paymentMethod} • Date: {formatReadableDate(p.paymentDate) || p.paymentDate}
                        {(() => {
                          const timeStr = formatDubaiTime((p as any).paidAt || (p as any).failedAt || p.createdAt);
                          return timeStr ? ` • Time: ${timeStr}` : ' (Asia/Dubai GST)';
                        })()}
                      </div>
                      {isFailed && p.notes && (
                        <div className="text-[11px] text-red-700 font-semibold pt-1">
                          Reason: {p.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {isPending && pendingPackages.some((pk) => pk.id === p.packageId || pk.paymentReference === p.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            const matchPkg = pendingPackages.find((pk) => pk.id === p.packageId || pk.paymentReference === p.id);
                            if (matchPkg) {
                              setSelectedPendingPkg(matchPkg);
                              setIsPayPendingModalOpen(true);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Invoice Now</span>
                        </button>
                      )}

                      {isPaid && (
                        settings.clientPdfReceiptEnabled ? (
                          <button
                            onClick={() => printReceipt(p.id)}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print PDF Receipt</span>
                          </button>
                        ) : (
                          <span className="w-full sm:w-auto text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Receipt Printing Disabled by Admin</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* SAVED CARDS & AUTO-DEDUCTION TAB */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Auto-Deduction Engine Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-black text-base sm:text-lg">30-Day Card Auto-Deduction Engine</h3>
              </div>
              <span className="self-start sm:self-auto bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shrink-0">
                STRIPE RENEWAL ACTIVE
              </span>
            </div>

            <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-xs text-purple-100 leading-relaxed space-y-1.5">
              <div className="font-black flex items-center space-x-1.5 text-white text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>100% Hands-Free Auto-Pay Subscription</span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200">
                When your personal training package reaches its 30-calendar-day validity or session credits reach 0, our background sweeper automatically charges your default card via Stripe and activates your fresh package credits. <strong>Neither you nor the gym admin needs to click or touch anything.</strong>
              </p>
            </div>

            {autoDeductionMsg && (
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 text-xs font-bold text-amber-300">
                {autoDeductionMsg}
              </div>
            )}

            {failedSubscription && !activeSubscription && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 text-xs text-red-100 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Automatic Renewal Payment Failed ({failedSubscription.packageName})</strong>
                  <span>Your saved card ({failedSubscription.cardBrand} ending in {failedSubscription.last4Digits}) could not be charged for AED {failedSubscription.amountAED}. Please add or update your default card below and retry renewal.</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-purple-300">
                {activeSubscription ? (
                  <span>
                    Next Auto-Deduction Date: <strong className="text-white">{activeSubscription.nextPaymentDate}</strong> (AED {activeSubscription.amountAED})
                  </span>
                ) : failedSubscription ? (
                  <span className="text-red-200 font-bold">
                    Auto-Pay paused due to card decline on {failedSubscription.packageName} (AED {failedSubscription.amountAED})
                  </span>
                ) : (
                  <span>No active recurring charge scheduled.</span>
                )}
              </div>

              <button
                onClick={handleRunAutoDeductionTest}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Trigger Auto-Deduction Test</span>
              </button>
            </div>
          </div>

          {/* Saved Cards List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Your Saved Payment Cards</h3>
                <p className="text-xs text-slate-500">Cards stored securely through Stripe. Used for automatic package renewals.</p>
              </div>

              <button
                onClick={() => setIsAddCardModalOpen(true)}
                className="self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Saved Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientSavedCards.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  No saved cards found. Click "Add Saved Card" above.
                </div>
              ) : (
                clientSavedCards.map((card) => (
                  <div
                    key={card.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      card.isDefault ? 'bg-gradient-to-br from-slate-900 to-blue-950 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-sm uppercase tracking-wider">{card.brand}</span>
                        {card.isDefault ? (
                          <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                            <Check className="w-3 h-3" />
                            <span>DEFAULT AUTO-DEDUCTION</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefaultSavedCard(activeClientId, card.id)}
                            className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>

                      <div className="mt-4 font-mono font-bold text-lg tracking-widest">
                        •••• •••• •••• {card.last4}
                      </div>

                      <div className="mt-2 text-xs flex justify-between opacity-80 font-medium">
                        <span>Cardholder: {card.cardHolder}</span>
                        <span>Expires: {card.expiryMonth}/{card.expiryYear}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/20 flex justify-end">
                      <button
                        onClick={() => removeSavedCard(card.id)}
                        className="text-red-400 hover:text-red-500 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Card</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEALTH & PAR-Q TAB */}
      {activeTab === 'health' && (
        <div className="space-y-6 text-xs text-slate-700">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-500" />
                <span>My Health Declaration & Training Notes</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical Activity Readiness Questionnaire (PAR-Q), electronic signature, and coach injury notes.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsAddIssueModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Injury / Health Note</span>
              </button>
            </div>
          </div>

          {/* Health Declaration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    client.healthDeclaration?.signed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Declaration of Health & Illness (PAR-Q)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mandatory physical conditioning waiver & health questionnaire
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {client.healthDeclaration?.signed ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Signed & Verified</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Signature Required</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsHealthModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{client.healthDeclaration?.signed ? 'View / Re-Sign' : 'Open & Sign PAR-Q'}</span>
                </button>
              </div>
            </div>

            {client.healthDeclaration?.signed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Signature Date</span>
                    <span className="font-bold text-slate-800">
                      {new Date(client.healthDeclaration.signedAt || '').toLocaleString('en-AE', {
                        timeZone: 'Asia/Dubai',
                      })}{' '}
                      GST
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Signatory</span>
                    <span className="font-bold text-slate-800">{client.healthDeclaration.clientName}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Emergency Contact Verified
                    </span>
                    <span className="font-bold text-slate-800">
                      {client.emergencyContact.name} ({client.emergencyContact.phone})
                    </span>
                  </div>
                </div>

                {client.healthDeclaration.signatureDataUrl && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Your Digital Electronic Signature on File
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Recorded via touch screen drawing pad in Dubai, UAE.
                      </p>
                    </div>
                    <div className="h-12 border border-dashed border-slate-300 rounded-lg px-3 bg-white flex items-center shrink-0">
                      <img
                        src={client.healthDeclaration.signatureDataUrl}
                        alt="Client Signature"
                        className="h-9 max-w-[180px] object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900 text-xs">Physical Activity Readiness Form Required</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Prior to your personal training workouts with your certified personal trainer, you must complete your health questions and provide an electronic touch signature.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Categorized Health Conditions & Training Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>My Training Health Conditions & Notes</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Conditions and restrictions shared with your personal trainer to tailor exercises
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddIssueModalOpen(true)}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Report Condition / Injury</span>
              </button>
            </div>

            <div className="space-y-3">
              {!client.healthIssues || client.healthIssues.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <HeartPulse className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-xs text-slate-600">No health issues or restrictions reported</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If you experience joint pain, muscle strain, or take new medication, click "+ Report Condition / Injury" to alert your trainer.
                  </p>
                </div>
              ) : (
                client.healthIssues.map((issue) => {
                  const isCritical = issue.severity === 'Critical';
                  const isHigh = issue.severity === 'High';
                  const isModerate = issue.severity === 'Moderate';

                  const borderClass = isCritical
                    ? 'border-l-4 border-l-red-500 bg-red-50/20'
                    : isHigh
                    ? 'border-l-4 border-l-orange-500 bg-orange-50/20'
                    : isModerate
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                    : 'border-l-4 border-l-blue-500 bg-blue-50/20';

                  return (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 ${borderClass}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-900 text-white">
                            {issue.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isCritical
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : isHigh
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : isModerate
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {issue.severity} Severity
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              issue.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : issue.status === 'Monitoring'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {issue.status}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400">Reported: {issue.dateReported}</span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm">{issue.title}</h4>

                      {issue.affectedArea && (
                        <div className="text-[11px] text-slate-500 font-medium">
                          Area / Joint: <strong className="text-slate-800">{issue.affectedArea}</strong>
                        </div>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-2.5 rounded-lg border border-slate-200">
                        {issue.description}
                      </p>

                      {issue.treatmentPlan && (
                        <div className="text-[11px] text-blue-900 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Doctor & Coach Recommendations: </strong>
                            <span>{issue.treatmentPlan}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPCOMING FEATURES ROADMAP TAB */}


      {activeTab === 'upcoming' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-500/30 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-full tracking-wider shadow-xs">
                  ✨ ROADMAP 2026
                </span>
                <span className="text-xs text-purple-200 font-bold">5 Upcoming Client Modules</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Upcoming Client Features & Modules
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 max-w-3xl leading-relaxed">
                We are actively building 5 major client modules: <strong>Workout Tracker</strong>, <strong>Workout Library</strong>, <strong>Diet Tracker</strong>, <strong>Diet Library</strong>, and <strong>Habit Tracker</strong>. Explore details, view interactive previews, and register for VIP Beta Access below.
              </p>

              {betaSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{betaSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-1">Filter Modules:</span>
              {(['All', 'Workout', 'Diet', 'Habit'] as const).map((cat) => {
                const count = cat === 'All' ? UPCOMING_FEATURES.length : UPCOMING_FEATURES.filter(f => f.category === cat).length;
                const isActive = featureFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFeatureFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-purple-800 text-amber-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 font-medium flex items-center space-x-1">
              <Rocket className="w-4 h-4 text-purple-600" />
              <span>Full Release target: Q1-Q2 2026</span>
            </div>
          </div>

          {/* Upcoming Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {UPCOMING_FEATURES.filter(f => featureFilter === 'All' || f.category === featureFilter).map((feat) => {
              const IconComp = feat.icon;
              const isNotified = notifiedFeatures.includes(feat.id);

              return (
                <div
                  key={feat.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all p-6 space-y-5 flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${feat.accentBg}`}>
                            {feat.category} Module
                          </span>
                          <h3 className="text-xl font-black text-slate-900 mt-1">{feat.title}</h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-xs ${feat.badgeBg}`}>
                          {feat.version}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">ETA: {feat.eta}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {feat.description}
                    </p>

                    {/* Interactive Mock Data Snippet Box */}
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          <span>Interactive Preview Snippet</span>
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                          {feat.mockData.stat1.label}: {feat.mockData.stat1.value}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                        {feat.mockData.previewSnippet}
                      </div>
                    </div>

                    {/* Key Highlights */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block">Key Capabilities:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {feat.keyHighlights.map((hl, idx) => (
                          <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedUpcomingFeatureModal(feat)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Interactive Demo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleNotification(feat.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                        isNotified
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                      }`}
                    >
                      {isNotified ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>VIP Beta Access Granted</span>
                        </>
                      ) : (
                        <>
                          <BellRing className="w-4 h-4 text-amber-300" />
                          <span>Request VIP Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Saved Card Modal */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header with Little Close Button on Right Top */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="p-2 bg-blue-600/30 text-blue-300 border border-blue-400/30 rounded-xl shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">Add New Saved Payment Card</h3>
                  <p className="text-[11px] text-blue-200 truncate">Stripe Vault 256-bit encryption • Dubai PTMS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddCardModalOpen(false);
                  setAddCardError('');
                  setAgreeTermsAddCard(false);
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white transition-all cursor-pointer shrink-0 border border-white/20 shadow-xs flex items-center justify-center ml-2"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                {addCardError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{addCardError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="Full name as shown on card"
                  />
                </div>

                {/* Secure Stripe.js Card Element */}
                <div className="space-y-2 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Card Details (Stripe.js Protected)
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>PCI Encrypted</span>
                    </span>
                  </div>

                  <div className="p-3 border border-slate-300 rounded-xl bg-white shadow-2xs focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 min-h-[46px]">
                    <div ref={addCardStripeRef} id="add-card-stripe-element" className="w-full" />
                    {!addCardReady && (
                      <div className="text-slate-400 text-xs py-1 flex items-center space-x-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Connecting to Stripe Secure Elements...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Your credit/debit card information is securely tokenized directly through Stripe.js without ever touching our servers.
                  </p>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={makeDefault}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Set as Default Card for 30-Day Auto-Deductions</span>
                </label>

                {/* Payment Terms & Conditions and Refund Policy Display */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span className="font-extrabold text-slate-900 text-xs">Payment Terms & Conditions & Refund Policy</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Dubai PTMS
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 max-h-24 sm:max-h-28 overflow-y-auto text-[10px] sm:text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-line bg-white/70">
                    {settings.paymentTermsAndConditions || (
                      `WAITER WALK FITNESS & WELLNESS LLC - DUBAI, UAE
CLIENT PAYMENT TERMS & CONDITIONS

1. STRICT 30-CALENDAR-DAY PACKAGE EXPIRATION
All personal training session packages purchased with Waiter Walk expire exactly 30 calendar days from the date of purchase or package activation. Unused session credits upon expiration are strictly non-refundable and forfeited in accordance with standard Dubai PTMS operating policies.

2. 12-HOUR CANCELLATION WINDOW
Sessions cancelled or rescheduled with at least twelve (12) hours advance notice prior to scheduled session start time will have their credit returned in full to the client package wallet. Cancellations requested less than 12 hours before session start time will be deducted in full.

3. RECURRING BILLING & STRIPE PAYMENTS
Saved cards are billed automatically every 30 calendar days until cancelled. Subscriptions may be cancelled, modified, or paused anytime via the Client Portal.

4. 5% UAE VAT & TAX INVOICING
All package prices are subject to 5% UAE Value Added Tax (VAT) in compliance with FTA regulations.

5. NON-TRANSFERABILITY & REFUND POLICY
Personal training session packages are personal and non-transferable. Package refunds are strictly subject to management discretion and require supporting medical documentation.`
                    )}
                  </div>
                </div>

                {/* Option to tick to agree to the terms & conditions and refund policy */}
                <div className="p-2.5 sm:p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={agreeTermsAddCard}
                      onChange={(e) => {
                        setAgreeTermsAddCard(e.target.checked);
                        setAddCardError('');
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                    />
                    <span className="leading-snug text-[11px] sm:text-xs">
                      I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiration and 12-hour session cancellation policy).
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky bottom footer */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-4 py-3 sm:px-5 sm:py-3.5 flex justify-end space-x-2 shrink-0 z-10 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCardModalOpen(false);
                    setAddCardError('');
                    setAgreeTermsAddCard(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!agreeTermsAddCard || isAddingCard}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md ${
                    agreeTermsAddCard && !isAddingCard
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isAddingCard ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Saving Card...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Card</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Warning Modal */}
      {isCancelModalOpen && selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Confirm Session Cancellation</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancellationResult ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border font-bold ${
                    cancellationResult.creditImpact === 'refunded'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {cancellationResult.message}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {(() => {
                  const { isEligibleForRefund, hoursDiff } = evaluateCancellationPolicy(
                    selectedBookingForCancel.sessionDate,
                    selectedBookingForCancel.startTime
                  );

                  return (
                    <div
                      className={`p-4 rounded-xl border ${
                        isEligibleForRefund
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>12-Hour Cancellation Policy Notice</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div>
                          Session starts in: <strong>{hoursDiff.toFixed(1)} Hours</strong>
                        </div>
                        {isEligibleForRefund ? (
                          <div className="text-emerald-700 font-bold">
                            ✓ Your cancellation is at least 12 hours before the session. 1 session credit will be REFUNDED to your package wallet.
                          </div>
                        ) : (
                          <div className="text-red-700 font-bold">
                            ⚠️ Your cancellation is LESS than 12 hours before start time. 1 session credit will be PERMANENTLY DEDUCTED with no refund.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Reason for Cancellation</label>
                  <input
                    type="text"
                    placeholder="Optional reason..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                  >
                    Keep Session
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Session Booking Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Request Personal Training Session</h3>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">Note: Policy limits 1 session per client per day.</p>
              </div>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Session Date</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Training Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Submit Booking Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buy Package Stripe Launcher */}
      {isBuyModalOpen && (
        <StripeCheckoutModal
          packageDef={selectedPackageDef}
          client={client}
          isOpen={isBuyModalOpen}
          onClose={() => setIsBuyModalOpen(false)}
        />
      )}

      {/* Pay Pending Package Modal */}
      {isPayPendingModalOpen && selectedPendingPkg && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header with Little Close Button on Right Top */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="p-2 bg-blue-600/30 text-blue-300 border border-blue-400/30 rounded-xl shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">Pay & Activate Plan</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shrink-0">
                      DUE INVOICE
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200 truncate">Waiter Walk Fitness • Dubai, UAE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayPendingModalOpen(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white transition-all cursor-pointer shrink-0 border border-white/20 shadow-xs flex items-center justify-center ml-2"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayAndActivate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                {/* Invoice Summary Box */}
                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-amber-700 tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                      DUE INVOICE
                    </span>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base mt-1 truncate">{selectedPendingPkg.packageName}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500">{selectedPendingPkg.totalSessions} Sessions • Strict 30-Day Expiry</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg sm:text-xl font-black text-slate-900">{formatAED(selectedPendingPkg.packagePriceAED)}</div>
                    <div className="text-[10px] text-emerald-700 font-bold">Instant Activation</div>
                  </div>
                </div>

                {payFeedbackMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
                      payFeedbackMsg.startsWith('Error') || payFeedbackMsg.startsWith('Stripe Gateway')
                        ? 'bg-amber-50 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {payFeedbackMsg.startsWith('Error') || payFeedbackMsg.startsWith('Stripe Gateway') ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{payFeedbackMsg}</span>
                  </div>
                )}

                {/* Card Selection & Information */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Payment Method
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Stripe.js Protected</span>
                    </span>
                  </div>

                  {/* Selectable saved cards */}
                  {clientSavedCards.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Choose a Saved Card:
                      </span>
                      {clientSavedCards.map((sc) => {
                        const isSelected = selectedPendingSavedCardId === sc.id;
                        return (
                          <div
                            key={sc.id}
                            onClick={() => setSelectedPendingSavedCardId(sc.id)}
                            className={`p-3 border rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                                  <CreditCard
                                    className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
                                  />
                                  <span className="font-bold text-slate-800 text-xs">
                                    {sc.brand} •••• {sc.last4}
                                  </span>
                                  {sc.isDefault && (
                                    <span className="text-[9px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded">
                                      DEFAULT
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  Expires {sc.expiryMonth}/{sc.expiryYear} • {sc.cardHolder}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 flex items-center space-x-1 shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Selected</span>
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Option to use a new card instead */}
                      <div
                        onClick={() => setSelectedPendingSavedCardId('NEW_CARD')}
                        className={`p-3 border rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                          selectedPendingSavedCardId === 'NEW_CARD'
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 sm:space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                              selectedPendingSavedCardId === 'NEW_CARD'
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {selectedPendingSavedCardId === 'NEW_CARD' && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-slate-500" />
                            <span>+ Use a new credit or debit card</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If saved card is selected: show clear confirmation */}
                  {selectedPendingSavedCardId !== 'NEW_CARD' && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed text-[11px] sm:text-xs">
                        <span className="font-bold">Real-Time Stripe Vault Payment:</span> Charge will be billed directly to your selected saved card through Stripe API without requiring card re-entry.
                      </div>
                    </div>
                  )}

                  {/* If new card is selected: show Stripe Elements */}
                  {selectedPendingSavedCardId === 'NEW_CARD' && (
                    <div className="space-y-2.5 sm:space-y-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          New Card Details (Stripe.js Protected)
                        </label>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>PCI Encrypted</span>
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={payCardHolder}
                          onChange={(e) => setPayCardHolder(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                          placeholder="Full name as shown on card"
                        />
                      </div>

                      <div className="p-3 border border-slate-300 rounded-xl bg-white shadow-2xs focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 min-h-[46px]">
                        <div ref={pendingStripeRef} id="pending-stripe-card-element" className="w-full" />
                        {!pendingCardReady && (
                          <div className="text-slate-400 text-xs py-1 flex items-center space-x-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Connecting to Stripe Secure Elements...</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
                        Card numbers are tokenized directly via Stripe.js. Zero raw card data touches our servers.
                      </p>

                      <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paySaveDefaultCard}
                          onChange={(e) => setPaySaveDefaultCard(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700">
                          Save card for future 1-click renewals & 30-day auto-pay
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Payment Terms & Conditions and Refund Policy Display */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-extrabold text-slate-900 text-[11px] sm:text-xs">Payment Terms & Conditions & Refund Policy</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Dubai PTMS
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-3 max-h-24 sm:max-h-28 overflow-y-auto text-[10px] sm:text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-line bg-white/70">
                    {settings.paymentTermsAndConditions || (
                      `WAITER WALK FITNESS & WELLNESS LLC - DUBAI, UAE
CLIENT PAYMENT TERMS & CONDITIONS

1. STRICT 30-CALENDAR-DAY PACKAGE EXPIRATION
All personal training session packages purchased with Waiter Walk expire exactly 30 calendar days from the date of purchase or package activation. Unused session credits upon expiration are strictly non-refundable.

2. 12-HOUR CANCELLATION WINDOW
Sessions cancelled at least 12 hours prior to scheduled session start time are refunded in full. Cancellations with less than 12 hours notice are forfeited.

3. RECURRING BILLING & STRIPE PAYMENTS
Saved cards are billed automatically every 30 calendar days until cancelled. Subscriptions may be cancelled, modified, or paused anytime via the Client Portal.

4. 5% UAE VAT & TAX INVOICING
All package prices are subject to 5% UAE Value Added Tax (VAT) in compliance with FTA regulations.

5. NON-TRANSFERABILITY & REFUND POLICY
Personal training session packages are personal and non-transferable. Package refunds are strictly subject to management discretion and require supporting medical documentation.`
                    )}
                  </div>
                </div>

                {/* Mandatory agree to terms and refund policy */}
                <div className="p-2.5 sm:p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <label className="flex items-start space-x-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={payAgreeTerms}
                      onChange={(e) => setPayAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                    />
                    <span className="leading-snug text-[11px] sm:text-xs">
                      I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiry and 12-hour session cancellation rules).
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky bottom footer */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-3.5 py-2.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2 shrink-0 z-10 shadow-xs">
                <div className="text-left hidden xs:block sm:block">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block leading-none">Total Due</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">{formatAED(selectedPendingPkg.packagePriceAED)}</span>
                </div>
                <div className="flex items-center space-x-2 w-full xs:w-auto sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayPendingModalOpen(false);
                      setPayFeedbackMsg('');
                      setPayAgreeTerms(false);
                    }}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPay || !payAgreeTerms}
                    className={`flex-1 xs:flex-initial sm:flex-initial font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all ${
                      isProcessingPay || !payAgreeTerms
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer focus:ring-4 focus:ring-emerald-200'
                    }`}
                  >
                    {isProcessingPay ? (
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Processing Live Payment...</span>
                      </span>
                    ) : selectedPendingSavedCardId !== 'NEW_CARD' ? (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Pay {formatAED(selectedPendingPkg.packagePriceAED)} with Saved Card</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Pay {formatAED(selectedPendingPkg.packagePriceAED)} & Activate Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health & Illness Declaration Signature Modal */}
      {isHealthModalOpen && (
        <HealthDeclarationModal
          client={client}
          isOpen={isHealthModalOpen}
          onClose={() => setIsHealthModalOpen(false)}
        />
      )}

      {/* Add Client Health Issue / Injury Note Modal */}
      {isAddIssueModalOpen && (
        <AddHealthIssueModal
          clientId={client.id}
          clientName={client.fullName}
          isOpen={isAddIssueModalOpen}
          onClose={() => setIsAddIssueModalOpen(false)}
        />
      )}

      {/* Post-Session Rate & Review Modal */}
      {isReviewModalOpen && selectedBookingForReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Rate & Review Session</h3>
                  <p className="text-[11px] text-slate-500">
                    Session on {selectedBookingForReview.sessionDate} • {trainer?.fullName || 'Personal Trainer'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-5 text-xs">
                {/* Trainer Rating */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block font-extrabold text-slate-800 text-xs">
                    Trainer Performance Rating ({trainer?.fullName || 'Trainer'})
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={`trainer-${star}`}
                        onClick={() => setTrainerRatingInput(star)}
                        className="p-1.5 rounded-xl hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= trainerRatingInput
                              ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-black text-slate-900 text-sm ml-2">
                      {trainerRatingInput} / 5
                    </span>
                  </div>
                </div>

                {/* Session Rating */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block font-extrabold text-slate-800 text-xs">
                    Workout Session Quality & Satisfaction
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={`session-${star}`}
                        onClick={() => setSessionRatingInput(star)}
                        className="p-1.5 rounded-xl hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= sessionRatingInput
                              ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-black text-slate-900 text-sm ml-2">
                      {sessionRatingInput} / 5
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block font-extrabold text-slate-800 text-xs uppercase mb-1">
                    Client Review & Feedback (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewTextInput}
                    onChange={(e) => setReviewTextInput(e.target.value)}
                    placeholder="Share how you felt during the workout, trainer guidance, exercises..."
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Submit Rating & Review</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Interactive Feature Preview Modal */}
      {selectedUpcomingFeatureModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${selectedUpcomingFeatureModal.color} text-white px-6 py-4 flex items-center justify-between shrink-0 select-none`}>
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shrink-0">
                  {React.createElement(selectedUpcomingFeatureModal.icon, { className: 'w-6 h-6 text-white' })}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/20 text-white tracking-wider">
                      {selectedUpcomingFeatureModal.category} MODULE
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      {selectedUpcomingFeatureModal.version}
                    </span>
                  </div>
                  <h3 className="font-black text-lg sm:text-xl text-white truncate mt-0.5">
                    {selectedUpcomingFeatureModal.title} Preview
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUpcomingFeatureModal(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Description & ETA */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{selectedUpcomingFeatureModal.title} Specification</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">{selectedUpcomingFeatureModal.description}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Release</span>
                  <span className="text-sm font-black text-purple-700">{selectedUpcomingFeatureModal.eta}</span>
                </div>
              </div>

              {/* Stats Teaser */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    {selectedUpcomingFeatureModal.mockData.stat1.label}
                  </span>
                  <span className="text-lg font-black text-slate-900 mt-0.5 block">
                    {selectedUpcomingFeatureModal.mockData.stat1.value}
                  </span>
                </div>
                <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    {selectedUpcomingFeatureModal.mockData.stat2.label}
                  </span>
                  <span className="text-lg font-black text-slate-900 mt-0.5 block">
                    {selectedUpcomingFeatureModal.mockData.stat2.value}
                  </span>
                </div>
              </div>

              {/* Specific Interactive Demo Component Mockup */}
              <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Live Interactive Feature Mockup</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full">
                    ● Simulator Active
                  </span>
                </div>

                {selectedUpcomingFeatureModal.id === 'workout-tracker' && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div>
                        <div className="font-extrabold text-white text-sm">Barbell Incline Bench Press</div>
                        <div className="text-[10px] text-slate-400">Target: Upper Chest • 4 Sets x 10 Reps</div>
                      </div>
                      <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                        Rest Timer: 01:30
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">Set 1: 80kg x 10</div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">Set 2: 85kg x 10</div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-bold text-amber-400 border-amber-500/50">Set 3: 90kg x 8 (PR)</div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-500">+ Add Set</div>
                    </div>
                  </div>
                )}

                {selectedUpcomingFeatureModal.id === 'workout-library' && (
                  <div className="space-y-3 font-sans">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80"
                        alt="Exercise Demo"
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                      <div className="absolute w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl border border-purple-400/50">
                        <Rocket className="w-7 h-7 fill-white" />
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white">
                        <span>Form Cue: Keep shoulder blades retracted & feet planted</span>
                        <span className="bg-purple-600 px-2 py-0.5 rounded text-[10px]">4K 60FPS</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUpcomingFeatureModal.id === 'diet-tracker' && (
                  <div className="space-y-3 font-sans">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">Protein Target</span>
                        <span className="text-base font-black text-emerald-400 mt-0.5 block">165g / 180g</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">Carbohydrates</span>
                        <span className="text-base font-black text-amber-400 mt-0.5 block">210g / 250g</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">Fats</span>
                        <span className="text-base font-black text-indigo-400 mt-0.5 block">55g / 65g</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUpcomingFeatureModal.id === 'diet-library' && (
                  <div className="space-y-3 font-sans">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black text-lg">
                        🍲
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-white text-sm truncate">Dubai Spiced Grilled Salmon Bowl</div>
                        <div className="text-[10px] text-slate-400">42g Protein • 520 kcal • 15 Mins Prep • High Fiber</div>
                      </div>
                      <span className="bg-amber-600 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg">
                        View Recipe
                      </span>
                    </div>
                  </div>
                )}

                {selectedUpcomingFeatureModal.id === 'habit-tracker' && (
                  <div className="space-y-3 font-sans">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Sleep</span>
                        <span className="font-bold text-emerald-400">8.2 Hrs ✓</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Steps</span>
                        <span className="font-bold text-emerald-400">10,450 ✓</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Water</span>
                        <span className="font-bold text-emerald-400">3.5 L ✓</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Streak</span>
                        <span className="font-bold text-amber-400">14 Days 🔥</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Highlights List */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Features Included:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUpcomingFeatureModal.keyHighlights.map((hl: string, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2 text-xs font-semibold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUpcomingFeatureModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-extrabold hover:bg-slate-100 transition-colors"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleNotification(selectedUpcomingFeatureModal.id);
                  setSelectedUpcomingFeatureModal(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                  notifiedFeatures.includes(selectedUpcomingFeatureModal.id)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                }`}
              >
                {notifiedFeatures.includes(selectedUpcomingFeatureModal.id) ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Registered for Beta</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-amber-300" />
                    <span>Register for Early Beta Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Body Metric Check-In Modal */}
      {isLogMetricModalOpen && (
        <LogBodyMetricModal
          clientId={client.id}
          isOpen={isLogMetricModalOpen}
          onClose={() => setIsLogMetricModalOpen(false)}
        />
      )}
    </div>
  );
};

