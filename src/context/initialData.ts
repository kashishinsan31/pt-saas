import {
  User,
  Client,
  Trainer,
  PackageDefinition,
  ClientPackage,
  SessionBooking,
  SessionTransaction,
  PaymentRecord,
  SubscriptionRecord,
  AuditLogItem,
  SystemSettings,
  NotificationItem,
  SavedCard,
  DashboardSlide,
  PromoCode,
} from '../types';
import { formatDubaiDate } from '../utils/dubaiTime';

// Base date reference
const todayStr = formatDubaiDate(new Date());

/**
 * Clean Production State:
 * All dummy clients, dummy trainers, dummy bookings, dummy payments, dummy transactions,
 * and dummy saved cards have been removed for pristine real-world 1-week testing.
 * Chief Admin account is preserved for login access.
 */

export const initialUsers: User[] = [
  {
    id: 'USR-ADMIN-1',
    email: 'admin@waiterwalk.ae',
    role: 'admin',
    name: 'Chief Admin (Waiter Walk)',
    password: 'Dubai2026!',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// Clean: 0 dummy trainers
export const initialTrainers: Trainer[] = [];

// Clean: 0 dummy clients
export const initialClients: Client[] = [];

// Standard Service Package Offerings (Ready for assigning/purchasing)
export const initialPackageDefinitions: PackageDefinition[] = [
  {
    id: 'PKG-DEF-4',
    name: '4 Sessions Package',
    sessionCount: 4,
    priceAED: 500,
    validityDays: 30,
    sessionDurationMinutes: 60,
    trainingFrequency: '1x per week',
    description: 'Ideal for trial sessions or maintaining fitness routine in Dubai.',
    status: 'Active',
  },
  {
    id: 'PKG-DEF-8',
    name: '8 Sessions Package',
    sessionCount: 8,
    priceAED: 900,
    validityDays: 30,
    sessionDurationMinutes: 60,
    trainingFrequency: '2x per week',
    description: 'Standard bi-weekly training program for steady body transformation.',
    status: 'Active',
  },
  {
    id: 'PKG-DEF-12',
    name: '12 Sessions Package',
    sessionCount: 12,
    priceAED: 1200,
    validityDays: 30,
    sessionDurationMinutes: 60,
    trainingFrequency: '3x per week',
    description: 'Most popular package! High frequency transformation routine.',
    status: 'Active',
  },
  {
    id: 'PKG-DEF-20',
    name: '20 Sessions Package',
    sessionCount: 20,
    priceAED: 1800,
    validityDays: 30,
    sessionDurationMinutes: 60,
    trainingFrequency: '5x per week',
    description: 'Elite intensive personal training regimen for maximum results.',
    status: 'Active',
  },
];

// Clean: 0 dummy client packages
export const initialClientPackages: ClientPackage[] = [];

// Clean: 0 dummy session bookings
export const initialBookings: SessionBooking[] = [];

// Clean: 0 dummy transactions
export const initialTransactions: SessionTransaction[] = [];

// Clean: 0 dummy payments
export const initialPayments: PaymentRecord[] = [];

// Clean: 0 dummy saved cards
export const initialSavedCards: SavedCard[] = [];

// Clean: 0 dummy subscriptions
export const initialSubscriptions: SubscriptionRecord[] = [];

// Clean: 0 dummy notifications
export const initialNotifications: NotificationItem[] = [];

// Production audit log initialization
export const initialAuditLogs: AuditLogItem[] = [
  {
    id: 'LOG-PROD-INIT',
    timestamp: `${todayStr}T09:00:00Z`,
    userId: 'USR-ADMIN-1',
    userName: 'Chief Admin',
    userRole: 'admin',
    action: 'PRODUCTION_ENVIRONMENT_INITIALIZED',
    details: 'Clean production database initialized for Waiter Walk PTMS testing.',
  },
];

export const initialSettings: SystemSettings = {
  companyName: 'Waiter Walk Fitness & Wellness',
  companyLogoUrl: '/logo.png',
  currency: 'AED',
  timezone: 'Asia/Dubai',
  taxRegistrationNumber: '100293847500003',
  customDomain: 'app.waiterwalk.ae',
  defaultPackageValidityDays: 30,
  cancellationThresholdHours: 12,
  defaultSessionDurationMinutes: 60,
  stripePublishableKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY : '').trim(),
  stripeLivePublishableKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY) ? (import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) : '').trim(),
  stripeSecretKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_SECRET_KEY ? import.meta.env.VITE_STRIPE_SECRET_KEY : '').trim(),
  stripeLiveSecretKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_STRIPE_LIVE_SECRET_KEY || import.meta.env?.VITE_STRIPE_SECRET_KEY) ? (import.meta.env.VITE_STRIPE_LIVE_SECRET_KEY || import.meta.env.VITE_STRIPE_SECRET_KEY) : '').trim(),
  stripeStatementDescriptor: 'WAITER WALK DUBAI',
  stripeMode: 'test',
  whatsappNotificationEnabled: true,
  emailNotificationEnabled: true,
  clientPdfReceiptEnabled: true,
  paymentTermsAndConditions: `WAITER WALK FITNESS & WELLNESS LLC - DUBAI, UAE
CLIENT PAYMENT TERMS & CONDITIONS

1. STRICT 30-CALENDAR-DAY PACKAGE EXPIRATION
All personal training session packages purchased with Waiter Walk expire exactly 30 calendar days from the date of purchase or package activation. Unused session credits upon expiration are strictly non-refundable and forfeited in accordance with standard Dubai PTMS operating policies. Package validity extensions are granted solely at the discretion of executive administration under certified DHA medical grounds.

2. 12-HOUR CANCELLATION & RESCHEDULING WINDOW
Sessions cancelled or rescheduled with at least twelve (12) hours advance notice prior to the scheduled session start time will have their credit returned in full to the client package wallet. Cancellations requested less than 12 hours before the session start time, as well as unannounced client no-shows, will be forfeited and deducted in full as a late cancellation charge. In the event of a trainer cancellation, the session credit is automatically preserved and credited back with priority rescheduling.

3. RECURRING BILLING & STRIPE PAYMENTS
Clients enrolled in 30-day recurring subscription packages authorize Waiter Walk to automatically process cycle renewal charges via Stripe payment processing every 30 calendar days. Subscriptions may be cancelled, modified, or paused anytime via the Client Portal or by contacting management prior to the next billing cycle.

4. 5% UAE VAT & TAX INVOICING
All package prices are quoted in United Arab Emirates Dirhams (AED) and are subject to 5% UAE Value Added Tax (VAT) in compliance with Federal Tax Authority (FTA) regulations. Official electronic tax receipts and invoices are generated upon each successful transaction.

5. NON-TRANSFERABILITY & REFUND POLICY
Personal training session packages are personal and non-transferable to other clients or family members. Package refunds are strictly subject to management discretion and require supporting medical documentation.`,
  healthDeclarationText: `PHYSICAL ACTIVITY READINESS & HEALTH DECLARATION (PAR-Q)
WAITER WALK FITNESS & WELLNESS LLC - DUBAI, UAE

I hereby declare and confirm that the health, fitness, and medical history information provided to Waiter Walk Fitness & Wellness is accurate, truthful, and complete to the best of my knowledge.

1. MEDICAL FITNESS TO EXERCISE
I understand that strenuous physical exercise, strength conditioning, and fitness assessments carry inherent physical risks. I declare that I have disclosed all known cardiovascular, orthopedic, respiratory, metabolic, and surgical conditions to my personal trainer and management.

2. OBLIGATION TO INFORM
If my health status changes at any point during my training program (including pregnancy, chest discomfort, shortness of breath, joint injury, or new prescription medication), I agree to notify my assigned trainer immediately before undertaking any further exercise sessions.

3. MEDICAL CLEARANCE
If I experience any symptoms or answered 'Yes' to any cardiovascular or chronic condition indicators, I confirm that I have consulted with a certified medical doctor (DHA or equivalent) and obtained clearance to participate in physical conditioning.

4. VOLUNTARY ASSUMPTION OF RISK & WAIVER
I voluntarily engage in physical training, strength conditioning, and lifestyle coaching. I release Waiter Walk Fitness & Wellness, its coaches, and management from liability for injuries resulting from non-disclosure of medical conditions or failure to follow coach instructions.

By signing electronically below, I legally confirm my agreement and acknowledge that this electronic signature has the same legal validity as a hand-written signature in the United Arab Emirates.`,
};

