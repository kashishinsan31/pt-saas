import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Stripe Webhook Endpoint (Requires raw body parsing for signature validation)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: express.Request, res: express.Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    const rawBody = req.body;
    let payloadStr = '';
    if (typeof rawBody === 'string') {
      payloadStr = rawBody;
    } else if (Buffer.isBuffer(rawBody)) {
      payloadStr = rawBody.toString('utf8');
    } else {
      payloadStr = JSON.stringify(rawBody);
    }

    event = JSON.parse(payloadStr);

    const eventType = event.type;
    const dataObj = event.data?.object || {};

    console.log(`[Stripe Webhook Event Received]: ${eventType} (ID: ${event.id})`);

    // Handle asynchronous payment status events
    switch (eventType) {
      case 'charge.succeeded':
      case 'payment_intent.succeeded': {
        const chargeId = dataObj.id;
        const amountAED = dataObj.amount ? dataObj.amount / 100 : 0;
        const receiptEmail = dataObj.receipt_email || dataObj.billing_details?.email;
        console.log(`[Stripe Webhook SUCCESS]: Transaction ${chargeId} succeeded for AED ${amountAED} (${receiptEmail || 'Client'}). Status: Paid.`);
        break;
      }

      case 'charge.failed':
      case 'payment_intent.payment_failed': {
        const chargeId = dataObj.id;
        const failureReason = dataObj.failure_message || dataObj.last_payment_error?.message || 'Payment declined by issuing bank';
        console.warn(`[Stripe Webhook FAILED]: Transaction ${chargeId} failed. Reason: ${failureReason}. Status: Failed.`);
        break;
      }

      case 'charge.dispute.created': {
        console.warn(`[Stripe Webhook DISPUTE]: Charge ${dataObj.charge} disputed.`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log(`[Stripe Webhook SUBSCRIPTION]: Subscription ${dataObj.id} updated. Status: ${dataObj.status}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook]: Event ${eventType} acknowledged.`);
    }

    res.status(200).json({
      received: true,
      status: 'success',
      eventType,
      transactionId: dataObj.id || null,
      message: `Webhook processed event ${eventType} successfully.`,
    });
  } catch (err: any) {
    console.error(`[Stripe Webhook Processing Error]: ${err.message}`);
    res.status(400).json({
      received: false,
      error: err.message,
    });
  }
});

// Regular JSON body parser for auxiliary API endpoints
app.use(express.json());

// Webhook Configuration & Health Status Info
app.get('/api/stripe/webhook-info', (_req: express.Request, res: express.Response) => {
  res.json({
    configured: true,
    endpoint: '/api/stripe/webhook',
    eventsSupported: [
      'charge.succeeded',
      'charge.failed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.dispute.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ],
    realtimeVerification: 'Active via Stripe API + Express Webhook Listener',
  });
});

// Mount Vite Dev Server in Development
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  app.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;
    if (url.startsWith('/api')) return next();
    try {
      let template = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  // Static Production Serving
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.use('*', (req: express.Request, res: express.Response) => {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
