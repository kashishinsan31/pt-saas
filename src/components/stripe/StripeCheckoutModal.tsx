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
  const { purchasePackage, settings, addSavedCard, promoCodes, validatePromoCode, incrementPromoCodeUsage } = useApp();

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
  const [useStripeElements, setUseStripeElements] = useState(true);
  const [stripeCardReady, setStripeCardReady] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolder, setCardHolder] = useState(client.fullName);
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [simulateFailure] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  // Mount Stripe Elements card field
  useEffect(() => {
    if (!stripeInstance || !stripeContainerRef.current || !isOpen || !useStripeElements) return;

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
  }, [stripeInstance, isOpen, useStripeElements]);

  if (!isOpen) return null;

  // Detect Card Brand from card number digits
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^6(?:011|5)/.test(clean)) return 'Discover';
    return clean.length > 0 ? 'Visa' : 'Card';
  };

  const detectedBrand = getCardBrand(cardNumber);

  // Format Card Number input with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < raw.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += raw[i];
    }
    setCardNumber(formatted);
    setErrorMsg('');
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2, 4);
    }
    setExpiry(raw.slice(0, 5));
    setErrorMsg('');
  };

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

    let cardToken = '';
    let brand = detectedBrand;
    let last4Digits = '';
    let expMonthToSave = '';
    let expYearToSave = '';

    // If using Stripe Elements, tokenize securely via Stripe.js
    if (useStripeElements && stripeInstance && cardElementInstance) {
      try {
        const tokenResult = await stripeInstance.createToken(cardElementInstance, {
          name: (cardHolder || client.fullName).trim(),
        });

        if (tokenResult.error) {
          setIsProcessing(false);
          setErrorMsg(`Card Error: ${tokenResult.error.message}`);
          return;
        }

        if (tokenResult.token) {
          cardToken = tokenResult.token.id;
          const cardObj = tokenResult.token.card;
          if (cardObj) {
            brand = cardObj.brand ? (cardObj.brand.charAt(0).toUpperCase() + cardObj.brand.slice(1)) : 'Visa';
            last4Digits = cardObj.last4 || '••••';
            expMonthToSave = String(cardObj.exp_month || '12');
            expYearToSave = String(cardObj.exp_year || '2028');
          }
        }
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMsg(`Stripe tokenization error: ${err?.message || 'Failed to process card details.'}`);
        return;
      }
    } else {
      // Manual input validation
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 15) {
        setIsProcessing(false);
        setErrorMsg('Invalid Card Number: Please enter a valid 15 or 16 digit credit/debit card number.');
        return;
      }

      if (!expiry || !expiry.includes('/') || expiry.length < 5) {
        setIsProcessing(false);
        setErrorMsg('Invalid Expiry Date: Please enter MM/YY (e.g., 12/28).');
        return;
      }

      const [mmStr, yyStr] = expiry.split('/');
      const mm = parseInt(mmStr, 10);
      if (isNaN(mm) || mm < 1 || mm > 12) {
        setIsProcessing(false);
        setErrorMsg('Invalid Expiry Month: Month must be between 01 and 12.');
        return;
      }

      if (!cvc || cvc.length < 3) {
        setIsProcessing(false);
        setErrorMsg('Invalid Security Code: CVC / CVV must be 3 or 4 digits.');
        return;
      }

      brand = detectedBrand;
      last4Digits = cleanCard.length >= 4 ? cleanCard.slice(-4) : '••••';
      expMonthToSave = mmStr;
      expYearToSave = yyStr.length === 2 ? `20${yyStr}` : yyStr;
    }

    const cleanCard = cardNumber.replace(/\s+/g, '');
    const [expM, expY] = expiry.includes('/') ? expiry.split('/') : ['12', '28'];

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
      cardToken: customerIdToVault ? undefined : (cardToken || undefined),
      card: !cardToken && !customerIdToVault ? {
        number: cleanCard,
        expMonth: expM,
        expYear: expY,
        cvc: cvc.trim(),
        name: (cardHolder || client.fullName).trim(),
      } : undefined,
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
        last4: last4Digits || '••••',
        expiryMonth: expMonthToSave || '12',
        expiryYear: expYearToSave || '2028',
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
      { brand, last4: last4Digits || '••••' },
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header - Mode Aware */}
        <div className={`p-5 text-white flex items-center justify-between relative overflow-hidden ${
          isTestMode 
            ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-b border-indigo-800/60' 
            : 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 border-b border-blue-800/60'
        }`}>
          <div className="flex items-center space-x-3 relative z-10">
            <div className={`p-2.5 rounded-2xl ${isTestMode ? 'bg-indigo-600/30 border border-indigo-400/30 text-indigo-300' : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-400'}`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight">Stripe Secure Payment Gateway</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isTestMode
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-emerald-400 text-slate-950 border-emerald-300'
                }`}>
                  {isTestMode ? 'TEST MODE' : 'LIVE PRODUCTION'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Waiter Walk Fitness & Wellness LLC • Dubai, UAE</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 relative z-10"
            aria-label="Close stripe checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gateway Configuration Status Banner */}
        {!hasConfiguredKeys ? (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-amber-950 block">
                Stripe Gateway Not Configured ({isTestMode ? 'Test Sandbox Mode' : 'Live Production Mode'})
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {!isPubKeyValid && !isSecKeyValid
                  ? 'Both your Stripe Publishable Key (pk_...) and Secret Key (sk_...) are required.'
                  : !isPubKeyValid
                  ? 'Your Stripe Publishable Key (pk_...) is required to initialize Stripe Elements.'
                  : 'Your Stripe Secret Key (sk_...) is required to authorize transactions.'}
                {' '}Please configure in <strong>Admin Panel &gt; System Settings &gt; Stripe Payment Gateway</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/90 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 flex items-center justify-between">
            <span className="flex items-center space-x-1.5 font-bold text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Real-Time Stripe Gateway Connected • Live 256-bit Encrypted</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
              {isTestMode ? 'Stripe Sandbox' : 'Stripe Live'}
            </span>
          </div>
        )}

        {/* Itemized Order & Invoice Summary */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                Selected Package Invoice
              </span>
              <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{packageDef.name}</h4>
              <p className="text-xs text-slate-600 font-medium">
                {packageDef.sessionCount} Sessions ({packageDef.sessionDurationMinutes} min each) • {packageDef.trainingFrequency}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950">{formatAED(totalPayableAED)}</div>
              <span className="text-[11px] text-emerald-700 font-extrabold block">+5% UAE VAT Added Separately</span>
            </div>
          </div>

          {/* Promo Code & Discount Application Bar */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Apply Promo Code / Discount</span>
              {discountPercent > 0 && (
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  {discountPercent}% OFF APPLIED ({appliedPromoCode})
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Enter Promo Code (e.g. WELCOME10)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="flex-1 p-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-slate-50/60"
              />
              <button
                type="button"
                onClick={() => handleApplyPromoCode()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                Apply Code
              </button>
            </div>

            {promoSuccessMsg && <div className="text-[11px] font-bold text-emerald-700">{promoSuccessMsg}</div>}
            {promoError && <div className="text-[11px] font-bold text-red-600">{promoError}</div>}

            {promoCodes.filter((p) => p.status === 'Active').length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-bold self-center mr-1">Active Promos:</span>
                {promoCodes
                  .filter((p) => p.status === 'Active')
                  .slice(0, 4)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPromoCode(p.code)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold cursor-pointer transition-colors"
                    >
                      🏷️ {p.code} ({p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue} AED`} Off)
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Itemized Price & VAT Breakdown */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 uppercase">Package Base Price:</span>
              <span className="font-bold text-slate-900">{formatAED(basePriceAED)}</span>
            </div>

            {discountPercent > 0 && (
              <div className="flex items-center justify-between text-[11px] text-emerald-700">
                <span className="font-bold uppercase">Discount ({discountPercent}% Off):</span>
                <span className="font-extrabold">- {formatAED(discountAmountAED)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 font-bold text-slate-800">
              <span className="uppercase">Net Subtotal (excl. VAT):</span>
              <span>{formatAED(subtotalAED)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold">
              <span className="uppercase">5% UAE VAT (Added Separately):</span>
              <span>+ {formatAED(vatAmountAED)}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 font-black text-slate-950">
              <span className="uppercase">Total Amount Payable:</span>
              <span className="text-blue-700 text-sm">{formatAED(totalPayableAED)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Credits</div>
              <div className="font-black text-slate-900 text-sm">{packageDef.sessionCount} Sessions</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Start Date</div>
              <div className="font-bold text-slate-800">{startDate}</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-bold">{packageDef.validityDays || 30}-Day Expiry</div>
              <div className="font-bold text-amber-700">{expiryDate}</div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCheckout} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-3.5 flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-3.5 flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMsg}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
              placeholder="Full Name as shown on card"
            />
          </div>

          {/* Card Input Interface: Stripe Elements vs Manual Fields */}
          {useStripeElements && activePublishableKey && (activePublishableKey.startsWith('pk_live_') || activePublishableKey.startsWith('pk_test_')) ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Card Details (Stripe.js Protected)
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stripe PCI Encrypted</span>
                </span>
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

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span className="text-[10px] text-slate-400">Card tokenized directly by Stripe • Never touches server</span>
                <button
                  type="button"
                  onClick={() => setUseStripeElements(false)}
                  className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                >
                  Manual input mode
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Card Number
                  </label>
                  <div className="flex items-center space-x-2">
                    {activePublishableKey && (activePublishableKey.startsWith('pk_live_') || activePublishableKey.startsWith('pk_test_')) && (
                      <button
                        type="button"
                        onClick={() => setUseStripeElements(true)}
                        className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Use Stripe Elements
                      </button>
                    )}
                    <span className="text-[11px] font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      {detectedBrand}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required={!useStripeElements}
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white tracking-wider"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    required={!useStripeElements}
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-center bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required={!useStripeElements}
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    placeholder="CVC"
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-center bg-white"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <span className="font-bold">Notice for Direct Entry:</span> If submitting raw card numbers directly, your Stripe Dashboard must have "Process payments unsafely" enabled at{' '}
                <a
                  href="https://dashboard.stripe.com/settings/integration"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-amber-950"
                >
                  dashboard.stripe.com/settings/integration
                </a>
                .
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
            <span>Save card securely in Stripe Vault for future package renewals</span>
          </label>

          {/* Payment Terms & Conditions and Refund Policy */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Scale className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-slate-900 text-xs">Payment Terms & Conditions & Refund Policy</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                Dubai PTMS
              </span>
            </div>
            <div className="p-3 max-h-28 overflow-y-auto text-[11px] text-slate-600 font-sans leading-relaxed whitespace-pre-line bg-white/70">
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
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3">
            <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-semibold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => {
                  setTermsAgreed(e.target.checked);
                  setErrorMsg('');
                }}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
              />
              <span className="leading-snug">
                I have read and agree to the <strong className="text-blue-900">Payment Terms & Conditions</strong> and <strong className="text-blue-900">Refund Policy</strong> (including strict 30-day package expiration and 12-hour session cancellation policy).
              </span>
            </label>
          </div>

          {/* Mandatory Recurring Consent Checkbox */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Automatic Recurring 30-Day Subscription Authorization</span>
            </div>
            <label className="flex items-start space-x-2 cursor-pointer text-xs text-slate-700 leading-relaxed">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
              />
              <span>
                "I authorize Waiter Walk to automatically charge my saved payment card <strong>AED {totalPayableAED}</strong> every 30 days until I cancel my subscription. I understand that my package includes <strong>{packageDef.sessionCount}</strong> training sessions and expires after 30 days."
              </span>
            </label>
          </div>

          {/* Security Assurance */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>256-bit Stripe TLS Encrypted</span>
            </div>
            <span className="text-[10px] text-slate-400">FTA Tax Invoice Generated</span>
          </div>

          <button
            type="submit"
            disabled={!hasConfiguredKeys || isProcessing || !termsAgreed || (isRecurring && !consentChecked)}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl shadow-lg font-extrabold text-sm transition-all ${
              !hasConfiguredKeys || isProcessing || !termsAgreed || (isRecurring && !consentChecked)
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80 border border-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer focus:ring-4 focus:ring-blue-200'
            }`}
          >
            {!hasConfiguredKeys ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Configure Stripe API Keys in Settings to Pay</span>
              </>
            ) : isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Communicating with Stripe in Real-Time...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Pay {formatAED(totalPayableAED)} & Activate Package</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
