/**
 * Real-Time Stripe API Gateway Integration Service
 * Communicates directly with Stripe REST API endpoints (https://api.stripe.com/v1)
 * to tokenize cards and authorize live charges in real time.
 * Transactions immediately reflect in the official Stripe Dashboard (dashboard.stripe.com).
 */

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

  let sourceToken = req.cardToken?.trim() || '';

  // 1. If card details are provided, tokenize card with Stripe in real time
  if (req.card && req.card.number) {
    try {
      const cleanNumber = req.card.number.replace(/\s+/g, '');
      const cleanMonth = req.card.expMonth.replace(/\D/g, '');
      let cleanYear = req.card.expYear.replace(/\D/g, '');
      if (cleanYear.length === 2) {
        cleanYear = `20${cleanYear}`;
      }
      const cleanCvc = req.card.cvc.replace(/\D/g, '');

      const tokenParams = new URLSearchParams();
      tokenParams.append('card[number]', cleanNumber);
      tokenParams.append('card[exp_month]', cleanMonth);
      tokenParams.append('card[exp_year]', cleanYear);
      tokenParams.append('card[cvc]', cleanCvc);
      if (req.card.name) {
        tokenParams.append('card[name]', req.card.name.trim());
      }

      const tokenResponse = await fetch('https://api.stripe.com/v1/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || tokenData.error) {
        const errorMsg = tokenData.error?.message || 'Invalid credit card details.';
        return {
          success: false,
          message: errorMsg,
          rawError: tokenData.error,
        };
      }

      sourceToken = tokenData.id;
    } catch (tokenErr: any) {
      return {
        success: false,
        message: `Stripe tokenization error: ${tokenErr?.message || 'Network request failed.'}`,
      };
    }
  }

  if (!sourceToken) {
    return {
      success: false,
      message: 'Payment verification failed: No valid card credentials or token received.',
    };
  }

  // 2. Authorize and capture charge via Stripe API in real time
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
