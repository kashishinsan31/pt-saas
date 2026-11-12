import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  stripeWebhookCloudFunction,
  handleStripeWebhookPayload,
} from './src/server/stripeWebhookHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Stripe Webhook Endpoint (Uses Cloud Function helper with raw body parsing for signature verification)
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response) => {
    return stripeWebhookCloudFunction(req, res);
  }
);

// Regular JSON body parser for auxiliary API endpoints
app.use(express.json());

// Simulated Webhook Test Endpoint (for admin testing and automated verification without live Stripe signatures)
app.post('/api/stripe/simulate-webhook', async (req: express.Request, res: express.Response) => {
  try {
    const payload = req.body;
    console.log('[Stripe Webhook Simulation]: Processing test event...');
    const result = await handleStripeWebhookPayload(payload);
    res.status(result.status === 'error' && !result.received ? 400 : 200).json(result);
  } catch (err: any) {
    console.error('[Stripe Webhook Simulation Error]:', err);
    res.status(500).json({
      received: false,
      status: 'error',
      message: err?.message || 'Error processing webhook simulation',
    });
  }
});

// Webhook Configuration & Health Status Info
app.get('/api/stripe/webhook-info', (_req: express.Request, res: express.Response) => {
  res.json({
    configured: true,
    endpoint: '/api/stripe/webhook',
    simulationEndpoint: '/api/stripe/simulate-webhook',
    cloudFunctionHelper: 'src/server/stripeWebhookHelper.ts',
    cloudFunctionEntrypoint: 'stripeWebhookCloudFunction',
    automatedFirestoreCreditAllocation: true,
    eventsSupported: [
      'charge.succeeded',
      'payment_intent.succeeded',
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'charge.failed',
      'payment_intent.payment_failed',
    ],
    realtimeVerification: 'Active via Stripe Webhook Cloud Function + Firestore Credit Allocator',
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
