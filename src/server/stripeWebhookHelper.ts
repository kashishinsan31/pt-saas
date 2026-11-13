import crypto from 'crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Client,
  ClientPackage,
  PackageDefinition,
  SessionTransaction,
  PaymentRecord,
  NotificationItem,
  AuditLogItem,
} from '../types';

export interface StripeWebhookResult {
  received: boolean;
  status: 'success' | 'ignored' | 'already_processed' | 'client_not_found' | 'error';
  eventType: string;
  transactionId?: string;
  clientId?: string;
  creditsAdded?: number;
  newBalance?: number;
  packageId?: string;
  message: string;
}

/**
 * Returns current date or date + offset days formatted as YYYY-MM-DD in Asia/Dubai timezone.
 */
export function getDubaiDate(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
}

/**
 * Verifies Stripe webhook HMAC-SHA256 signature against the raw request body.
 */
export function verifyStripeSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  webhookSecret: string | undefined
): boolean {
  if (!webhookSecret) {
    // If webhook secret is not configured in env, allow through for sandbox/testing
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  try {
    const parts = signatureHeader.split(',');
    let timestamp = '';
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    const payload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'));
      } catch {
        return false;
      }
    });
  } catch (err) {
    console.warn('[Stripe Webhook Signature Verification Error]:', err);
    return false;
  }
}

/**
 * Strips undefined properties recursively so Firestore setDoc/updateDoc doesn't throw.
 * Includes cycle detection and depth limit to prevent stack overflow.
 */
function cleanData<T>(obj: T, seen = new WeakSet<object>(), depth = 0): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (depth > 25) return obj;

  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((i) => cleanData(i, seen, depth + 1)) as any;
  }

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = cleanData(v, seen, depth + 1);
    }
  }
  return cleaned as T;
}

/**
 * Helper to find a Client document in Firestore from Stripe payload information.
 */
