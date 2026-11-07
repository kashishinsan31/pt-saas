import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatAED, formatReadableDate, getDaysRemaining, evaluateCancellationPolicy, formatDubaiDate } from '../../utils/dubaiTime';
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
} from 'lucide-react';
import { StripeCheckoutModal } from '../stripe/StripeCheckoutModal';
import { processStripeApiCharge, getStripe, createStripeCustomer } from '../../services/stripeApi';
import { DashboardSlider } from '../common/DashboardSlider';
import { HealthDeclarationModal } from '../common/HealthDeclarationModal';
import { AddHealthIssueModal } from '../common/AddHealthIssueModal';

interface ClientDashboardProps {
  initialSection?: 'dashboard' | 'sessions' | 'payments' | 'subscriptions';
}

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
  } = useApp();

  const clientId = currentUser?.associatedId || 'WW-CL-1001';
  const client = clients.find((c) => c.id === clientId) || clients[0];
  const trainer = trainers.find((t) => t.id === client.assignedTrainerId);

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'payments' | 'subscriptions' | 'health'>('overview');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);

  useEffect(() => {
    if (initialSection === 'payments') setActiveTab('payments');
    else if (initialSection === 'subscriptions') setActiveTab('subscriptions');
    else if (initialSection === 'sessions') setActiveTab('sessions');
    else setActiveTab('overview');
  }, [initialSection]);

  const activePackage = clientPackages.find((p) => p.clientId === clientId && p.status === 'Active');
  const daysRemaining = activePackage ? getDaysRemaining(activePackage.expiryDate) : 0;

  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const upcomingBookings = clientBookings.filter((b) => b.status === 'Scheduled');
  const pastBookings = clientBookings.filter((b) => b.status !== 'Scheduled');

  const clientPayments = payments.filter((p) => p.clientId === clientId);
  const clientSavedCards = savedCards.filter((c) => c.clientId === clientId);
  const pendingPackages = clientPackages.filter((p) => p.clientId === clientId && p.status === 'Pending Payment');
  const activeSubscription = subscriptions.find((s) => s.clientId === clientId && s.status === 'Active');

  // Pending Package Payment Modal State
  const [isPayPendingModalOpen, setIsPayPendingModalOpen] = useState(false);
  const [selectedPendingPkg, setSelectedPendingPkg] = useState<any>(null);
  const [selectedPendingSavedCardId, setSelectedPendingSavedCardId] = useState<string>('NEW_CARD');
  const [payCardHolder, setPayCardHolder] = useState(client.fullName);
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
  const [cardHolderName, setCardHolderName] = useState(client.fullName);
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
    const pkgAmountAED = selectedPendingPkg.priceAED || pkgDef?.priceAED || 3500;

    // 1. If paying with a Selected Saved Card (PCI Vaulted)
    if (selectedPendingSavedCardId !== 'NEW_CARD') {
      const sc = clientSavedCards.find((c) => c.id === selectedPendingSavedCardId);
      if (!sc) {
        setIsProcessingPay(false);
        setPayFeedbackMsg('Error: Selected saved card was not found. Please select a valid card.');
        return;
      }

      let customerIdToVault = sc.stripeCustomerId || client.stripeCustomerId;
      const cardTokenToUse = sc.stripeToken;

      if (!customerIdToVault && cardTokenToUse && activeSecretKey) {
        try {
          const custRes = await createStripeCustomer({
            secretKey: activeSecretKey,
            email: client.email,
            name: client.fullName,
            cardToken: cardTokenToUse,
            clientId: client.id,
          });
          if (custRes.success && custRes.customerId) {
            customerIdToVault = custRes.customerId;
          }
        } catch (e) {
          console.warn('Customer vault notice:', e);
        }
      }

      const stripeRes = await processStripeApiCharge({
        secretKey: activeSecretKey,
        amountAED: pkgAmountAED,
        description: `Pending Package Payment: ${selectedPendingPkg.name || pkgDef?.name || 'PT Package'} for ${client.fullName} (Saved Card ${sc.brand} ending in ${sc.last4}) - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? undefined : (cardTokenToUse || (isTestMode ? 'tok_visa' : undefined)),
      });

      if (!stripeRes.success) {
        setIsProcessingPay(false);
        setPayFeedbackMsg(`Stripe Gateway Error: ${stripeRes.message}`);
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
        stripeRes.stripeChargeId
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
        setPayFeedbackMsg(`Card Error: ${tokenResult.error.message}`);
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

      // Vault card to Stripe Customer if requested
      let customerIdToVault = client.stripeCustomerId;
      if (activeSecretKey && (paySaveDefaultCard || true)) {
        try {
          const custRes = await createStripeCustomer({
            secretKey: activeSecretKey,
            email: client.email,
            name: client.fullName,
            cardToken,
            clientId: client.id,
          });
          if (custRes.success && custRes.customerId) {
            customerIdToVault = custRes.customerId;
          }
        } catch (e) {
          console.warn('Customer vault notice:', e);
        }
      }

      const stripeRes = await processStripeApiCharge({
        secretKey: activeSecretKey,
        amountAED: pkgAmountAED,
        description: `Pending Package Payment: ${selectedPendingPkg.name || pkgDef?.name || 'PT Package'} for ${client.fullName} - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? undefined : cardToken,
      });

      if (!stripeRes.success) {
        setIsProcessingPay(false);
        setPayFeedbackMsg(`Stripe Gateway Error: ${stripeRes.message}`);
        return;
      }

      if (paySaveDefaultCard) {
        addSavedCard(client.id, {
          cardHolder: payCardHolder || client.fullName,
          brand,
          last4: last4Digits,
          expiryMonth: expM,
          expiryYear: expY,
          isDefault: true,
          stripeCustomerId: customerIdToVault,
          stripeToken: cardToken,
        });
      }

      const res = payAndActivatePackage(
        selectedPendingPkg.id,
        {
          cardHolder: payCardHolder,
          brand,
          last4: last4Digits,
          expiryMonth: expM,
          expiryYear: expY,
          isDefault: paySaveDefaultCard,
        },
        stripeRes.stripeChargeId
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
        setAddCardError(`Card Error: ${tokenResult.error.message}`);
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
      let customerIdToVault = client.stripeCustomerId;
      const liveKey = (settings.stripeLiveSecretKey || '').trim();
      const testKey = (settings.stripeSecretKey || '').trim();
      const activeSecretKey = isTestMode ? (testKey || liveKey) : (liveKey || testKey);

      if (activeSecretKey) {
        try {
          const custRes = await createStripeCustomer({
            secretKey: activeSecretKey,
            email: client.email,
            name: client.fullName,
            cardToken,
            clientId: client.id,
          });
          if (custRes.success && custRes.customerId) {
            customerIdToVault = custRes.customerId;
          }
        } catch (e) {
          console.warn('Vaulting notice:', e);
        }
      }

      addSavedCard(clientId, {
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
    const res = await triggerAutoDeductionRenewal(clientId, activePackage?.packageDefinitionId);
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
          <p><strong>DESCRIPTION:</strong> Personal Training package containing training sessions with assigned trainer ${trainer?.fullName}. Valid for 30 calendar days in Asia/Dubai timezone.</p>
          <p><strong>PAYMENT METHOD:</strong> ${pay.paymentMethod}</p>
          <p><strong>DATE:</strong> ${pay.paymentDate} GST</p>
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

      {/* Portal Navigation Tabs - Hidden in mobile mode, visible on tablet/desktop */}
      <div className="hidden md:flex bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all text-center shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Package Overview</span>
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

                <div className="text-right bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">30-Day Expiry Counter</div>
                  <div className="text-xl font-black text-amber-900">
                    {daysRemaining === 0 ? 'Expires Today!' : `${daysRemaining} Days Remaining`}
                  </div>
                  <div className="text-[10px] text-slate-500">Fixed Expiry: {activePackage.expiryDate}</div>
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
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md"
              >
                Browse Packages & Buy
              </button>
            </div>
          )}
        </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
              <span>Client Payments & Receipts</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">AED Currency (Asia/Dubai)</span>
          </div>

          <div className="space-y-3">
            {clientPayments.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-6 text-center">No payment receipts found.</div>
            ) : (
              clientPayments.map((p) => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="font-black text-slate-900 text-base">{p.packageName}</span>
                      <div className="text-slate-500 font-mono text-[10px] sm:text-[11px] break-all mt-0.5">
                        Ref: {p.id} • {p.transactionReference}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                      <div className="text-lg font-black text-slate-900">{formatAED(p.amountPaidAED)}</div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {p.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 text-xs space-y-1">
                    <div><strong>Description:</strong> Personal training package with trainer {trainer?.fullName || 'Specialist'}. Valid for 30 calendar days.</div>
                    <div className="text-[11px] text-slate-500">Method: {p.paymentMethod} • Date: {p.paymentDate} (Asia/Dubai GST)</div>
                  </div>

                  <div className="flex justify-end pt-1">
                    {settings.clientPdfReceiptEnabled ? (
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
                    )}
                  </div>
                </div>
              ))
            )}
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-purple-300">
                {activeSubscription ? (
                  <span>
                    Next Auto-Deduction Date: <strong className="text-white">{activeSubscription.nextPaymentDate}</strong> (AED {activeSubscription.amountAED})
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
                            onClick={() => setDefaultSavedCard(clientId, card.id)}
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

      {/* Add Saved Card Modal */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Add New Saved Payment Card</h3>
                  <p className="text-[11px] text-slate-500">Stripe Vault 256-bit encryption • Dubai PTMS</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddCardModalOpen(false);
                  setAddCardError('');
                  setAgreeTermsAddCard(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addCardError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{addCardError}</span>
              </div>
            )}

            <form onSubmit={handleAddCardSubmit} className="space-y-4 text-xs">
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
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mt-2">
                <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs">Payment Terms & Conditions & Refund Policy</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Dubai PTMS
                  </span>
                </div>
                <div className="p-3 max-h-36 overflow-y-auto text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-line bg-white/70">
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
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
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
                  <span className="leading-snug">
                    I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiration and 12-hour session cancellation policy).
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Pay & Activate Plan</h3>
                  <p className="text-xs text-blue-200">Waiter Walk Fitness • Dubai, UAE</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayPendingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Summary */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                  DUE INVOICE
                </span>
                <h4 className="font-black text-slate-900 text-base mt-1">{selectedPendingPkg.packageName}</h4>
                <p className="text-xs text-slate-500">{selectedPendingPkg.totalSessions} Sessions • Strict 30-Day Expiry</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-slate-900">{formatAED(selectedPendingPkg.packagePriceAED)}</div>
                <div className="text-[10px] text-emerald-700 font-bold">Instant Activation</div>
              </div>
            </div>

            <form onSubmit={handlePayAndActivate} className="p-6 space-y-4">
              {payFeedbackMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
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
              <div className="space-y-3">
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
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
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
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
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
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Expires {sc.expiryMonth}/{sc.expiryYear} • {sc.cardHolder}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[11px] font-bold text-blue-600 flex items-center space-x-1">
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
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
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
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Real-Time Stripe Vault Payment:</span> Charge will be billed directly to your selected saved card through Stripe API without requiring card re-entry.
                    </div>
                  </div>
                )}

                {/* If new card is selected: show Stripe Elements */}
                {selectedPendingSavedCardId === 'NEW_CARD' && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
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

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Card numbers are tokenized directly via Stripe.js. Zero raw card data touches our servers.
                    </p>

                    <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paySaveDefaultCard}
                        onChange={(e) => setPaySaveDefaultCard(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-semibold text-slate-700">
                        Save card for future 1-click renewals & 30-day auto-pay
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Payment Terms & Conditions and Refund Policy Display */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-900 text-xs">Payment Terms & Conditions & Refund Policy</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Dubai PTMS
                  </span>
                </div>
                <div className="p-3 max-h-32 overflow-y-auto text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-line bg-white/70">
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
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={payAgreeTerms}
                    onChange={(e) => setPayAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                  />
                  <span className="leading-snug">
                    I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiry and 12-hour session cancellation rules).
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayPendingModalOpen(false);
                    setPayFeedbackMsg('');
                    setPayAgreeTerms(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay || !payAgreeTerms}
                  className={`font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors ${
                    isProcessingPay || !payAgreeTerms
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                >
                  {isProcessingPay ? (
                    <span className="flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Live Stripe Payment...</span>
                    </span>
                  ) : selectedPendingSavedCardId !== 'NEW_CARD' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatAED(selectedPendingPkg.packagePriceAED)} with Saved Card</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatAED(selectedPendingPkg.packagePriceAED)} & Activate Plan</span>
                    </>
                  )}
                </button>
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
    </div>
  );
};
