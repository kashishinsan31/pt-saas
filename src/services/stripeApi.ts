import { loadStripe, Stripe } from '@stripe/stripe-js';

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

  if (!sourceToken) {
    return {
      success: false,
      message: 'PCI-DSS Compliance Error: Card must be securely tokenized via Stripe Elements (Stripe.js) before charging. Raw card numbers cannot be transmitted directly.',
    };
  }

  // Authorize and capture charge via Stripe API in real time using the secure token
  const chargeParams = new URLSearchParams();
  chargeParams.append('amount', amountInFils.toString());
  chargeParams.append('currency', 'aed');
  chargeParams.append('source', sourceToken);
  chargeParams.append('description', req.description);

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
 * Validates Stripe Secret Key and verifies account connectivity in real time
 */
export async function verifyStripeConnection(
  secretKey: string
): Promise<{ success: boolean; message: string; livemode?: boolean }> {
  const cleanKey = secretKey?.trim();
  if (!cleanKey) {
    return {
      success: false,
      message: 'Please enter a Stripe Secret Key (sk_test_... or sk_live_...) to test connectivity.',
    };
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        message: data.error?.message || 'Invalid Stripe API key.',
      };
    }

    return {
      success: true,
      livemode: data.livemode,
      message: `Stripe Gateway Connected! Mode: ${data.livemode ? 'Live Production (sk_live_...)' : 'Test Sandbox (sk_test_...)'}. Live charges are ready to process.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error connecting to Stripe: ${err?.message || 'Check your internet connection.'}`,
    };
  }
}
