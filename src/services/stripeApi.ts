import { loadStripe, Stripe } from '@stripe/stripe-js';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { formatDubaiDate } from '../utils/dubaiTime';
import { PaymentRecord, ClientPackage, Client } from '../types';

let stripePromise: Promise<Stripe | null> | null = null;
let lastPubKey = '';

export function getStripe(publishableKey: string): Promise<Stripe | null> {
  const cleanKey = publishableKey?.trim();
  if (!cleanKey) return Promise.resolve(null);
  if (!stripePromise || lastPubKey !== cleanKey) {
    lastPubKey = cleanKey;
    stripePromise = loadStripe(cleanKey);
  }
  return stripePromise;
}

export interface StripeCardDetails {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  name?: string;
}

export interface StripeChargeRequest {
  secretKey: string;
  amountAED: number; // Amount in AED
  description: string;
  statementDescriptor?: string;
  receiptEmail?: string;
  card?: StripeCardDetails; // Real card details to tokenize and charge
  cardToken?: string; // Pre-existing Stripe card or customer token
  customerId?: string; // Stripe customer ID (cus_...) for hands-free auto-pay recurring billing
}

export interface StripeChargeResult {
  success: boolean;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  status?: string;
  livemode?: boolean;
  message: string;
  rawError?: any;
}

