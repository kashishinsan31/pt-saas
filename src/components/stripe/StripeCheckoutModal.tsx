import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PackageDefinition, Client } from '../../types';
import { formatAED, calculateExpiryDate, formatDubaiDate } from '../../utils/dubaiTime';
import { processStripeApiCharge, getStripe, createStripeCustomer } from '../../services/stripeApi';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
  Scale,
  Sparkles,
  Zap,
  Info,
  Check,
  HelpCircle,
} from 'lucide-react';

interface StripeCheckoutModalProps {
  packageDef: PackageDefinition;
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (packageId: string) => void;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  packageDef,
  client,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { purchasePackage, settings, addSavedCard, savedCards, promoCodes, validatePromoCode, incrementPromoCodeUsage } = useApp();

  const clientSavedCards = savedCards.filter((c) => c.clientId === client.id);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>('NEW_CARD');

  const isTestMode = settings.stripeMode === 'test';
  const liveKey = (settings.stripeLiveSecretKey || '').trim();
  const testKey = (settings.stripeSecretKey || '').trim();
  const activeSecretKey = isTestMode ? (testKey || liveKey) : (liveKey || testKey);

  const livePubKey = (settings.stripeLivePublishableKey || settings.stripePublishableKey || '').trim();
  const testPubKey = (settings.stripePublishableKey || settings.stripeLivePublishableKey || '').trim();
  const activePublishableKey = isTestMode ? (testPubKey || livePubKey) : (livePubKey || testPubKey);

  const isSecKeyValid = Boolean(
    activeSecretKey && (
      activeSecretKey.startsWith('sk_test_') ||
      activeSecretKey.startsWith('sk_live_') ||
      activeSecretKey.startsWith('rk_test_') ||
      activeSecretKey.startsWith('rk_live_')
    )
  );

  const isPubKeyValid = Boolean(
    activePublishableKey && (
      activePublishableKey.startsWith('pk_test_') ||
      activePublishableKey.startsWith('pk_live_')
    )
  );

  const hasConfiguredKeys = isSecKeyValid && isPubKeyValid;

  const stripeContainerRef = useRef<HTMLDivElement>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [cardElementInstance, setCardElementInstance] = useState<any>(null);
  const [stripeCardReady, setStripeCardReady] = useState(false);