async function locateClient(
  dataObj: any,
  metadata: Record<string, any>
): Promise<Client | null> {
  // 1. Direct match by metadata clientId
  if (metadata.clientId) {
    try {
      const directDoc = await getDoc(doc(db, 'clients', metadata.clientId));
      if (directDoc.exists()) {
        return { ...directDoc.data(), id: directDoc.id } as Client;
      }
    } catch {
      // Continue to query fallbacks
    }
  }

  // 2. Query by Stripe Customer ID (cus_...) in clients and savedCards
  const customerId = typeof dataObj.customer === 'string' ? dataObj.customer : (dataObj.customer?.id || metadata.customerId);
  if (customerId && typeof customerId === 'string') {
    try {
      const custQuery = query(collection(db, 'clients'), where('stripeCustomerId', '==', customerId));
      const custSnap = await getDocs(custQuery);
      if (!custSnap.empty) {
        const first = custSnap.docs[0];
        return { ...first.data(), id: first.id } as Client;
      }

      const cardsQuery = query(collection(db, 'savedCards'), where('stripeCustomerId', '==', customerId));
      const cardsSnap = await getDocs(cardsQuery);
      if (!cardsSnap.empty) {
        const cardClientId = cardsSnap.docs[0].data()?.clientId;
        if (cardClientId) {
          const clientDoc = await getDoc(doc(db, 'clients', cardClientId));
          if (clientDoc.exists()) {
            return { ...clientDoc.data(), id: clientDoc.id } as Client;
          }
        }
      }
    } catch {
      // Continue to email fallback
    }
  }

  // 3. Query by customer email (receipt_email, billing_details.email, customer_details.email, or metadata)
  const candidateEmail =
    dataObj.receipt_email ||
    dataObj.billing_details?.email ||
    dataObj.customer_details?.email ||
    dataObj.customer_email ||
    metadata.email ||
    metadata.clientEmail;

  if (candidateEmail && typeof candidateEmail === 'string') {
    const emailNorm = candidateEmail.trim().toLowerCase();
    try {
      const emailQuery = query(collection(db, 'clients'), where('email', '==', emailNorm));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        const first = emailSnap.docs[0];
        return { ...first.data(), id: first.id } as Client;
      }
    } catch {
      // Continue to all clients scan
    }

    // Case-insensitive fallback scan
    try {
      const allClientsSnap = await getDocs(collection(db, 'clients'));
      for (const d of allClientsSnap.docs) {
        const cData = d.data() as Client;
        if (cData.email && cData.email.trim().toLowerCase() === emailNorm) {
          return { ...cData, id: d.id };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Core processor for handling Stripe webhook events and updating the client's session credit balance.
 * Supports:
 * - payment_intent.succeeded
 * - charge.succeeded
 * - checkout.session.completed
 * - invoice.payment_succeeded
 */
export async function processStripePaymentSuccess(
  event: any
): Promise<StripeWebhookResult> {
  const eventType = event.type;
  const eventId = event.id;
  const dataObj = event.data?.object || {};
  const metadata = dataObj.metadata || {};

  // Determine transaction reference
  const transactionId =
    dataObj.id ||
    dataObj.payment_intent ||
    dataObj.charge ||
    `ST-${Date.now()}`;

  // Amount calculation (Fils to AED)
  const amountInFils = typeof dataObj.amount === 'number'
    ? dataObj.amount
    : typeof dataObj.amount_total === 'number'
    ? dataObj.amount_total
    : typeof dataObj.amount_paid === 'number'
    ? dataObj.amount_paid
    : 0;
  const amountAED = amountInFils > 0 ? amountInFils / 100 : parseFloat(metadata.totalAmountAED || '0') || 0;

  // 1. Idempotency Check: Prevent duplicate credit allocation
  if (eventId) {
    try {
      const eventDocRef = doc(db, 'webhookEvents', eventId);
      const existing = await getDoc(eventDocRef);
      if (existing.exists() && existing.data().status === 'processed') {
        return {
          received: true,
          status: 'already_processed',
          eventType,
          transactionId,
          message: `Stripe webhook event ${eventId} was already processed. Skipped duplicate balance update.`,
        };
      }
    } catch (e) {
      console.warn('[Idempotency check warning]:', e);
    }
  }

  // 2. Identify the Client
  const client = await locateClient(dataObj, metadata);

  if (!client) {
    console.warn(`[Stripe Webhook]: No matching client found for transaction ${transactionId} (Email: ${dataObj.receipt_email || dataObj.billing_details?.email || 'N/A'}).`);

    // Record an unassigned payment record for audit and manual reconciliation
    try {
      const unassignedPayId = `PAY-UNMATCHED-${Date.now()}`;
      await setDoc(doc(db, 'payments', unassignedPayId), cleanData({
        id: unassignedPayId,
        clientId: 'UNMATCHED',
        packageId: 'NONE',
        packageName: metadata.packageName || 'Stripe Direct Payment',
        amountAED,
        amountPaidAED: amountAED,
        outstandingBalanceAED: 0,
        paymentDate: getDubaiDate(),
        paymentMethod: 'Stripe',
        transactionReference: transactionId,
        status: 'Paid',
        notes: `Unmatched client. Email: ${dataObj.receipt_email || dataObj.billing_details?.email || 'None'}. Event: ${eventId}`,
        createdAt: new Date().toISOString(),
      }));
    } catch {
      // ignore
    }

    return {
      received: true,
      status: 'client_not_found',
      eventType,
      transactionId,
      message: `Payment received for AED ${amountAED}, but no matching client profile could be resolved.`,
    };
  }

  // If client doesn't have stripeCustomerId set, link it now
  if (dataObj.customer && !client.stripeCustomerId) {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        stripeCustomerId: dataObj.customer,
      });
      client.stripeCustomerId = dataObj.customer;
    } catch {
      // Non-critical
    }
  }

  // 3. Determine Session Credit Count to allocate
  let sessionCredits = 0;
  if (metadata.sessionCount) {
    sessionCredits = parseInt(metadata.sessionCount, 10);
  } else if (metadata.sessions) {
    sessionCredits = parseInt(metadata.sessions, 10);
  } else if (metadata.credits) {
    sessionCredits = parseInt(metadata.credits, 10);
  }

  // Package definitions lookup
  let matchedPkgDef: PackageDefinition | null = null;
  const packageDefId = metadata.packageDefinitionId || metadata.packageId;
  if (packageDefId) {
    try {
      const pkgDefSnap = await getDoc(doc(db, 'packageDefinitions', packageDefId));
      if (pkgDefSnap.exists()) {
        matchedPkgDef = { ...pkgDefSnap.data(), id: pkgDefSnap.id } as PackageDefinition;
      }
    } catch {
      // continue
    }
  }

  // If sessionCredits was not explicitly specified, derive from matched definition or amount
  if (!sessionCredits || isNaN(sessionCredits) || sessionCredits <= 0) {
    if (matchedPkgDef && matchedPkgDef.sessionCount) {
      sessionCredits = matchedPkgDef.sessionCount;
    } else {
      // Fallback heuristics based on amount or standard Waiter Walk packages
      if (amountAED >= 6000) {
        sessionCredits = 30;
      } else if (amountAED >= 4000) {
        sessionCredits = 20;
      } else if (amountAED >= 2000) {
        sessionCredits = 10;
      } else if (amountAED >= 1000) {
        sessionCredits = 5;
      } else {
        sessionCredits = 10; // Default standard allocation
      }
    }
  }

  const packageName =
    metadata.packageName ||
    matchedPkgDef?.name ||
    `${sessionCredits} Personal Training Sessions`;

  const validityDays =
    parseInt(metadata.validityDays, 10) ||
    matchedPkgDef?.validityDays ||
    30; // 30-day UAE fitness validity standard

  const todayStr = getDubaiDate();
  const expiryDateStr = getDubaiDate(validityDays);

  // 4. Update or Create Package and allocate session credits in Firestore
  let targetPackageId = '';
  let previousBalance = 0;
  let newBalance = 0;
  const isTopUp = metadata.isTopUp === 'true' || metadata.action === 'topup';

  try {
    // Check for existing packages for this client
    const pkgQuery = query(collection(db, 'clientPackages'), where('clientId', '==', client.id));
    const pkgSnap = await getDocs(pkgQuery);
    const existingPackages = pkgSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ClientPackage));

    const activePkg = existingPackages.find((p) => p.status === 'Active');
    const pendingPkg = existingPackages.find((p) => p.status === 'Pending Payment');

    if (isTopUp && activePkg) {
      // TOP-UP EXISTING ACTIVE PACKAGE
      targetPackageId = activePkg.id;
      previousBalance = activePkg.remainingSessions || 0;
      newBalance = previousBalance + sessionCredits;

      const updatedRemaining = (activePkg.remainingSessions || 0) + sessionCredits;
      const updatedTotal = (activePkg.totalSessions || 0) + sessionCredits;

      await updateDoc(doc(db, 'clientPackages', activePkg.id), cleanData({
        totalSessions: updatedTotal,
        remainingSessions: updatedRemaining,
        packagePriceAED: (activePkg.packagePriceAED || 0) + amountAED,
        paymentReference: activePkg.paymentReference
          ? `${activePkg.paymentReference}, ${transactionId}`
          : transactionId,
      }));
    } else if (pendingPkg) {
      // ACTIVATE PENDING PACKAGE INITIATED FROM PORTAL
      targetPackageId = pendingPkg.id;
      previousBalance = activePkg ? activePkg.remainingSessions || 0 : 0;
      newBalance = pendingPkg.totalSessions;

      // Supersede older active package if any
      if (activePkg && activePkg.id !== pendingPkg.id) {
        const supersededStatus = activePkg.remainingSessions === 0 ? 'Completed' : 'Superseded';
        await updateDoc(doc(db, 'clientPackages', activePkg.id), { status: supersededStatus });
      }

      await updateDoc(doc(db, 'clientPackages', pendingPkg.id), cleanData({
        status: 'Active',
        startDate: todayStr,
        expiryDate: expiryDateStr,
        paymentReference: transactionId,
        remainingSessions: pendingPkg.totalSessions,
        packagePriceAED: amountAED > 0 ? amountAED : pendingPkg.packagePriceAED,
      }));
    } else {
      // CREATE BRAND NEW ACTIVE PACKAGE
      targetPackageId = `PKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      previousBalance = activePkg ? activePkg.remainingSessions || 0 : 0;
      newBalance = sessionCredits;

      // Supersede any existing Active package to maintain 1 active package discipline
      if (activePkg) {
        const supersededStatus = activePkg.remainingSessions === 0 ? 'Completed' : 'Superseded';
        await updateDoc(doc(db, 'clientPackages', activePkg.id), { status: supersededStatus });
      }

      const basePrice = metadata.basePriceAED ? parseFloat(metadata.basePriceAED) : Math.round((amountAED / 1.05) * 100) / 100;
      const vatAmt = metadata.vatAmountAED ? parseFloat(metadata.vatAmountAED) : Math.round((amountAED - basePrice) * 100) / 100;

      const newClientPackage: ClientPackage = {
        id: targetPackageId,
        clientId: client.id,
        packageDefinitionId: matchedPkgDef?.id || packageDefId || 'PKG-STRIPE-DIRECT',
        packageName,
        basePriceAED: basePrice,
        vatAmountAED: vatAmt,
        packagePriceAED: amountAED,
        totalSessions: sessionCredits,
        completedSessions: 0,
        refundedSessions: 0,
        lateCancellationDeductions: 0,
        noShowDeductions: 0,
        expiredSessions: 0,
        remainingSessions: sessionCredits,
        startDate: todayStr,
        expiryDate: expiryDateStr,
        status: 'Active',
        paymentReference: transactionId,
        purchasedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'clientPackages', targetPackageId), cleanData(newClientPackage));
    }

    // 5. Create SessionTransaction Ledger Entry
    const newTxnId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTxn: SessionTransaction = {
      id: newTxnId,
      clientId: client.id,
      packageId: targetPackageId,
      timestamp: new Date().toISOString(),
      type: 'PURCHASE_ALLOCATION',
      creditChange: sessionCredits,
      previousBalance,
      newBalance,
      reason: `Stripe Webhook (${eventType}): Payment ${transactionId} confirmed for AED ${amountAED}. Allocated ${sessionCredits} credits. Expiry: ${expiryDateStr}.`,
      responsibleUserId: 'stripe-webhook',
      responsibleRole: 'system',
    };
    await setDoc(doc(db, 'transactions', newTxnId), cleanData(newTxn));

    // 6. Create PaymentRecord
    const newPaymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPayment: PaymentRecord = {
      id: newPaymentId,
      clientId: client.id,
      packageId: targetPackageId,
      packageName,
      baseAmountAED: Math.round((amountAED / 1.05) * 100) / 100,
      vatAmountAED: Math.round((amountAED - Math.round((amountAED / 1.05) * 100) / 100) * 100) / 100,
      amountAED,
      amountPaidAED: amountAED,
      outstandingBalanceAED: 0,
      paymentDate: todayStr,
      paymentMethod: 'Stripe',
      transactionReference: transactionId,
      status: 'Paid',
      notes: `Stripe event: ${eventType} (ID: ${eventId || transactionId}). Automated credit allocation.`,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'payments', newPaymentId), cleanData(newPayment));

    // 7. Send In-App Notifications to Client and Admins
    const clientNotifId = `NOTIF-${Date.now()}-1`;
    const clientNotif: NotificationItem = {
      id: clientNotifId,
      userId: client.userId || client.id,
      title: 'Payment Successful & Credits Added',
      message: `Your payment of AED ${amountAED} via Stripe was successful! ${sessionCredits} session credits have been added to your account (valid until ${expiryDateStr}).`,
      type: 'payment',
      read: false,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'notifications', clientNotifId), cleanData(clientNotif));

    const adminNotifId = `NOTIF-${Date.now()}-2`;
    const adminNotif: NotificationItem = {
      id: adminNotifId,
      userId: 'admin-all',
      title: 'Stripe Payment Received',
      message: `${client.fullName} paid AED ${amountAED} via Stripe (${transactionId}). ${sessionCredits} credits allocated to package ${packageName}.`,
      type: 'payment',
      read: false,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'notifications', adminNotifId), cleanData(adminNotif));

    // 8. Record Audit Log Entry
    const auditId = `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const auditItem: AuditLogItem = {
      id: auditId,
      timestamp: new Date().toISOString(),
      userId: 'system-stripe-webhook',
      userName: 'Stripe Webhook',
      userRole: 'system',
      action: 'STRIPE_WEBHOOK_PAYMENT_PROCESSED',
      details: `Stripe ${eventType} (${transactionId}) processed for client ${client.fullName} (${client.id}). Added ${sessionCredits} credits. Expiry: ${expiryDateStr}. Total AED ${amountAED}.`,
    };
    await setDoc(doc(db, 'auditLogs', auditId), cleanData(auditItem));

    // 9. Mark Idempotency Record
    if (eventId) {
      await setDoc(doc(db, 'webhookEvents', eventId), {
        eventId,
        eventType,
        transactionId,
        clientId: client.id,
        creditsAdded: sessionCredits,
        amountAED,
        status: 'processed',
        processedAt: new Date().toISOString(),
      });
    }

    return {
      received: true,
      status: 'success',
      eventType,
      transactionId,
      clientId: client.id,
      creditsAdded: sessionCredits,
      newBalance,
      packageId: targetPackageId,
      message: `Successfully allocated ${sessionCredits} session credits to client ${client.fullName} (New Balance: ${newBalance}). Valid until ${expiryDateStr}.`,
    };
  } catch (error: any) {
    console.error('[Stripe Webhook Firestore Update Error]:', error);
    return {
      received: true,
      status: 'error',
      eventType,
      transactionId,
      clientId: client.id,
      message: `Error updating Firestore for client ${client.id}: ${error.message}`,
    };
  }
}