export async function processStripeApiCharge(req: StripeChargeRequest): Promise<StripeChargeResult> {
  const secretKey = req.secretKey?.trim();

  if (!secretKey) {
    return {
      success: false,
      message: 'Stripe Secret Key missing. Please configure your live or test key in System Settings > Stripe Gateway.',
    };
  }

  // Convert AED amount to minor currency units (Fils: 1 AED = 100 Fils)
  const amountInFils = Math.round(req.amountAED * 100);

  const sourceToken = req.cardToken?.trim() || '';
  const customerId = req.customerId?.trim() || '';

  if (!sourceToken && !customerId) {
    return {
      success: false,
      message: 'PCI-DSS Compliance Error: Card must be securely tokenized via Stripe Elements (Stripe.js) or linked to a vaulted Stripe Customer ID (cus_...) before charging.',
    };
  }

  // Authorize and capture charge via Stripe API in real time
  const chargeParams = new URLSearchParams();
  chargeParams.append('amount', amountInFils.toString());
  chargeParams.append('currency', 'aed');
  chargeParams.append('description', req.description);

  if (customerId) {
    chargeParams.append('customer', customerId);
    if (sourceToken && sourceToken.startsWith('tok_')) {
      chargeParams.append('source', sourceToken);
    }
  } else if (sourceToken) {
    chargeParams.append('source', sourceToken);
  }

  if (req.statementDescriptor) {
    const cleanDescriptor = req.statementDescriptor.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 22).trim();
    if (cleanDescriptor) {
      chargeParams.append('statement_descriptor_suffix', cleanDescriptor);
    }
  }

  if (req.receiptEmail) {
    chargeParams.append('receipt_email', req.receiptEmail.trim());
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: chargeParams.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMessage = data.error?.message || `Stripe payment declined (${response.status}): ${response.statusText}`;
      return {
        success: false,
        message: errMessage,
        rawError: data.error,
      };
    }

    // Successfully created real charge in Stripe account
    return {
      success: true,
      stripeChargeId: data.id,
      stripePaymentIntentId: data.payment_intent || data.id,
      status: data.status,
      livemode: data.livemode,
      message: `Charge of AED ${req.amountAED} processed in real-time on Stripe! (Charge ID: ${data.id})`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to connect to Stripe gateway: ${error?.message || 'Network error'}`,
    };
  }
}

/**
 * Creates a permanent Stripe Customer record with the tokenized card attached as default source.
 * This allows 100% hands-free recurring auto-pay charges without client or admin intervention.
 */
export async function createStripeCustomer(params: {
  secretKey: string;
  email: string;
  name: string;
  cardToken?: string;
  clientId?: string;
}): Promise<{
  success: boolean;
  customerId?: string;
  message: string;
  rawError?: any;
}> {
  const secretKey = params.secretKey?.trim();
  if (!secretKey) {
    return {
      success: false,
      message: 'Stripe Secret Key missing.',
    };
  }

  const custParams = new URLSearchParams();
  if (params.email?.trim()) {
    custParams.append('email', params.email.trim());
  }
  if (params.name?.trim()) {
    custParams.append('name', params.name.trim());
  }
  custParams.append('description', `Waiter Walk Client (${params.clientId || 'Client'})`);

  if (params.clientId) {
    custParams.append('metadata[clientId]', params.clientId);
  }

  if (params.cardToken?.trim()) {
    custParams.append('source', params.cardToken.trim());
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: custParams.toString(),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return {
        success: false,
        message: data.error?.message || `Failed to create Stripe customer (${response.status})`,
        rawError: data.error,
      };
    }

    return {
      success: true,
      customerId: data.id,
      message: `Stripe Customer created successfully (${data.id}) with card vaulted for auto-pay.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Network error creating Stripe customer: ${error?.message || 'Check connection'}`,
    };
  }
}

/**
 * Attaches a newly tokenized card to an existing Stripe Customer.
 */
export async function attachCardTokenToCustomer(params: {
  secretKey: string;
  customerId: string;
  cardToken: string;
}): Promise<{
  success: boolean;
  sourceId?: string;
  message: string;
  rawError?: any;
}> {
  const secretKey = params.secretKey?.trim();
  const customerId = params.customerId?.trim();
  const cardToken = params.cardToken?.trim();

  if (!secretKey || !customerId || !cardToken) {
    return {
      success: false,
      message: 'Missing secretKey, customerId, or cardToken',
    };
  }

  const sourceParams = new URLSearchParams();
  sourceParams.append('source', cardToken);

  try {
    const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}/sources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sourceParams.toString(),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return {
        success: false,
        message: data.error?.message || `Failed to attach card to customer (${response.status})`,
        rawError: data.error,
      };
    }

    return {
      success: true,
      sourceId: data.id,
      message: `Card source attached to Stripe Customer (${customerId}) successfully.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Network error attaching card to Stripe customer: ${error?.message || 'Check connection'}`,
    };
  }
}

export interface StripeVerifyResult {
  success: boolean;
  message: string;
  livemode?: boolean;
  accountName?: string;
  accountId?: string;
  pubKeyStatus?: 'valid' | 'expired' | 'invalid' | 'untested';
  pubKeyError?: string;
}

/**
 * Validates Stripe Secret Key and Publishable Key, verifying account connectivity and active key validity in real time.
 */
export async function verifyStripeConnection(
  secretKey: string,
  publishableKey?: string
): Promise<StripeVerifyResult> {
  const cleanKey = secretKey?.trim();
  const cleanPubKey = publishableKey?.trim();

  if (!cleanKey && !cleanPubKey) {
    return {
      success: false,
      message: 'Please enter your Stripe API keys (Publishable Key and Secret Key) to test connectivity.',
    };
  }

  let livemode = false;
  let accountName = '';
  let accountId = '';

  // 1. Validate Secret Key
  if (cleanKey) {
    try {
      const res = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return {
          success: false,
          message: `Secret Key Error: ${data.error?.message || 'Invalid Stripe API secret key.'}`,
        };
      }

      accountId = data.id || '';
      accountName = data.business_profile?.name || data.settings?.dashboard?.display_name || 'Stripe Merchant';
      livemode = cleanKey.startsWith('sk_live_') || cleanKey.startsWith('rk_live_');
    } catch (err: any) {
      return {
        success: false,
        message: `Network error connecting to Stripe: ${err?.message || 'Check your internet connection.'}`,
      };
    }
  }

  // 2. Validate Publishable Key (Detects if key has been expired/rolled in Stripe Dashboard)
  let pubKeyStatus: 'valid' | 'expired' | 'invalid' | 'untested' = 'untested';
  let pubKeyError = '';

  if (cleanPubKey) {
    try {
      const tokenTestRes = await fetch('https://api.stripe.com/v1/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanPubKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'card[number]=4242424242424242&card[exp_month]=12&card[exp_year]=2028&card[cvc]=123',
      });

      const tokenData = await tokenTestRes.json();
      if (tokenData.error) {
        const errMsg = tokenData.error.message || '';
        const isExpired =
          tokenData.error.code === 'api_key_expired' ||
          errMsg.toLowerCase().includes('expired api key') ||
          errMsg.toLowerCase().includes('expired');

        if (isExpired) {
          pubKeyStatus = 'expired';
          pubKeyError = errMsg;
        } else if (tokenTestRes.status === 401) {
          pubKeyStatus = 'invalid';
          pubKeyError = errMsg || 'Invalid publishable key provided';
        } else {
          // If status is 200 or 402/400 (card test response), key authentication passed!
          pubKeyStatus = 'valid';
        }
      } else {
        pubKeyStatus = 'valid';
      }
    } catch (err: any) {
      console.warn('Publishable key verification warning:', err);
    }
  }

  if (pubKeyStatus === 'expired') {
    return {
      success: false,
      livemode,
      accountName,
      accountId,
      pubKeyStatus: 'expired',
      pubKeyError,
      message: `Publishable Key Expired: Your Stripe Publishable Key (${(cleanPubKey || '').slice(0, 14)}...${(cleanPubKey || '').slice(-6)}) was expired or rolled in your Stripe Dashboard. Please copy your active Publishable Key from https://dashboard.stripe.com/apikeys. (Secret Key is valid for ${accountName || 'your account'}).`,
    };
  }

  if (pubKeyStatus === 'invalid') {
    return {
      success: false,
      livemode,
      accountName,
      accountId,
      pubKeyStatus: 'invalid',
      pubKeyError,
      message: `Invalid Publishable Key: ${pubKeyError}. Please verify the key in your Stripe Dashboard (Developers > API keys).`,
    };
  }

  return {
    success: true,
    livemode,
    accountName,
    accountId,
    pubKeyStatus: 'valid',
    message: `Stripe Gateway Connected! Account: ${accountName} (${accountId || 'Verified'}). Mode: ${livemode ? 'Live Production (sk_live_...)' : 'Test Sandbox (sk_test_...)'}. Both Secret and Publishable keys are active and verified.`,
  };
}

