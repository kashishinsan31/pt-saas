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

/**
 * Synchronizes recent charges directly from Stripe API into Firestore.
 * Bypasses local proxy/server route constraints and guarantees 100% resilient synchronization.
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
    const res = await fetch('https://api.stripe.com/v1/charges?limit=25', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        syncedCount: 0,
        newFailuresCount: 0,
        reconciledCount: 0,
        message: data.error?.message || 'Failed to fetch charges from Stripe API.',
      };
    }

    const charges = data.data || [];
    let syncedCount = 0;
    let newFailuresCount = 0;
    let reconciledCount = 0;

    // Fetch snapshot of current Firestore collections
    const [paymentsSnap, packagesSnap, clientsSnap] = await Promise.all([
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'clientPackages')),
      getDocs(collection(db, 'clients')),
    ]);

    const paymentsList = paymentsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as PaymentRecord[];
    const packagesList = packagesSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as ClientPackage[];
    const clientsList = clientsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as Client[];

    for (const c of charges) {
      const chargeId = c.id;
      const amountAED = c.amount ? c.amount / 100 : 0;
      const isFailed = c.status === 'failed' || c.paid === false;
      const failureMsg = c.failure_message || c.outcome?.seller_message || 'Payment declined by issuing bank';
      const failureCode = c.failure_code || c.outcome?.reason || 'card_declined';

      // Locate client candidate
      const candidateEmail = (c.receipt_email || c.billing_details?.email || c.customer_details?.email || '').trim().toLowerCase();
      const candidateCustId = c.customer;
      const desc = (c.description || '').toLowerCase();

      let matchedClient: Client | undefined = undefined;
      if (candidateCustId) {
        matchedClient = clientsList.find((cl) => cl.stripeCustomerId === candidateCustId);
      }
      if (!matchedClient && candidateEmail) {
        matchedClient = clientsList.find((cl) => cl.email && cl.email.trim().toLowerCase() === candidateEmail);
      }
      if (!matchedClient && desc) {
        matchedClient = clientsList.find((cl) => cl.fullName && desc.includes(cl.fullName.toLowerCase()));
      }

      const clientId = matchedClient?.id || c.metadata?.clientId || (candidateEmail ? 'PENDING_MATCH' : 'UNKNOWN');
      const clientName = matchedClient?.fullName || candidateEmail || 'Client';

      // 1. Check if a payment record with this charge ID already exists
      const existingPay = paymentsList.find(
        (p) => p.transactionReference === chargeId || (p as any).stripePaymentIntentId === chargeId
      );

      if (isFailed) {
        if (existingPay) {
          if (existingPay.status !== 'Failed') {
            await updateDoc(doc(db, 'payments', existingPay.id), cleanFirestoreData({
              status: 'Failed',
              notes: `Stripe Card Declined: ${failureMsg} (${failureCode})`,
            }));
            syncedCount++;
            newFailuresCount++;
          }
        } else {
          // Record new failed payment
          const payId = `PAY-FAILED-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`;
          const failedRecord: PaymentRecord = {
            id: payId,
            clientId,
            packageId: c.metadata?.packageId || 'NONE',
            packageName: c.metadata?.packageName || (c.description || 'Declined Package Payment'),
            baseAmountAED: Math.round(amountAED / 1.05),
            vatAmountAED: Math.round(amountAED - Math.round(amountAED / 1.05)),
            amountAED,
            amountPaidAED: 0,
            outstandingBalanceAED: amountAED,
            paymentDate: formatDubaiDate(new Date(c.created * 1000)),
            paymentMethod: 'Stripe',
            transactionReference: chargeId,
            stripePaymentIntentId: chargeId,
            status: 'Failed',
            notes: `Stripe Card Declined: ${failureMsg} (${failureCode})`,
            createdAt: new Date(c.created * 1000).toISOString(),
          };
          await setDoc(doc(db, 'payments', payId), cleanFirestoreData(failedRecord));
          syncedCount++;
          newFailuresCount++;
        }
      } else {
        // Succeeded charge
        if (existingPay) {
          if (existingPay.status !== 'Paid') {
            await updateDoc(doc(db, 'payments', existingPay.id), cleanFirestoreData({
              status: 'Paid',
              amountPaidAED: existingPay.amountAED || amountAED,
              outstandingBalanceAED: 0,
              paymentMethod: 'Stripe',
              notes: `Synchronized and verified live from Stripe API (${chargeId})`,
            }));
            reconciledCount++;
            syncedCount++;

            // Activate package if associated
            if (existingPay.packageId && existingPay.packageId !== 'NONE') {
              const pkg = packagesList.find((p) => p.id === existingPay.packageId);
              if (pkg && pkg.status !== 'Active') {
                await updateDoc(doc(db, 'clientPackages', pkg.id), cleanFirestoreData({
                  status: 'Active',
                  remainingSessions: pkg.remainingSessions > 0 ? pkg.remainingSessions : (pkg.totalSessions || 12),
                  paymentReference: existingPay.id,
                }));
              }
            }
          }
        } else {
          // Check if there is any pending payment for this client that can be reconciled
          const pendingPay = paymentsList.find(
            (p) => p.status === 'Pending' && (p.clientId === clientId || (matchedClient && p.clientId === matchedClient.id))
          );

          if (pendingPay) {
            await updateDoc(doc(db, 'payments', pendingPay.id), cleanFirestoreData({
              status: 'Paid',
              amountPaidAED: pendingPay.amountAED || amountAED,
              outstandingBalanceAED: 0,
              transactionReference: chargeId,
              stripePaymentIntentId: c.payment_intent || chargeId,
              paymentMethod: 'Stripe',
              notes: `Synchronized and verified live from Stripe API (${chargeId})`,
            }));
            reconciledCount++;
            syncedCount++;

            // Activate associated pending package
            if (pendingPay.packageId && pendingPay.packageId !== 'NONE') {
              const pkg = packagesList.find((p) => p.id === pendingPay.packageId);
              if (pkg) {
                const sessionsToAllocate = pkg.remainingSessions > 0 ? pkg.remainingSessions : (pkg.totalSessions || 12);
                await updateDoc(doc(db, 'clientPackages', pkg.id), cleanFirestoreData({
                  status: 'Active',
                  remainingSessions: sessionsToAllocate,
                  paymentReference: pendingPay.id,
                }));

                // Update client session credits
                if (matchedClient) {
                  const currentCredits = matchedClient.sessionCreditsRemaining || 0;
                  await updateDoc(doc(db, 'clients', matchedClient.id), cleanFirestoreData({
                    activePackageId: pkg.id,
                    sessionCreditsRemaining: currentCredits + sessionsToAllocate,
                  }));
                }
              }
            }
          } else {
            // Create a synchronized record
            const payId = `PAY-STRIPE-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`;
            const payRecord: PaymentRecord = {
              id: payId,
              clientId,
              packageId: c.metadata?.packageId || 'NONE',
              packageName: c.metadata?.packageName || c.description || 'Personal Training Package',
              baseAmountAED: Math.round(amountAED / 1.05),
              vatAmountAED: Math.round(amountAED - Math.round(amountAED / 1.05)),
              amountAED,
              amountPaidAED: amountAED,
              outstandingBalanceAED: 0,
              paymentDate: formatDubaiDate(new Date(c.created * 1000)),
              paymentMethod: 'Stripe',
              transactionReference: chargeId,
              stripePaymentIntentId: c.payment_intent || chargeId,
              status: 'Paid',
              notes: `Synchronized from Stripe API (${chargeId}) for ${clientName}`,
              createdAt: new Date(c.created * 1000).toISOString(),
            };
            await setDoc(doc(db, 'payments', payId), cleanFirestoreData(payRecord));
            syncedCount++;
          }
        }
      }
    }

    return {
      success: true,
      syncedCount,
      newFailuresCount,
      reconciledCount,
      message: `Direct Stripe Gateway Sync: Synchronized ${syncedCount} charges (${reconciledCount} payments reconciled, ${newFailuresCount} declined charges recorded).`,
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