/**
 * Handles failed Stripe charges and payment intents, recording them into Firestore `payments`
 * so the failure is visible in the Admin and Client portals with exact bank decline details.
 */
export async function processStripePaymentFailure(event: any): Promise<StripeWebhookResult> {
  const eventType = event.type;
  const dataObj = event.data?.object || {};
  const metadata = dataObj.metadata || {};

  const transactionId = dataObj.id || dataObj.charge || `ERR-${Date.now()}`;
  const amountInFils = typeof dataObj.amount === 'number'
    ? dataObj.amount
    : typeof dataObj.amount_total === 'number'
    ? dataObj.amount_total
    : 0;
  const amountAED = amountInFils > 0 ? amountInFils / 100 : parseFloat(metadata.totalAmountAED || '0') || 0;

  const failureMessage =
    dataObj.failure_message ||
    dataObj.last_payment_error?.message ||
    dataObj.outcome?.seller_message ||
    'Card declined by issuing bank';
  const failureCode =
    dataObj.failure_code ||
    dataObj.last_payment_error?.code ||
    dataObj.outcome?.reason ||
    'card_declined';

  // Identify client
  const client = await locateClient(dataObj, metadata);
  const clientId = client?.id || metadata.clientId || 'UNKNOWN_CLIENT';
  const clientName = client?.fullName || 'Client';

  const notes = `Stripe Card Declined: ${failureMessage} (${failureCode})`;

  try {
    // 1. Check if a payment with this transactionReference already exists
    const existingSnap = await getDocs(
      query(collection(db, 'payments'), where('transactionReference', '==', transactionId))
    );

    let paymentId = '';
    if (!existingSnap.empty) {
      paymentId = existingSnap.docs[0].id;
      await updateDoc(doc(db, 'payments', paymentId), cleanData({
        status: 'Failed',
        notes,
        failedAt: new Date().toISOString(),
      }));
    } else {
      paymentId = `PAY-FAILED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const failedPayment: PaymentRecord = {
        id: paymentId,
        clientId,
        packageId: metadata.packageId || 'NONE',
        packageName: metadata.packageName || 'Personal Training Package',
        baseAmountAED: Math.round((amountAED / 1.05) * 100) / 100,
        vatAmountAED: Math.round((amountAED - Math.round((amountAED / 1.05) * 100) / 100) * 100) / 100,
        amountAED,
        amountPaidAED: 0,
        outstandingBalanceAED: amountAED,
        paymentDate: getDubaiDate(),
        paymentMethod: 'Stripe',
        transactionReference: transactionId,
        stripePaymentIntentId: transactionId,
        status: 'Failed',
        notes,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'payments', paymentId), cleanData(failedPayment));
    }

    // 2. Record notification for admin
    const notifId = `NOTIF-${Date.now()}-FAIL`;
    const adminNotif: NotificationItem = {
      id: notifId,
      userId: 'admin-all',
      title: `Payment Declined: ${clientName}`,
      message: `Payment of AED ${amountAED} by ${clientName} (${clientId}) failed: ${failureMessage}. (Stripe: ${transactionId}).`,
      type: 'payment',
      read: false,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'notifications', notifId), cleanData(adminNotif));

    // 3. Audit log
    const auditId = `AUDIT-${Date.now()}-FAIL`;
    const auditItem: AuditLogItem = {
      id: auditId,
      timestamp: new Date().toISOString(),
      userId: 'system-stripe-webhook',
      userName: 'Stripe Webhook',
      userRole: 'system',
      action: 'STRIPE_PAYMENT_FAILED',
      details: `Stripe charge ${transactionId} failed for ${clientName}: ${failureMessage} (Code: ${failureCode}). Amount: AED ${amountAED}.`,
    };
    await setDoc(doc(db, 'auditLogs', auditId), cleanData(auditItem));

    return {
      received: true,
      status: 'success',
      eventType,
      transactionId,
      clientId,
      message: `Recorded payment failure in panel for ${clientName}: ${failureMessage}`,
    };
  } catch (err: any) {
    console.error('[Stripe Webhook Failure Record Error]:', err);
    return {
      received: true,
      status: 'error',
      eventType,
      transactionId,
      message: err.message || 'Error recording failed payment',
    };
  }
}

/**
 * Directly synchronizes recent charges from Stripe API into Firestore payments collection.
 * Reconciles both successful and failed charges so admin and client panels are always 100% in sync.
 */
export async function syncStripeChargesWithFirestore(secretKey: string): Promise<{
  syncedCount: number;
  newFailuresCount: number;
  reconciledCount: number;
  charges: any[];
}> {
  const cleanKey = secretKey?.trim();
  if (!cleanKey) {
    throw new Error('Stripe Secret Key is required to synchronize charges.');
  }

  const authHeader = { Authorization: `Bearer ${cleanKey}` };
  const [chargesRes, piRes, sessionsRes, customersRes] = await Promise.all([
    fetch('https://api.stripe.com/v1/charges?limit=50', { headers: authHeader }),
    fetch('https://api.stripe.com/v1/payment_intents?limit=50', { headers: authHeader }).catch(() => null),
    fetch('https://api.stripe.com/v1/checkout/sessions?limit=50', { headers: authHeader }).catch(() => null),
    fetch('https://api.stripe.com/v1/customers?limit=50', { headers: authHeader }).catch(() => null),
  ]);

  const data = await chargesRes.json();
  if (!chargesRes.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to query Stripe API charges.');
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

  const getMs = (val?: string | number) => {
    if (!val) return 0;
    if (typeof val === 'number') return val > 1e11 ? val : val * 1000;
    const ms = new Date(val).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };

  const toDubaiDate = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });

  const resolveClient = (obj: any, extraSession?: any): { matchedClient?: Client; candidateEmail: string; candidateCustId: string } => {
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
    const metaClientId = mergedMeta.clientId || extraSession?.client_reference_id;
    if (metaClientId) matchedClient = clientsList.find((cl) => cl.id === metaClientId);
    if (!matchedClient && candidateCustId) matchedClient = clientsList.find((cl) => cl.stripeCustomerId === candidateCustId);
    if (!matchedClient && candidateCustId) {
      const cardMatch = savedCardsList.find((sc) => sc.stripeCustomerId === candidateCustId);
      if (cardMatch?.clientId) matchedClient = clientsList.find((cl) => cl.id === cardMatch.clientId);
    }
    if (!matchedClient && candidateEmails.length > 0) {
      matchedClient = clientsList.find((cl) => cl.email && candidateEmails.includes(cl.email.trim().toLowerCase()));
    }
    if (!matchedClient && desc) {
      matchedClient = clientsList.find((cl) => cl.fullName && desc.includes(cl.fullName.trim().toLowerCase()));
    }
    if (!matchedClient && custName) {
      matchedClient = clientsList.find((cl) => cl.fullName && cl.fullName.trim().toLowerCase() === custName);
    }

    return { matchedClient, candidateEmail, candidateCustId };
  };

  const activatePkg = async (pkg: ClientPackage, payId: string, chargeId: string, client?: Client, paidAmt?: number) => {
    const todayStr = getDubaiDate();
    const def = pkgDefsList.find((d) => d.id === pkg.packageDefinitionId);
    const validityDays = def?.validityDays || 30;
    const expiryDate = pkg.expiryDate && pkg.expiryDate >= todayStr
      ? pkg.expiryDate
      : toDubaiDate(Date.now() + validityDays * 86400000);
    const sess = pkg.remainingSessions > 0 ? pkg.remainingSessions : (pkg.totalSessions || def?.sessionCount || 12);

    for (const other of packagesList) {
      if (other.clientId === pkg.clientId && other.id !== pkg.id && other.status === 'Active') {
        const nextStatus = other.remainingSessions === 0 ? 'Completed' : 'Superseded';
        await updateDoc(doc(db, 'clientPackages', other.id), { status: nextStatus });
        other.status = nextStatus as any;
      }
    }

    const pkgUpdates: Record<string, any> = {
      status: 'Active',
      remainingSessions: sess,
      paymentReference: payId,
      expiryDate,
    };
    if (paidAmt && paidAmt > 0 && (!pkg.packagePriceAED || pkg.packagePriceAED <= 0)) {
      pkgUpdates.packagePriceAED = paidAmt;
    }
    await updateDoc(doc(db, 'clientPackages', pkg.id), cleanData(pkgUpdates));
    pkg.status = 'Active';
    pkg.remainingSessions = sess;

    if (client) {
      const credits = client.sessionCreditsRemaining || 0;
      await updateDoc(doc(db, 'clients', client.id), cleanData({
        activePackageId: pkg.id,
        sessionCreditsRemaining: credits > 0 && client.activePackageId === pkg.id ? credits : sess,
      }));
      client.activePackageId = pkg.id;
    }
  };

  let syncedCount = 0;
  let newFailuresCount = 0;
  let reconciledCount = 0;

  for (const c of charges) {
    const chargeId = c.id;
    const piId = typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id;
    const linkedSession = piId ? sessionsByPI.get(piId) : undefined;
    const amountAED = c.amount ? c.amount / 100 : 0;
    const isFailed = c.status === 'failed' || c.paid === false;
    const isPending = c.status === 'pending';
    const failureMsg = c.failure_message || c.outcome?.seller_message || 'Payment declined by issuing bank';
    const failureCode = c.failure_code || c.outcome?.reason || 'card_declined';

    const { matchedClient, candidateEmail, candidateCustId } = resolveClient(c, linkedSession);
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

    const existingPay = paymentsList.find(
      (p) =>
        p.transactionReference === chargeId ||
        (p as any).stripePaymentIntentId === chargeId ||
        (piId && (p.transactionReference === piId || (p as any).stripePaymentIntentId === piId))
    );

    const safeCreatedMs = c.created ? (c.created > 1e11 ? c.created : c.created * 1000) : Date.now();
    const recordDate = toDubaiDate(safeCreatedMs);
    const isoTimestamp = new Date(safeCreatedMs).toISOString();

    if (!existingPay) {
      if (!isFailed && !isPending && matchedClient) {
        const pendingCandidates = paymentsList
          .filter((p) => p.clientId === matchedClient.id && p.status === 'Pending')
          .sort((a, b) => {
            const diffA = Math.abs((a.amountAED || 0) - amountAED);
            const diffB = Math.abs((b.amountAED || 0) - amountAED);
            if (Math.abs(diffA - diffB) > 0.25) return diffA - diffB;
            return getMs(b.createdAt || b.paymentDate) - getMs(a.createdAt || a.paymentDate);
          });
        const targetPay = pendingCandidates[0];

        if (targetPay) {
          await updateDoc(doc(db, 'payments', targetPay.id), cleanData({
            status: 'Paid',
            amountPaidAED: amountAED > 0 ? amountAED : (targetPay.amountAED || amountAED),
            outstandingBalanceAED: 0,
            transactionReference: chargeId,
            stripePaymentIntentId: piId || chargeId,
            paymentMethod: 'Stripe',
            paymentDate: recordDate,
            notes: `Synchronized and verified live from Stripe API (${chargeId})`,
          }));
          targetPay.status = 'Paid';

          if (targetPay.packageId && targetPay.packageId !== 'NONE') {
            const pkg = packagesList.find((p) => p.id === targetPay.packageId);
            if (pkg) {
              await activatePkg(pkg, targetPay.id, chargeId, matchedClient, amountAED);
            }
          }
          reconciledCount++;
          syncedCount++;
          continue;
        }
      }

      if (!isPending) {
        const payId = isFailed
          ? `PAY-FAILED-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`
          : `PAY-STRIPE-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const baseAmt = Math.round((amountAED / 1.05) * 100) / 100;
        const vatAmt = Math.round((amountAED - baseAmt) * 100) / 100;

        let resolvedPkgId = c.metadata?.packageId || linkedSession?.metadata?.packageId || 'NONE';
        let resolvedPkgName = c.metadata?.packageName || linkedSession?.metadata?.packageName || (isFailed ? 'Declined Package Payment' : (c.description || 'Personal Training Package'));

        if (!isFailed && matchedClient && resolvedPkgId === 'NONE') {
          const matchingPendingPkg = packagesList.find((p) => p.clientId === matchedClient.id && p.status === 'Pending Payment');
          if (matchingPendingPkg) {
            resolvedPkgId = matchingPendingPkg.id;
            resolvedPkgName = matchingPendingPkg.packageName;
            await activatePkg(matchingPendingPkg, payId, chargeId, matchedClient, amountAED);
            reconciledCount++;
          } else {
            const alreadyLinked = packagesList.find(
              (p) => p.paymentReference === chargeId || p.paymentReference === payId || p.paymentReference === piId
            );
            if (!alreadyLinked) {
              const matchedDef = pkgDefsList.find(
                (d) =>
                  d.id === (c.metadata?.packageDefinitionId || linkedSession?.metadata?.packageDefinitionId) ||
                  Math.abs((d.priceAED || 0) - amountAED) < 0.25 ||
                  Math.abs((d.priceAED || 0) * 1.05 - amountAED) < 0.25
              );
              const sessCount = parseInt(c.metadata?.sessionCount || '', 10) || matchedDef?.sessionCount;
              if (matchedDef || sessCount) {
                const newPkgId = `PKG-SYNC-${chargeId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
                const expiryDate = toDubaiDate(safeCreatedMs + (matchedDef?.validityDays || 30) * 86400000);
                const totalSess = sessCount || 12;
                resolvedPkgId = newPkgId;
                resolvedPkgName = matchedDef?.name || `${totalSess} Sessions Package`;

                const syncedPkg: ClientPackage = {
                  id: newPkgId,
                  clientId: matchedClient.id,
                  packageDefinitionId: matchedDef?.id || 'PKG-STRIPE-SYNC',
                  packageName: resolvedPkgName,
                  basePriceAED: baseAmt,
                  vatAmountAED: vatAmt,
                  packagePriceAED: amountAED,
                  totalSessions: totalSess,
                  completedSessions: 0,
                  refundedSessions: 0,
                  lateCancellationDeductions: 0,
                  noShowDeductions: 0,
                  expiredSessions: 0,
                  remainingSessions: totalSess,
                  startDate: recordDate,
                  expiryDate,
                  status: 'Active',
                  paymentReference: payId,
                  purchasedAt: isoTimestamp,
                };
                await setDoc(doc(db, 'clientPackages', newPkgId), cleanData(syncedPkg));
                packagesList.push(syncedPkg);
                await activatePkg(syncedPkg, payId, chargeId, matchedClient, amountAED);
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
          amountPaidAED: isFailed ? 0 : amountAED,
          outstandingBalanceAED: isFailed ? amountAED : 0,
          paymentDate: recordDate,
          paymentMethod: 'Stripe',
          transactionReference: chargeId,
          stripePaymentIntentId: piId || chargeId,
          status: isFailed ? 'Failed' : 'Paid',
          notes: isFailed
            ? `Stripe Card Declined: ${failureMsg} (${failureCode})${candidateEmail ? ` • Email: ${candidateEmail}` : ''}`
            : `Synchronized from Stripe API (${chargeId}) for ${clientName}${candidateEmail && !matchedClient ? ` • Stripe Email: ${candidateEmail}` : ''}`,
          createdAt: isoTimestamp,
        };

        await setDoc(doc(db, 'payments', payId), cleanData(payRecord));
        paymentsList.push(payRecord);
        syncedCount++;
        if (isFailed) newFailuresCount++;
      }
    } else {
      const needsClientHeal =
        matchedClient &&
        (existingPay.clientId === 'PENDING_MATCH' || existingPay.clientId === 'UNKNOWN' || existingPay.clientId === 'UNMATCHED' || existingPay.clientId === 'UNKNOWN_CLIENT');
      if (isFailed && (existingPay.status !== 'Failed' || needsClientHeal)) {
        await updateDoc(doc(db, 'payments', existingPay.id), cleanData({
          clientId: matchedClient ? matchedClient.id : existingPay.clientId,
          status: 'Failed',
          notes: `Stripe Card Declined: ${failureMsg} (${failureCode})`,
        }));
        syncedCount++;
        if (existingPay.status !== 'Failed') newFailuresCount++;
      } else if (!isFailed && !isPending && (existingPay.status !== 'Paid' || needsClientHeal)) {
        await updateDoc(doc(db, 'payments', existingPay.id), cleanData({
          clientId: matchedClient ? matchedClient.id : existingPay.clientId,
          status: 'Paid',
          amountPaidAED: existingPay.amountAED || amountAED,
          outstandingBalanceAED: 0,
          paymentMethod: 'Stripe',
          transactionReference: chargeId,
          stripePaymentIntentId: piId || chargeId,
          notes: `Synchronized and verified live from Stripe API (${chargeId})`,
        }));
        existingPay.status = 'Paid';
        reconciledCount++;
        syncedCount++;

        if (existingPay.packageId && existingPay.packageId !== 'NONE') {
          const pkg = packagesList.find((p) => p.id === existingPay.packageId);
          if (pkg && pkg.status !== 'Active') {
            await activatePkg(pkg, existingPay.id, chargeId, matchedClient, amountAED);
          }
        }
      }
    }
  }

  for (const pi of paymentIntents) {
    if (pi.status === 'requires_payment_method' && pi.last_payment_error && !pi.latest_charge) {
      const piId = pi.id;
      const exists = paymentsList.some(
        (p) => p.transactionReference === piId || (p as any).stripePaymentIntentId === piId
      );
      if (!exists) {
        const { matchedClient, candidateEmail } = resolveClient(pi);
        const amountAED = pi.amount ? pi.amount / 100 : 0;
        const payId = `PAY-FAILED-${piId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const safeMs = pi.created ? (pi.created > 1e11 ? pi.created : pi.created * 1000) : Date.now();
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
          paymentDate: toDubaiDate(safeMs),
          paymentMethod: 'Stripe',
          transactionReference: piId,
          stripePaymentIntentId: piId,
          status: 'Failed',
          notes: `Stripe Payment Failed: ${pi.last_payment_error.message || 'Card declined'} (${pi.last_payment_error.code || 'card_declined'})`,
          createdAt: new Date(safeMs).toISOString(),
        };
        await setDoc(doc(db, 'payments', payId), cleanData(failedRecord));
        paymentsList.push(failedRecord);
        syncedCount++;
        newFailuresCount++;
      }
    }
  }

  return { syncedCount, newFailuresCount, reconciledCount, charges };
}

/**
 * Universal Stripe Webhook Handler Helper.
 * Can be called by:
 * - Express request handlers (`app.post('/api/stripe/webhook', ...)`)
 * - Google Cloud Functions / Firebase Cloud Functions (`onRequest(stripeWebhookCloudFunction)`)
 * - Direct unit tests or administrative event replay tools
 */
export async function handleStripeWebhookPayload(
  payloadStrOrObj: string | Buffer | Record<string, any>,
  signatureHeader?: string,
  webhookSecret?: string
): Promise<StripeWebhookResult> {
  let event: any;

  if (typeof payloadStrOrObj === 'string' || Buffer.isBuffer(payloadStrOrObj)) {
    const rawBody = payloadStrOrObj.toString();

    // Verify signature if secret is provided
    if (webhookSecret && signatureHeader) {
      const isValid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
      if (!isValid) {
        return {
          received: false,
          status: 'error',
          eventType: 'unknown',
          message: 'Stripe signature verification failed.',
        };
      }
    }

    try {
      event = JSON.parse(rawBody);
    } catch (e: any) {
      return {
        received: false,
        status: 'error',
        eventType: 'unknown',
        message: `Invalid JSON payload: ${e.message}`,
      };
    }
  } else {
    event = payloadStrOrObj;
  }

  const eventType = event.type || 'unknown';

  // Process successful payment events
  switch (eventType) {
    case 'payment_intent.succeeded':
    case 'charge.succeeded':
    case 'checkout.session.completed':
    case 'invoice.payment_succeeded':
      return await processStripePaymentSuccess(event);

    case 'charge.failed':
    case 'payment_intent.payment_failed':
      return await processStripePaymentFailure(event);

    default:
      return {
        received: true,
        status: 'ignored',
        eventType,
        message: `Stripe event ${eventType} acknowledged (no session credit update required).`,
      };
  }
}

/**
 * Standard Firebase / Google Cloud Function HTTP handler export.
 * Signature: (req, res) compatible with Google Cloud Functions Gen 1 & Gen 2 and Express.
 *
 * Example Firebase deployment in functions/index.ts:
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { stripeWebhookCloudFunction } from './stripeWebhookHelper';
 * export const stripeWebhook = onRequest({ cors: false }, stripeWebhookCloudFunction);
 */
export async function stripeWebhookCloudFunction(req: any, res: any): Promise<void> {
  const sig = req.headers ? req.headers['stripe-signature'] : undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const rawBody = req.body;
    let payload = rawBody;

    // Handle express.raw or buffer or parsed object
    if (typeof rawBody === 'string' || Buffer.isBuffer(rawBody)) {
      payload = rawBody;
    } else if (rawBody && typeof rawBody === 'object') {
      payload = JSON.stringify(rawBody);
    }

    const result = await handleStripeWebhookPayload(payload, sig, webhookSecret);

    if (!result.received && result.status === 'error') {
      res.status(400).json(result);
    } else {
      res.status(200).json(result);
    }
  } catch (err: any) {
    console.error('[Cloud Function Webhook Handler Error]:', err);
    res.status(500).json({
      received: false,
      status: 'error',
      message: err?.message || 'Internal error handling Stripe webhook',
    });
  }
}