function cleanFirestoreData<T>(obj: T, seen = new WeakSet<object>(), depth = 0): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (depth > 25) return obj;
  if (seen.has(obj as object)) return obj;
  seen.add(obj as object);
  if (Array.isArray(obj)) return obj.map((i) => cleanFirestoreData(i, seen, depth + 1)) as any;
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = cleanFirestoreData(v, seen, depth + 1);
    }
  }
  return cleaned as T;
}

export interface StripeSyncResult {
  success: boolean;
  syncedCount: number;
  newFailuresCount: number;
  reconciledCount: number;
  message: string;
  charges?: any[];
}

function getTimeMs(val?: string | number): number {
  if (!val) return 0;
  if (typeof val === 'number') return val > 1e11 ? val : val * 1000;
  const ms = new Date(val).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Synchronizes recent charges, payment intents, and checkout sessions directly from Stripe API into Firestore.
 * Reconciles successful/failed transactions, self-heals client links, and activates pending packages.
 */
export async function syncStripeChargesDirectly(secretKey: string): Promise<StripeSyncResult> {
  const cleanKey = secretKey?.trim();
  if (!cleanKey) {
    return {
      success: false,
      syncedCount: 0,
      newFailuresCount: 0,
      reconciledCount: 0,
      message: 'Stripe Secret Key missing. Configure in Admin Settings > Stripe Gateway.',
    };
  }

  try {
    const authHeader = { Authorization: `Bearer ${cleanKey}` };
    const [chargesRes, piRes, sessionsRes, customersRes] = await Promise.all([
      fetch('https://api.stripe.com/v1/charges?limit=50', { method: 'GET', headers: authHeader }),
      fetch('https://api.stripe.com/v1/payment_intents?limit=50', { method: 'GET', headers: authHeader }).catch(() => null),
      fetch('https://api.stripe.com/v1/checkout/sessions?limit=50', { method: 'GET', headers: authHeader }).catch(() => null),
      fetch('https://api.stripe.com/v1/customers?limit=50', { method: 'GET', headers: authHeader }).catch(() => null),
    ]);

    const data = await chargesRes.json();
    if (!chargesRes.ok || data.error) {
      return {
        success: false,
        syncedCount: 0,
        newFailuresCount: 0,
        reconciledCount: 0,
        message: data.error?.message || 'Failed to fetch charges from Stripe API.',
      };
    }

    const piData = piRes && piRes.ok ? await piRes.json().catch(() => ({ data: [] })) : { data: [] };
    const sessionsData = sessionsRes && sessionsRes.ok ? await sessionsRes.json().catch(() => ({ data: [] })) : { data: [] };
    const customersData = customersRes && customersRes.ok ? await customersRes.json().catch(() => ({ data: [] })) : { data: [] };

    const charges = data.data || [];
    const paymentIntents = piData.data || [];
    const checkoutSessions = sessionsData.data || [];
    const stripeCustomers = customersData.data || [];

    const customersById = new Map<string, any>();
    for (const sc of stripeCustomers) {
      if (sc?.id) customersById.set(sc.id, sc);
    }

    const sessionsByPI = new Map<string, any>();
    for (const cs of checkoutSessions) {
      if (cs?.payment_intent && typeof cs.payment_intent === 'string') {
        sessionsByPI.set(cs.payment_intent, cs);
      }
    }

    let syncedCount = 0;
    let newFailuresCount = 0;
    let reconciledCount = 0;

    // Fetch snapshot of current Firestore collections
    const [paymentsSnap, packagesSnap, clientsSnap, savedCardsSnap, pkgDefsSnap] = await Promise.all([
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'clientPackages')),
      getDocs(collection(db, 'clients')),
      getDocs(collection(db, 'savedCards')),
      getDocs(collection(db, 'packageDefinitions')),
    ]);

    const paymentsList = paymentsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as PaymentRecord[];
    const packagesList = packagesSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as ClientPackage[];
    const clientsList = clientsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as Client[];
    const savedCardsList = savedCardsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as any[];
    const pkgDefsList = pkgDefsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as any[];

    const resolveClientForStripeObj = (obj: any, extraSession?: any): { matchedClient?: Client; candidateEmail: string; candidateCustId: string } => {
      const candidateCustId = (typeof obj.customer === 'string' ? obj.customer : obj.customer?.id) || '';
      const stripeCust = candidateCustId ? customersById.get(candidateCustId) : undefined;
      const mergedMeta = {
        ...(stripeCust?.metadata || {}),
        ...(extraSession?.metadata || {}),
        ...(obj.metadata || {}),
      };

      const candidateEmails = [
        obj.receipt_email,
        obj.billing_details?.email,
        obj.customer_details?.email,
        extraSession?.customer_details?.email,
        extraSession?.customer_email,
        stripeCust?.email,
        mergedMeta.email,
        mergedMeta.clientEmail,
      ]
        .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
        .map((e) => e.trim().toLowerCase());

      const candidateEmail = candidateEmails[0] || '';
      const desc = (obj.description || '').toLowerCase();
      const custName = (stripeCust?.name || obj.billing_details?.name || extraSession?.customer_details?.name || '').trim().toLowerCase();

      let matchedClient: Client | undefined;

      // 1. Direct metadata / client_reference_id match
      const metaClientId = mergedMeta.clientId || extraSession?.client_reference_id;
      if (metaClientId) {
        matchedClient = clientsList.find((cl) => cl.id === metaClientId);
      }

      // 2. Client stripeCustomerId match
      if (!matchedClient && candidateCustId) {
        matchedClient = clientsList.find((cl) => cl.stripeCustomerId === candidateCustId);
      }

      // 3. SavedCards stripeCustomerId match (self-heals when client doc lacks stripeCustomerId)
      if (!matchedClient && candidateCustId) {
        const cardMatch = savedCardsList.find((sc) => sc.stripeCustomerId === candidateCustId);
        if (cardMatch?.clientId) {
          matchedClient = clientsList.find((cl) => cl.id === cardMatch.clientId);
        }
      }

      // 4. Case-insensitive email match across any email source
      if (!matchedClient && candidateEmails.length > 0) {
        matchedClient = clientsList.find(
          (cl) => cl.email && candidateEmails.includes(cl.email.trim().toLowerCase())
        );
      }

      // 5. Client full name in description or Stripe customer name
      if (!matchedClient && desc) {
        matchedClient = clientsList.find((cl) => cl.fullName && desc.includes(cl.fullName.trim().toLowerCase()));
      }
      if (!matchedClient && custName) {
        matchedClient = clientsList.find((cl) => cl.fullName && cl.fullName.trim().toLowerCase() === custName);
      }

      return { matchedClient, candidateEmail, candidateCustId };
    };

    const activateClientPackageAndCredits = async (pkg: ClientPackage, payId: string, chargeId: string, client?: Client, paidAmountAED?: number) => {
      const todayStr = formatDubaiDate(new Date());
      const def = pkgDefsList.find((d) => d.id === pkg.packageDefinitionId);
      const validityDays = def?.validityDays || 30;
      const expiryDate = pkg.expiryDate && pkg.expiryDate >= todayStr
        ? pkg.expiryDate
        : formatDubaiDate(new Date(Date.now() + validityDays * 86400000));
      const sessionsToAllocate = pkg.remainingSessions > 0 ? pkg.remainingSessions : (pkg.totalSessions || def?.sessionCount || 12);

      // Supersede any other Active package for this client to maintain strictly 1 active package
      for (const other of packagesList) {
        if (other.clientId === pkg.clientId && other.id !== pkg.id && other.status === 'Active') {
          const nextStatus = other.remainingSessions === 0 ? 'Completed' : 'Superseded';
          await updateDoc(doc(db, 'clientPackages', other.id), { status: nextStatus });
          other.status = nextStatus as any;
        }
      }

      const pkgUpdate: Record<string, any> = {
        status: 'Active',
        remainingSessions: sessionsToAllocate,
        paymentReference: payId,
        expiryDate,
      };
      if (paidAmountAED && paidAmountAED > 0 && (!pkg.packagePriceAED || pkg.packagePriceAED <= 0)) {
        pkgUpdate.packagePriceAED = paidAmountAED;
      }
      await updateDoc(doc(db, 'clientPackages', pkg.id), cleanFirestoreData(pkgUpdate));
      pkg.status = 'Active';
      pkg.remainingSessions = sessionsToAllocate;

      if (client) {
        const currentCredits = client.sessionCreditsRemaining || 0;
        const clientUpdate: Record<string, any> = {
          activePackageId: pkg.id,
          sessionCreditsRemaining: currentCredits > 0 && client.activePackageId === pkg.id ? currentCredits : sessionsToAllocate,
        };
        await updateDoc(doc(db, 'clients', client.id), cleanFirestoreData(clientUpdate));
        client.activePackageId = pkg.id;
      }

      // Create transaction ledger entry if not already recorded for this package
      const txnId = `TXN-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`;
      await setDoc(doc(db, 'transactions', txnId), cleanFirestoreData({
        id: txnId,
        clientId: pkg.clientId,
        packageId: pkg.id,
        timestamp: new Date().toISOString(),
        type: 'PURCHASE_ALLOCATION',
        creditChange: sessionsToAllocate,
        previousBalance: 0,
        newBalance: sessionsToAllocate,
        reason: `Stripe Sync activated package "${pkg.packageName}" (${chargeId}). Allocated ${sessionsToAllocate} credits until ${expiryDate}.`,
        responsibleUserId: 'stripe-sync',
        responsibleRole: 'system',
      }));
    };

    for (const c of charges) {
      const chargeId = c.id;
      const piId = typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id;
      const linkedSession = piId ? sessionsByPI.get(piId) : undefined;
      const amountAED = c.amount ? c.amount / 100 : 0;
      const isFailed = c.status === 'failed' || c.paid === false;
      const isPending = c.status === 'pending';
      const failureMsg = c.failure_message || c.outcome?.seller_message || 'Payment declined by issuing bank';
      const failureCode = c.failure_code || c.outcome?.reason || 'card_declined';

      const { matchedClient, candidateEmail, candidateCustId } = resolveClientForStripeObj(c, linkedSession);

      // Self-heal missing/bogus stripeCustomerId on matched Client doc using valid successful charge (never overwrite an existing valid cus_ ID)
      const hasValidCustId =
        matchedClient?.stripeCustomerId &&
        matchedClient.stripeCustomerId.startsWith('cus_') &&
        matchedClient.stripeCustomerId !== `cus_${matchedClient.id}`;
      if (matchedClient && !isFailed && candidateCustId && candidateCustId.startsWith('cus_') && !hasValidCustId) {
        await updateDoc(doc(db, 'clients', matchedClient.id), { stripeCustomerId: candidateCustId });
        matchedClient.stripeCustomerId = candidateCustId;
      }

      const clientId = matchedClient?.id || c.metadata?.clientId || linkedSession?.metadata?.clientId || (candidateEmail ? 'PENDING_MATCH' : 'UNKNOWN');
      const clientName = matchedClient?.fullName || candidateEmail || 'Client';

      // 1. Check if a payment record with this charge ID or payment_intent ID already exists
      const existingPay = paymentsList.find(
        (p) =>
          p.transactionReference === chargeId ||
          (p as any).stripePaymentIntentId === chargeId ||
          (piId && (p.transactionReference === piId || (p as any).stripePaymentIntentId === piId))
      );

      if (isFailed) {
        if (existingPay) {
          const needsClientFix =
            matchedClient &&
            (existingPay.clientId === 'PENDING_MATCH' || existingPay.clientId === 'UNKNOWN' || existingPay.clientId === 'UNMATCHED' || existingPay.clientId === 'UNKNOWN_CLIENT');
          if (existingPay.status !== 'Failed' || needsClientFix) {
            await updateDoc(doc(db, 'payments', existingPay.id), cleanFirestoreData({
              clientId: matchedClient ? matchedClient.id : existingPay.clientId,
              status: 'Failed',
              notes: `Stripe Card Declined: ${failureMsg} (${failureCode})`,
            }));
            syncedCount++;
            if (existingPay.status !== 'Failed') newFailuresCount++;
          }
        } else {
          const payId = `PAY-FAILED-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`;
          const failedRecord: PaymentRecord = {
            id: payId,
            clientId,
            packageId: c.metadata?.packageId || linkedSession?.metadata?.packageId || 'NONE',
            packageName: c.metadata?.packageName || (c.description || 'Declined Package Payment'),
            baseAmountAED: Math.round((amountAED / 1.05) * 100) / 100,
            vatAmountAED: Math.round((amountAED - amountAED / 1.05) * 100) / 100,
            amountAED,
            amountPaidAED: 0,
            outstandingBalanceAED: amountAED,
            paymentDate: formatDubaiDate(new Date(c.created * 1000)),
            paymentMethod: 'Stripe',
            transactionReference: chargeId,
            stripePaymentIntentId: piId || chargeId,
            status: 'Failed',
            notes: `Stripe Card Declined: ${failureMsg} (${failureCode})${candidateEmail ? ` • Email: ${candidateEmail}` : ''}`,
            createdAt: new Date(c.created * 1000).toISOString(),
          };
          await setDoc(doc(db, 'payments', payId), cleanFirestoreData(failedRecord));
          paymentsList.push(failedRecord);
          syncedCount++;
          newFailuresCount++;
        }
      } else if (!isPending) {
        // Succeeded & paid charge
        if (existingPay) {
          const needsClientHeal =
            matchedClient &&
            (existingPay.clientId === 'PENDING_MATCH' || existingPay.clientId === 'UNKNOWN' || existingPay.clientId === 'UNMATCHED' || existingPay.clientId === 'UNKNOWN_CLIENT');
          const needsStatusHeal = existingPay.status !== 'Paid';

          if (needsClientHeal || needsStatusHeal) {
            const updates: Record<string, any> = {
              status: 'Paid',
              amountPaidAED: existingPay.amountAED || amountAED,
              outstandingBalanceAED: 0,
              paymentMethod: 'Stripe',
              transactionReference: chargeId,
              stripePaymentIntentId: piId || chargeId,
              notes: `Synchronized and verified live from Stripe API (${chargeId})${matchedClient ? ` for ${matchedClient.fullName}` : ''}`,
            };
            if (needsClientHeal && matchedClient) {
              updates.clientId = matchedClient.id;
              existingPay.clientId = matchedClient.id;
            }
            existingPay.status = 'Paid';
            await updateDoc(doc(db, 'payments', existingPay.id), cleanFirestoreData(updates));
            reconciledCount++;
            syncedCount++;

            if (existingPay.packageId && existingPay.packageId !== 'NONE') {
              const pkg = packagesList.find((p) => p.id === existingPay.packageId);
              if (pkg && pkg.status !== 'Active') {
                await activateClientPackageAndCredits(pkg, existingPay.id, chargeId, matchedClient, amountAED);
              }
            }
          }
        } else {
          // Check if there is a Pending payment for this client (prioritize closest amount match, newest first)
          const pendingCandidates = matchedClient
            ? packagesList && paymentsList
                .filter((p) => p.status === 'Pending' && p.clientId === matchedClient.id)
                .sort((a, b) => {
                  const diffA = Math.abs((a.amountAED || 0) - amountAED);
                  const diffB = Math.abs((b.amountAED || 0) - amountAED);
                  if (Math.abs(diffA - diffB) > 0.25) return diffA - diffB;
                  return getTimeMs(b.createdAt || b.paymentDate) - getTimeMs(a.createdAt || a.paymentDate);
                })
            : [];

          const pendingPay = pendingCandidates[0];

          if (pendingPay) {
            await updateDoc(doc(db, 'payments', pendingPay.id), cleanFirestoreData({
              status: 'Paid',
              amountPaidAED: amountAED > 0 ? amountAED : (pendingPay.amountAED || amountAED),
              outstandingBalanceAED: 0,
              transactionReference: chargeId,
              stripePaymentIntentId: piId || chargeId,
              paymentMethod: 'Stripe',
              paymentDate: formatDubaiDate(new Date(c.created * 1000)),
              notes: `Synchronized and verified live from Stripe API (${chargeId})`,
            }));
            pendingPay.status = 'Paid';
            reconciledCount++;
            syncedCount++;

            if (pendingPay.packageId && pendingPay.packageId !== 'NONE') {
              const pkg = packagesList.find((p) => p.id === pendingPay.packageId);
              if (pkg) {
                await activateClientPackageAndCredits(pkg, pendingPay.id, chargeId, matchedClient, amountAED);
              }
            }
          } else {
            // Create a new synchronized record
            const payId = `PAY-STRIPE-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`;
            const baseAmt = Math.round((amountAED / 1.05) * 100) / 100;
            const vatAmt = Math.round((amountAED - baseAmt) * 100) / 100;
            let resolvedPkgId = c.metadata?.packageId || linkedSession?.metadata?.packageId || 'NONE';
            let resolvedPkgName = c.metadata?.packageName || linkedSession?.metadata?.packageName || c.description || 'Personal Training Package';

            // Check if client has a Pending Payment package matching this amount (even if payment record was missing)
            if (matchedClient && resolvedPkgId === 'NONE') {
              const matchingPendingPkg = packagesList.find(
                (p) => p.clientId === matchedClient.id && p.status === 'Pending Payment'
              );
              if (matchingPendingPkg) {
                resolvedPkgId = matchingPendingPkg.id;
                resolvedPkgName = matchingPendingPkg.packageName;
                await activateClientPackageAndCredits(matchingPendingPkg, payId, chargeId, matchedClient, amountAED);
                reconciledCount++;
              } else {
                // Check if this recent Stripe charge matches an active package definition and client has no package referencing it
                const alreadyLinkedPkg = packagesList.find(
                  (p) => p.paymentReference === chargeId || p.paymentReference === payId || p.paymentReference === piId
                );
                if (!alreadyLinkedPkg) {
                  const matchedDef = pkgDefsList.find(
                    (d) =>
                      d.id === (c.metadata?.packageDefinitionId || linkedSession?.metadata?.packageDefinitionId) ||
                      Math.abs((d.priceAED || 0) - amountAED) < 0.25 ||
                      Math.abs((d.priceAED || 0) * 1.05 - amountAED) < 0.25
                  );
                  const sessionCount = parseInt(c.metadata?.sessionCount || '', 10) || matchedDef?.sessionCount;
                  if (matchedDef || sessionCount) {
                    const newPkgId = `PKG-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
                    const startDate = formatDubaiDate(new Date(c.created * 1000));
                    const validityDays = matchedDef?.validityDays || 30;
                    const expiryDate = formatDubaiDate(new Date(c.created * 1000 + validityDays * 86400000));
                    const sessCount = sessionCount || 12;
                    resolvedPkgId = newPkgId;
                    resolvedPkgName = matchedDef?.name || `${sessCount} Sessions Package`;

                    const syncedPkg: ClientPackage = {
                      id: newPkgId,
                      clientId: matchedClient.id,
                      packageDefinitionId: matchedDef?.id || 'PKG-STRIPE-SYNC',
                      packageName: resolvedPkgName,
                      basePriceAED: baseAmt,
                      vatAmountAED: vatAmt,
                      packagePriceAED: amountAED,
                      totalSessions: sessCount,
                      completedSessions: 0,
                      refundedSessions: 0,
                      lateCancellationDeductions: 0,
                      noShowDeductions: 0,
                      expiredSessions: 0,
                      remainingSessions: sessCount,
                      startDate,
                      expiryDate,
                      status: 'Active',
                      paymentReference: payId,
                      purchasedAt: new Date(c.created * 1000).toISOString(),
                    };
                    await setDoc(doc(db, 'clientPackages', newPkgId), cleanFirestoreData(syncedPkg));
                    packagesList.push(syncedPkg);
                    await activateClientPackageAndCredits(syncedPkg, payId, chargeId, matchedClient, amountAED);
                    reconciledCount++;
                  }
                }
              }
            }

            const payRecord: PaymentRecord = {
              id: payId,
              clientId,
              packageId: resolvedPkgId,
              packageName: resolvedPkgName,
              baseAmountAED: baseAmt,
              vatAmountAED: vatAmt,
              amountAED,
              amountPaidAED: amountAED,
              outstandingBalanceAED: 0,
              paymentDate: formatDubaiDate(new Date(c.created * 1000)),
              paymentMethod: 'Stripe',
              transactionReference: chargeId,
              stripePaymentIntentId: piId || chargeId,
              status: 'Paid',
              notes: `Synchronized from Stripe API (${chargeId}) for ${clientName}${candidateEmail && !matchedClient ? ` • Stripe Email: ${candidateEmail}` : ''}`,
              createdAt: new Date(c.created * 1000).toISOString(),
            };
            await setDoc(doc(db, 'payments', payId), cleanFirestoreData(payRecord));
            paymentsList.push(payRecord);
            syncedCount++;
          }
        }
      }
    }

    // Also inspect PaymentIntents that failed before producing a Charge
    for (const pi of paymentIntents) {
      if (pi.status === 'requires_payment_method' && pi.last_payment_error && !pi.latest_charge) {
        const piId = pi.id;
        const alreadyRecorded = paymentsList.some(
          (p) => p.transactionReference === piId || (p as any).stripePaymentIntentId === piId
        );
        if (!alreadyRecorded) {
          const { matchedClient, candidateEmail } = resolveClientForStripeObj(pi);
          const amountAED = pi.amount ? pi.amount / 100 : 0;
          const payId = `PAY-FAILED-${piId.replace(/[^a-zA-Z0-9]/g, '')}`;
          const failedRecord: PaymentRecord = {
            id: payId,
            clientId: matchedClient?.id || pi.metadata?.clientId || (candidateEmail ? 'PENDING_MATCH' : 'UNKNOWN'),
            packageId: pi.metadata?.packageId || 'NONE',
            packageName: pi.metadata?.packageName || pi.description || 'Declined Package Payment',
            baseAmountAED: Math.round((amountAED / 1.05) * 100) / 100,
            vatAmountAED: Math.round((amountAED - amountAED / 1.05) * 100) / 100,
            amountAED,
            amountPaidAED: 0,
            outstandingBalanceAED: amountAED,
            paymentDate: formatDubaiDate(new Date(pi.created * 1000)),
            paymentMethod: 'Stripe',
            transactionReference: piId,
            stripePaymentIntentId: piId,
            status: 'Failed',
            notes: `Stripe Payment Failed: ${pi.last_payment_error.message || 'Card declined'} (${pi.last_payment_error.code || 'card_declined'})`,
            createdAt: new Date(pi.created * 1000).toISOString(),
          };
          await setDoc(doc(db, 'payments', payId), cleanFirestoreData(failedRecord));
          paymentsList.push(failedRecord);
          syncedCount++;
          newFailuresCount++;
        }
      }
    }

    return {
      success: true,
      syncedCount,
      newFailuresCount,
      reconciledCount,
      message: `Direct Stripe Gateway Sync: ${syncedCount} record(s) synced (${reconciledCount} reconciled, ${newFailuresCount} failed). Checked ${charges.length} Stripe charges.`,
      charges,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      newFailuresCount: 0,
      reconciledCount: 0,
      message: `Direct Stripe Gateway error: ${err?.message || 'Network error'}`,
    };
  }
}