export const initialSlides: DashboardSlide[] = [
  {
    id: 'slide-1',
    badge: 'WAITER WALK PTMS',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    title: 'Dubai Personal Training Operations',
    subtitle: 'Asia/Dubai GST • 30-Day Package Cycle',
    description:
      'Strict 30-day package expiry engine and 12-hour cancellation protection active across Palm Jumeirah & Dubai Marina training facilities.',
    gradient: 'from-blue-900 via-indigo-950 to-slate-900',
    actionText: 'View Calendar',
    actionTab: 'calendar',
    statLabel: 'System Status',
    statValue: 'Production Ready',
  },
  {
    id: 'slide-2',
    badge: 'AUTO-DEDUCTION ENGINE',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    title: 'Stripe 30-Day Auto-Renewal System',
    subtitle: 'Zero Interruptions • Guaranteed Credits',
    description:
      'Recurring payments automatically allocate fresh session credits to client wallets, ensuring seamless workout progression.',
    gradient: 'from-emerald-950 via-slate-900 to-teal-950',
    actionText: 'Manage Payments',
    actionTab: 'payments',
    statLabel: 'Auto-Pay Status',
    statValue: 'Continuous Sweeper Active',
  },
  {
    id: 'slide-3',
    badge: '12-HOUR CANCELLATION GUARD',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    title: 'Fair Booking & Credit Rules',
    subtitle: 'On-Time Refunds vs Late Deductions',
    description:
      'Sessions cancelled ≥12 hours prior return 100% of credits to the package. Trainer cancellations are always fully refunded.',
    gradient: 'from-amber-950 via-slate-900 to-orange-950',
    actionText: 'Session Schedule',
    actionTab: 'sessions',
    statLabel: 'Strict Policy',
    statValue: '12h Window',
  },
  {
    id: 'slide-4',
    badge: 'DUBAI VIP WELLNESS',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    title: 'Personal Training Team',
    subtitle: 'Elite Certified Coaches',
    description:
      'Register your trainers to manage schedules, track attendance, and log client workout progress in Dubai.',
    gradient: 'from-purple-950 via-slate-900 to-indigo-950',
    actionText: 'Trainer Team',
    actionTab: 'trainers',
    statLabel: 'Staff Management',
    statValue: 'Ready to Register',
  },
];

// Initial Active Promo Codes with customizable validity & discounts
export const initialPromoCodes: PromoCode[] = [
  {
    id: 'PROMO-1001',
    code: 'WELCOME10',
    description: 'Welcome promotion for new Dubai clients (10% off any package)',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 100,
    currentUses: 0,
    minOrderAmountAED: 500,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'PROMO-1002',
    code: 'VIP20',
    description: 'VIP 20% transformation package discount for committed trainees',
    discountType: 'percentage',
    discountValue: 20,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 50,
    currentUses: 0,
    minOrderAmountAED: 900,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'PROMO-1003',
    code: 'DUBAI100',
    description: 'Flat AED 100 voucher off any 12 or 20 session package',
    discountType: 'fixed',
    discountValue: 100,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 30,
    currentUses: 0,
    minOrderAmountAED: 1000,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  },
];