  const [cardHolder, setCardHolder] = useState(client.fullName);
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Default to primary saved card if available when modal opens
  useEffect(() => {
    if (isOpen) {
      if (clientSavedCards.length > 0) {
        const def = clientSavedCards.find((c) => c.isDefault) || clientSavedCards[0];
        setSelectedSavedCardId(def.id);
      } else {
        setSelectedSavedCardId('NEW_CARD');
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  // Initialize Stripe.js instance
  useEffect(() => {
    if (!isOpen || !activePublishableKey || (!activePublishableKey.startsWith('pk_live_') && !activePublishableKey.startsWith('pk_test_'))) {
      return;
    }

    let isMounted = true;
    getStripe(activePublishableKey).then((stripe) => {
      if (!isMounted || !stripe) return;
      setStripeInstance(stripe);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activePublishableKey]);

  // Mount Stripe Elements card field strictly when entering a new card
  useEffect(() => {
    if (!stripeInstance || !stripeContainerRef.current || !isOpen || selectedSavedCardId !== 'NEW_CARD') return;

    stripeContainerRef.current.innerHTML = '';
    const elements = stripeInstance.elements();
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

    card.mount(stripeContainerRef.current);
    card.on('ready', () => setStripeCardReady(true));
    card.on('change', (event: any) => {
      if (event.error) {
        setErrorMsg(event.error.message);
      } else {
        setErrorMsg('');
      }
    });

    setCardElementInstance(card);

    return () => {
      try {
        card.destroy();
      } catch (e) {
        // ignore
      }
      setStripeCardReady(false);
    };
  }, [stripeInstance, isOpen, selectedSavedCardId]);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!termsAgreed) {
      setErrorMsg('Agreement Required: Please tick the box to accept the Payment Terms & Conditions and Refund Policy.');
      return;
    }

    if (isRecurring && !consentChecked) {
      setErrorMsg('Consent Required: Please tick the authorization box for automatic 30-day recurring package renewals.');
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
      setIsProcessing(false);
      setErrorMsg(
        `Stripe Gateway Offline: Stripe API keys are not configured. To process real payments, your Administrator must enter the Stripe Secret Key (${isTestMode ? 'sk_test_...' : 'sk_live_...'}) in Admin Panel > System Settings > Stripe Gateway, or configure VITE_STRIPE_SECRET_KEY on Netlify.`
      );
      return;
    }

    setIsProcessing(true);

    // 1. If paying with a Selected Saved Card (PCI Vaulted)
    if (selectedSavedCardId !== 'NEW_CARD') {
      const selectedCard = clientSavedCards.find((c) => c.id === selectedSavedCardId);
      if (!selectedCard) {
        setIsProcessing(false);
        setErrorMsg('Selected saved card could not be found. Please select a valid card or enter a new card.');
        return;
      }

      let customerIdToVault = selectedCard.stripeCustomerId || client.stripeCustomerId;
      const cardTokenToUse = selectedCard.stripeToken;

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
        amountAED: totalPayableAED,
        description: `${packageDef.name} for ${client.fullName} (Saved Card ${selectedCard.brand} ending in ${selectedCard.last4}) - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? undefined : (cardTokenToUse || (isTestMode ? 'tok_visa' : undefined)),
      });

      if (!stripeRes.success) {
        setIsProcessing(false);
        setErrorMsg(`Stripe Gateway Error: ${stripeRes.message}`);
        return;
      }

      const realChargeId = stripeRes.stripeChargeId || '';
      const dashboardNotice = ` • Reflected Live in Stripe Dashboard! (Charge ID: ${realChargeId})`;

      const res = purchasePackage(
        client.id,
        packageDef.id,
        'Stripe',
        isRecurring,
        { brand: selectedCard.brand, last4: selectedCard.last4 },
        consentChecked,
        realChargeId,
        {
          discountCode: appliedPromoCode,
          discountAmountAED,
          vatAmountAED,
          totalAmountAED: totalPayableAED,
        },
        undefined,
        undefined,
        undefined,
        undefined,
        customerIdToVault
      );

      setIsProcessing(false);

      if (res.success) {
        if (appliedPromoCode && appliedPromoCode !== 'PACKAGE_DISCOUNT') {
          incrementPromoCodeUsage(appliedPromoCode);
        }
        setSuccessMsg(`Payment Authorized with Saved Card! ${res.message}${dashboardNotice}`);
        setTimeout(() => {
          if (res.packageId && onSuccess) {
            onSuccess(res.packageId);
          }
          onClose();
        }, 2000);
      } else {
        setErrorMsg(res.message);
      }
      return;
    }

    // 2. Paying with New Card: 100% Stripe.js Protection
    if (!stripeInstance || !cardElementInstance) {
      setIsProcessing(false);
      setErrorMsg('Stripe Secure Elements is still initializing. Please wait a moment.');
      return;
    }

    try {
      const tokenResult = await stripeInstance.createToken(cardElementInstance, {
        name: (cardHolder || client.fullName).trim(),
      });

      if (tokenResult.error) {
        setIsProcessing(false);
        setErrorMsg(`Card Error: ${tokenResult.error.message}`);
        return;
      }

      if (!tokenResult.token) {
        setIsProcessing(false);
        setErrorMsg('Stripe tokenization failed. Please check your card details.');
        return;
      }

      const cardToken = tokenResult.token.id;
      const cardObj = tokenResult.token.card;
      const brand = cardObj?.brand ? (cardObj.brand.charAt(0).toUpperCase() + cardObj.brand.slice(1)) : 'Visa';
      const last4Digits = cardObj?.last4 || '••••';
      const expMonthToSave = String(cardObj?.exp_month || '12');
      const expYearToSave = String(cardObj?.exp_year || '2028');

      // If client requested auto-pay or card saving, vault card to permanent Stripe Customer
      let customerIdToVault = client.stripeCustomerId;
      if (isSecKeyValid && cardToken && (saveCardForFuture || isRecurring)) {
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
          console.warn('Customer vaulting notice:', e);
        }
      }

      const stripeRes = await processStripeApiCharge({
        secretKey: activeSecretKey,
        amountAED: totalPayableAED,
        description: `${packageDef.name} for ${client.fullName} - Waiter Walk Dubai`,
        statementDescriptor: settings.stripeStatementDescriptor || 'WAITER WALK DUBAI',
        receiptEmail: client.email,
        customerId: customerIdToVault || undefined,
        cardToken: customerIdToVault ? undefined : cardToken,
      });

      if (!stripeRes.success) {
        setIsProcessing(false);
        setErrorMsg(`Stripe Gateway Error: ${stripeRes.message}`);
        return;
      }

      const realChargeId = stripeRes.stripeChargeId || '';
      const dashboardNotice = ` • Reflected Live in Stripe Dashboard! (Charge ID: ${realChargeId})`;

      // Save card to savedCards wallet if requested with vaulted Stripe customer link
      if (saveCardForFuture) {
        addSavedCard(client.id, {
          cardHolder: cardHolder || client.fullName,
          brand,
          last4: last4Digits,
          expiryMonth: expMonthToSave,
          expiryYear: expYearToSave,
          isDefault: true,
          stripeCustomerId: customerIdToVault,
          stripeToken: cardToken,
        });
      }

      // Execute package purchase transaction in App Context with real charge ID, vaulted customer, and discount breakdown
      const res = purchasePackage(
        client.id,
        packageDef.id,
        'Stripe',
        isRecurring,
        { brand, last4: last4Digits },
        consentChecked,
        realChargeId,
        {
          discountCode: appliedPromoCode,
          discountAmountAED,
          vatAmountAED,
          totalAmountAED: totalPayableAED,
        },
        undefined,
        undefined,
        undefined,
        undefined,
        customerIdToVault
      );

      setIsProcessing(false);

      if (res.success) {
        if (appliedPromoCode && appliedPromoCode !== 'PACKAGE_DISCOUNT') {
          incrementPromoCodeUsage(appliedPromoCode);
        }
        setSuccessMsg(`Payment Authorized! ${res.message}${dashboardNotice}`);
        setTimeout(() => {
          if (res.packageId && onSuccess) {
            onSuccess(res.packageId);
          }
          onClose();
        }, 2000);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(`Payment processing error: ${err?.message || 'Failed to process card details.'}`);
    }
  };

  const [discountPercent, setDiscountPercent] = useState<number>(packageDef.discountPercentage || 0);
  const [discountAmountAED, setDiscountAmountAED] = useState<number>(
    packageDef.discountPercentage
      ? Math.round((packageDef.priceAED * packageDef.discountPercentage) / 100)
      : 0
  );
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>(
    packageDef.discountPercentage ? 'PACKAGE_DISCOUNT' : ''
  );
  const [promoInput, setPromoInput] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>('');

  const handleApplyPromoCode = (explicitCode?: string) => {
    const code = (explicitCode || promoInput).trim().toUpperCase();
    setPromoError('');
    setPromoSuccessMsg('');
    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }

    const validation = validatePromoCode(code, packageDef.priceAED, packageDef.id);
    if (validation.isValid) {
      setDiscountPercent(validation.discountPercent || 0);
      setDiscountAmountAED(validation.discountAmountAED);
      setAppliedPromoCode(code);
      setPromoInput(code);
      setPromoSuccessMsg(
        `Code ${code} applied: ${validation.discountPercent ? `${validation.discountPercent}% Off` : ''} (-${formatAED(validation.discountAmountAED)})`
      );
    } else {
      setPromoError(validation.errorMessage || 'Invalid or expired promo code');
    }
  };

  const startDate = formatDubaiDate(new Date());
  const expiryDate = calculateExpiryDate(startDate, packageDef.validityDays || 30);

  // Financial Breakdown: Base Price (excl VAT) - Discount + 5% UAE VAT added separately
  const basePriceAED = packageDef.priceAED;
  const subtotalAED = Math.max(0, basePriceAED - discountAmountAED);
  const vatAmountAED = Math.round(subtotalAED * 0.05 * 100) / 100;
  const totalPayableAED = subtotalAED + vatAmountAED;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header - Mode Aware with Little Close Button on Right Top */}
        <div className={`px-4 py-3 sm:px-5 sm:py-3.5 text-white flex items-center justify-between shrink-0 select-none relative overflow-hidden ${
          isTestMode 
            ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-b border-indigo-800/60' 
            : 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 border-b border-blue-800/60'
        }`}>
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2 relative z-10">
            <div className={`p-2 rounded-xl shrink-0 ${isTestMode ? 'bg-indigo-600/30 border border-indigo-400/30 text-indigo-300' : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-400'}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">Stripe Secure Checkout</h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  isTestMode
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-emerald-400 text-slate-950 border-emerald-300'
                }`}>
                  {isTestMode ? 'TEST MODE' : 'LIVE PRODUCTION'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">Waiter Walk Fitness • Dubai, UAE</p>
            </div>
          </div>

          {/* Little Close Button on the Right Top */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white transition-all cursor-pointer shrink-0 border border-white/20 shadow-xs flex items-center justify-center ml-2 relative z-10"
            aria-label="Close stripe checkout"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gateway Configuration Status Banner */}
        {!hasConfiguredKeys ? (
          <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs text-amber-900 flex items-start space-x-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-extrabold text-amber-950 block text-[11px] sm:text-xs">
                Stripe Gateway Not Configured ({isTestMode ? 'Test Mode' : 'Live Mode'})
              </span>
              <p className="text-[10px] sm:text-[11px] text-amber-800 leading-relaxed">
                Configure API keys in <strong>Admin Panel &gt; System Settings &gt; Stripe Gateway</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/90 border-b border-emerald-200 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs text-emerald-900 flex items-center justify-between shrink-0">
            <span className="flex items-center space-x-1.5 font-bold text-[10px] sm:text-[11px] text-emerald-800 truncate pr-2">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Stripe Real-Time Gateway • 256-bit Encrypted</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold shrink-0">
              {isTestMode ? 'Sandbox' : 'Live'}
            </span>
          </div>
        )}

        {/* Form Body - Unified Responsive Scroll Area */}
        <form onSubmit={handleCheckout} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-start space-x-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-bold">{successMsg}</div>
              </div>
            )}

            {/* Itemized Order & Invoice Summary Box */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-blue-700 tracking-wider bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                    Selected Package
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-1 truncate">{packageDef.name}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                    {packageDef.sessionCount} Sessions • {packageDef.sessionDurationMinutes} min each
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-2xl font-black text-slate-950">{formatAED(totalPayableAED)}</div>
                  <span className="text-[10px] sm:text-[11px] text-emerald-700 font-extrabold block">+5% UAE VAT Included</span>
                </div>
              </div>

              {/* Promo Code & Discount Application Bar */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] sm:text-[11px]">Promo Code</span>
                  {discountPercent > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      {discountPercent}% OFF APPLIED
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. WELCOME10"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 p-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-slate-50/60 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromoCode()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {promoSuccessMsg && <div className="text-[11px] font-bold text-emerald-700">{promoSuccessMsg}</div>}
                {promoError && <div className="text-[11px] font-bold text-red-600">{promoError}</div>}

                {promoCodes.filter((p) => p.status === 'Active').length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 font-bold self-center mr-1">Active:</span>
                    {promoCodes
                      .filter((p) => p.status === 'Active')
                      .slice(0, 3)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPromoCode(p.code)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold cursor-pointer transition-colors"
                        >
                          🏷️ {p.code} ({p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue} AED`})
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Itemized Price & VAT Breakdown */}
              <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 uppercase">Base Price:</span>
                  <span className="font-bold text-slate-900">{formatAED(basePriceAED)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700">
                    <span className="font-bold uppercase">Discount ({discountPercent}%):</span>
                    <span className="font-extrabold">- {formatAED(discountAmountAED)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 font-bold text-slate-800">
                  <span className="uppercase">Net Subtotal:</span>
                  <span>{formatAED(subtotalAED)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold">
                  <span className="uppercase">5% UAE VAT:</span>
                  <span>+ {formatAED(vatAmountAED)}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 font-black text-slate-950">
                  <span className="uppercase">Total Amount Payable:</span>
                  <span className="text-blue-700 text-sm font-black">{formatAED(totalPayableAED)}</span>
                </div>
              </div>

              {/* 3 Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Credits</div>
                  <div className="font-black text-slate-900 text-xs sm:text-sm">{packageDef.sessionCount} Sessions</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Starts</div>
                  <div className="font-bold text-slate-800 text-[11px] sm:text-xs truncate">{startDate}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">{packageDef.validityDays || 30}-Day Expiry</div>
                  <div className="font-bold text-amber-700 text-[11px] sm:text-xs truncate">{expiryDate}</div>
                </div>
              </div>
            </div>

            {/* Payment Card Selection: Saved Cards vs New Card with Stripe.js */}
            {clientSavedCards.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Payment Method
                </label>
                <div className="space-y-2">
                  {clientSavedCards.map((sc) => {
                    const isSelected = selectedSavedCardId === sc.id;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setSelectedSavedCardId(sc.id);
                          setErrorMsg('');
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/25 shadow-xs'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs">{sc.brand}</span>
                              <span className="font-mono text-xs text-slate-700 font-bold">•••• {sc.last4}</span>
                              {sc.isDefault && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                              {sc.cardHolder} • Exp {sc.expiryMonth}/{sc.expiryYear}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 flex items-center space-x-1 shrink-0 bg-blue-100/70 px-2 py-0.5 rounded-md">
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                            <span>Selected</span>
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Option to use a new card */}
                  <div
                    onClick={() => {
                      setSelectedSavedCardId('NEW_CARD');
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedSavedCardId === 'NEW_CARD'
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/25 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 sm:space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selectedSavedCardId === 'NEW_CARD' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedSavedCardId === 'NEW_CARD' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Use a new credit or debit card</span>
                      </div>
                    </div>

                    {selectedSavedCardId === 'NEW_CARD' && (
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 flex items-center space-x-1 shrink-0 bg-blue-100/70 px-2 py-0.5 rounded-md">
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                        <span>Selected</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* If a saved card is selected, show saved card confirmation notice */}
            {selectedSavedCardId !== 'NEW_CARD' ? (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-950 font-medium">
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">
                    Paying with saved <strong>{clientSavedCards.find((c) => c.id === selectedSavedCardId)?.brand}</strong> (•••• {clientSavedCards.find((c) => c.id === selectedSavedCardId)?.last4})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold shrink-0">
                  PCI Vaulted
                </span>
              </div>
            ) : (
              /* If entering a new card, strictly use Stripe.js Elements */
              <div className="space-y-2.5 sm:space-y-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    New Card Details (Stripe.js Protected)
                  </label>
                  <span className="text-[9px] sm:text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>PCI Encrypted</span>
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                    placeholder="Full Name as shown on card"
                  />
                </div>

                <div className="p-3 border border-slate-300 rounded-xl bg-white shadow-2xs focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 min-h-[46px]">
                  <div ref={stripeContainerRef} id="stripe-card-element" className="w-full" />
                  {!stripeCardReady && (
                    <div className="text-slate-400 text-xs py-1 flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Connecting to Stripe Secure Elements...</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Card data is tokenized directly inside Stripe's secure iframe.</span>
                </div>
              </div>
            )}

            <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={saveCardForFuture}
                onChange={(e) => setSaveCardForFuture(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
              />
              <span className="text-[11px] sm:text-xs">Save card securely in Stripe Vault for future package renewals</span>
            </label>

            {/* Payment Terms & Conditions and Refund Policy */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-extrabold text-slate-900 text-[11px] sm:text-xs">Payment Terms & Refund Policy</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Dubai PTMS
                </span>
              </div>
              <div className="p-2.5 sm:p-3 max-h-24 sm:max-h-28 overflow-y-auto text-[10px] sm:text-[11px] text-slate-600 font-sans leading-relaxed whitespace-pre-line bg-white/70">
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

            {/* Option to tick to agree to the terms & conditions */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 sm:p-3">
              <label className="flex items-start space-x-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => {
                    setTermsAgreed(e.target.checked);
                    setErrorMsg('');
                  }}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                />
                <span className="leading-snug text-[11px] sm:text-xs">
                  I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiry and 12-hour cancellation rules).
                </span>
              </label>
            </div>

            {/* Mandatory Recurring Consent Checkbox */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 sm:p-3 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-[11px] sm:text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Automatic Recurring 30-Day Subscription Authorization</span>
              </div>
              <label className="flex items-start space-x-2 cursor-pointer text-[10px] sm:text-[11px] text-slate-700 leading-relaxed">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                />
                <span>
                  "I authorize Waiter Walk to automatically charge my saved payment card <strong>AED {totalPayableAED}</strong> every 30 days until I cancel my subscription. Package includes <strong>{packageDef.sessionCount}</strong> sessions with strict 30-day expiry."
                </span>
              </label>
            </div>
          </div>

          {/* Sticky Bottom Action Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-3.5 py-2.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2 shrink-0 z-10 shadow-xs">
            <div className="text-left hidden xs:block sm:block">
              <span className="text-[9px] text-slate-400 uppercase font-bold block leading-none">Total Due</span>
              <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">{formatAED(totalPayableAED)}</span>
            </div>
            <div className="flex items-center space-x-2 w-full xs:w-auto sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!hasConfiguredKeys || isProcessing || !termsAgreed || (isRecurring && !consentChecked)}
                className={`flex-1 xs:flex-initial sm:flex-initial flex items-center justify-center space-x-1.5 py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl shadow-md font-extrabold text-xs sm:text-sm transition-all ${
                  !hasConfiguredKeys || isProcessing || !termsAgreed || (isRecurring && !consentChecked)
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80 border border-slate-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer focus:ring-4 focus:ring-blue-200'
                }`}
              >
                {!hasConfiguredKeys ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Configure API Keys</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Pay {formatAED(totalPayableAED)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
