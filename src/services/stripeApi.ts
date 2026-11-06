/**
 * Real Stripe API Integration Service
 * Makes direct HTTPS requests to Stripe's API (https://api.stripe.com/v1/charges)
 * using the configured Stripe Secret Key (sk_test_... or sk_live_...) so transactions
 * immediately reflect in the user's official Stripe Account Dashboard.
 */

export interface StripeChargeRequest {
  secretKey: string;
  amountAED: number; // Amount in AED
  description: string;
  statementDescriptor?: string;
  receiptEmail?: string;
  cardToken?: string; // e.g. tok_visa, tok_mastercard, tok_amex, tok_chargeDeclined
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
      message: 'Stripe Secret Key missing. Please provide your sk_test_... or sk_live_... key in Settings.',
    };
  }

  // Convert AED amount to minor currency units (Fils: 1 AED = 100 Fils)
  const amountInFils = Math.round(req.amountAED * 100);

  // Build URL-encoded form data payload for Stripe REST API
  const params = new URLSearchParams();
  params.append('amount', amountInFils.toString());
  params.append('currency', 'aed');
  params.append('source', req.cardToken || 'tok_visa');
  params.append('description', req.description);

  if (req.statementDescriptor) {
    // Statement descriptor suffix must be alphanumeric/spaces and <= 22 chars
    const cleanDescriptor = req.statementDescriptor.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 22).trim();
    if (cleanDescriptor) {
      params.append('statement_descriptor_suffix', cleanDescriptor);
    }
  }

  if (req.receiptEmail) {
    params.append('receipt_email', req.receiptEmail);
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMessage = data.error?.message || `Stripe API error (${response.status}): ${response.statusText}`;
      return {
        success: false,
        message: errMessage,
        rawError: data.error,
      };
    }

    // Successfully created charge in real Stripe account
    return {
      success: true,
      stripeChargeId: data.id,
      stripePaymentIntentId: data.payment_intent || data.id,
      status: data.status,
      livemode: data.livemode,
      message: `Charge successfully recorded in Stripe Dashboard! (ID: ${data.id})`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to connect to Stripe API: ${error?.message || 'Network error'}`,
    };
  }
}
