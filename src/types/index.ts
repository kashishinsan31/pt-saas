export type UserRole = 'admin' | 'trainer' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  password?: string;
  avatarUrl?: string;
  associatedId?: string; // clientId or trainerId
  createdAt: string;
}

export interface BodyMetricEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  muscleMassKg?: number;
  bodyFatPercentage?: number;
  habitConsistencyScore?: number; // 0 - 100%
  waterLitres?: number;
  notes?: string;
}

export interface Client {
  id: string; // e.g. WW-CL-1001
  userId?: string;
  fullName: string;
  password?: string;
  profilePhoto?: string;
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  email: string;
  whatsappNumber: string; // with country code, e.g. +971501234567
  residentialAddress: string;
  communityName: string; // e.g. Dubai Marina, Palm Jumeirah, Downtown Dubai
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  additionalNotes?: string;
  assignedTrainerId: string;
  status: 'Active' | 'Inactive' | 'Archived';
  stripeCustomerId?: string;
  activePackageId?: string;
  sessionCreditsRemaining?: number;
  healthDeclaration?: HealthDeclaration;
  healthIssues?: HealthIssueNote[];
  bodyMetrics?: BodyMetricEntry[];
  createdAt: string;
}

export type HealthIssueCategory =
  | 'Injury'
  | 'Cardiovascular'
  | 'Chronic Condition'
  | 'Surgery'
  | 'Allergy'
  | 'Doctor Clearance'
  | 'Medication'
  | 'Physical Restriction'
  | 'General Health';

export type HealthIssueSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';
export type HealthIssueStatus = 'Active' | 'Monitoring' | 'Resolved';

export interface HealthIssueNote {
  id: string;
  category: HealthIssueCategory;
  title: string;
  description: string;
  severity: HealthIssueSeverity;
  status: HealthIssueStatus;
  dateReported: string; // YYYY-MM-DD
  recordedBy: string; // Admin, Trainer name, etc.
  trainerAlert: boolean; // Flag to show high visibility alert to trainers before sessions
  affectedArea?: string; // e.g. "Lumbar spine", "Right shoulder", "Knee"
  treatmentPlan?: string; // Training modification / doctor instructions
}

export interface HealthDeclaration {
  signed: boolean;
  signedAt?: string; // ISO string (Asia/Dubai)
  signatureDataUrl?: string; // Digital signature PNG data URL
  clientName: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hasHeartCondition: boolean;
  hasChestPain: boolean;
  hasDizzinessOrFainting: boolean;
  hasBoneJointIssue: boolean;
  hasBloodPressureIssue: boolean;
  hasAsthmaOrBreathing: boolean;
  hasChronicIllness: boolean;
  isPregnantOrRecentPostpartum: boolean;
  additionalMedicalDetails?: string;
  doctorClearanceProvided?: boolean;
  agreedToDeclaration: boolean;
  witnessOrTrainerName?: string;
}


export interface Trainer {
  id: string; // e.g. WW-TR-2001
  userId?: string;
  fullName: string;
  password?: string;
  profilePhoto?: string;
  email: string;
  whatsappNumber: string;
  specialization: string; // e.g. Strength & Conditioning, Fat Loss, Posture Correction
  employmentStatus: 'Full-Time' | 'Part-Time' | 'Contractor';
  status: 'Active' | 'Inactive';
  bio?: string;
  createdAt: string;
}

export interface PackageDefinition {
  id: string;
  name: string;
  sessionCount: number;
  priceAED: number; // Base price excluding 5% VAT
  discountPercentage?: number; // e.g. 10 for 10% discount
  validityDays: number; // default 30
  sessionDurationMinutes: number; // e.g. 60
  trainingFrequency: string; // e.g. 3x weekly
  description: string;
  status: 'Active' | 'Inactive';
}

export type ClientPackageStatus = 'Active' | 'Pending Payment' | 'Completed' | 'Expired' | 'Cancelled' | 'Superseded';

export interface ClientPackage {
  id: string; // e.g. PKG-2026-901
  clientId: string;
  packageDefinitionId: string;
  packageName: string;
  basePriceAED?: number; // Base price before VAT
  vatAmountAED?: number; // 5% UAE VAT
  packagePriceAED: number; // Total price including VAT
  totalSessions: number;
  completedSessions: number;
  refundedSessions: number;
  lateCancellationDeductions: number;
  noShowDeductions: number;
  expiredSessions: number;
  remainingSessions: number; // total - completed - late - noShow - expired + refunded
  startDate: string; // YYYY-MM-DD (Dubai time)
  expiryDate: string; // YYYY-MM-DD (30 calendar days after startDate)
  originalExpiryDate?: string;
  expiryExtensionReason?: string;
  extendedByAdminId?: string;
  extendedAt?: string;
  status: ClientPackageStatus;
  paymentReference: string;
  subscriptionReference?: string;
  purchasedAt: string;
}

export type BookingStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled by Client'
  | 'Cancelled by Trainer'
  | 'Rescheduled'
  | 'Late Cancellation'
  | 'No Show';

export interface SessionBooking {
  id: string; // e.g. BOK-8801
  clientId: string;
  trainerId: string;
  packageId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  durationMinutes: number;
  location: string; // Client Villa / Gym / Park
  status: BookingStatus;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: 'client' | 'trainer' | 'admin';
  creditImpact?: 'refunded' | 'deducted' | 'none';
  completedAt?: string;
  workoutNotes?: string;
  trainerRating?: number;
  sessionRating?: number;
  clientReview?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type TransactionType =
  | 'PURCHASE_ALLOCATION'
  | 'SESSION_COMPLETED'
  | 'ON_TIME_CANCELLATION_REFUND'
  | 'LATE_CANCELLATION_DEDUCTION'
  | 'TRAINER_CANCELLATION_REFUND'
  | 'ADMIN_CANCELLATION_REFUND'
  | 'ADMIN_CANCELLATION_DEDUCTION'
  | 'NO_SHOW_DEDUCTION'
  | 'AUTOMATIC_EXPIRY_DEDUCTION'
  | 'ADMIN_MANUAL_ADJUSTMENT';

export interface SessionTransaction {
  id: string;
  clientId: string;
  packageId: string;
  sessionId?: string;
  timestamp: string; // ISO string in Dubai time
  type: TransactionType;
  creditChange: number; // positive or negative
  previousBalance: number;
  newBalance: number;
  reason: string;
  responsibleUserId: string; // admin, trainer, client ID or system
  responsibleRole: UserRole | 'system';
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Card' | 'Online Payment' | 'Stripe';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Failed' | 'Refunded' | 'Superseded';

export interface PaymentRecord {
  id: string; // PAY-7701
  clientId: string;
  packageId: string;
  packageName: string;
  baseAmountAED?: number; // Base price excluding VAT
  discountAmountAED?: number; // Discount applied
  discountCode?: string; // e.g. PROMO10, VIP20
  subtotalAED?: number; // Base - Discount
  vatAmountAED?: number; // 5% UAE VAT added separately
  amountAED: number; // Total AED payable (Subtotal + VAT)
  amountPaidAED: number;
  outstandingBalanceAED: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  status: PaymentStatus;
  receiptUrl?: string;
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: string;
}

export interface SavedCard {
  id: string;
  clientId: string;
  cardHolder: string;
  brand: string; // Visa, Mastercard, Amex
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  stripeCustomerId?: string;
  stripeToken?: string;
  createdAt: string;
}

export type SubscriptionStatus = 'Active' | 'Pending' | 'Payment Failed' | 'Past Due' | 'Cancelled';

export interface SubscriptionRecord {
  id: string; // SUB-4401
  clientId: string;
  packageDefinitionId: string;
  packageName: string;
  amountAED: number;
  cardBrand: string; // e.g. Visa, Mastercard
  last4Digits: string; // e.g. 5821
  startDate: string;
  nextPaymentDate: string;
  lastPaymentDate: string;
  status: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  authorizationConsentGiven: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // client, trainer or admin
  title: string;
  message: string;
  type: 'booking' | 'cancellation' | 'expiry' | 'payment' | 'subscription' | 'system';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole | 'system';
  action: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  companyName: string;
  companyLogoUrl?: string;
  currency: string; // AED
  timezone: string; // Asia/Dubai
  taxRegistrationNumber?: string; // UAE FTA 15-digit TRN
  customDomain?: string; // e.g. app.waiterwalk.ae
  defaultPackageValidityDays: number; // 30
  cancellationThresholdHours: number; // 12
  defaultSessionDurationMinutes: number; // 60
  stripePublishableKey: string;
  stripeLivePublishableKey?: string;
  stripeSecretKey?: string;
  stripeLiveSecretKey?: string;
  stripeStatementDescriptor?: string;
  stripeMode: 'test' | 'live';
  whatsappNotificationEnabled: boolean;
  emailNotificationEnabled: boolean;
  clientPdfReceiptEnabled: boolean;
  paymentTermsAndConditions?: string;
  healthDeclarationText?: string;
}

export interface DashboardSlide {
  id: string;
  badge: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  description: string;
  actionText: string;
  actionTab?: string;
  gradient?: string;
  statLabel?: string;
  statValue?: string;
}

export interface PromoCode {
  id: string; // e.g. PROMO-1001
  code: string; // e.g. WELCOME10, uppercase
  description?: string;
  discountType: 'percentage' | 'fixed'; // '%' or 'AED'
  discountValue: number; // e.g. 10 (%) or 100 (AED)
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  maxUses?: number; // optional limit
  currentUses: number;
  minOrderAmountAED?: number; // minimum package price required
  applicablePackageIds?: string[]; // specific package IDs or empty for all
  status: 'Active' | 'Inactive' | 'Expired';
  createdAt: string;
}

