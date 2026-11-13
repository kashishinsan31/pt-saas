/**
 * Timezone and Date utilities for Asia/Dubai (GST, UTC+4)
 */

export const DUBAI_TIMEZONE = 'Asia/Dubai';

/**
 * Returns current Date object
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Formats a Date or ISO string into YYYY-MM-DD in Dubai time
 */
export function formatDubaiDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  // Use Intl to format as YYYY-MM-DD in Asia/Dubai
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns formatted readable date (e.g. "01 Nov 2026")
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: DUBAI_TIMEZONE,
  }).format(d);
}

/**
 * Formats an ISO timestamp or Date into readable Dubai time (e.g. "10:58 PM GST").
 * Returns empty string for bare YYYY-MM-DD strings without a time component.
 */
export function formatDubaiTime(dateOrIso?: string | Date): string {
  if (!dateOrIso) return '';
  if (typeof dateOrIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso.trim())) {
    return '';
  }
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: DUBAI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${formatted} GST`;
}

/**
 * Formats an ISO timestamp or Date into readable date & time in Asia/Dubai timezone.
 */
export function formatDubaiDateTime(dateOrIso?: string | Date, fallbackDateStr?: string): string {
  if (dateOrIso) {
    const timeStr = formatDubaiTime(dateOrIso);
    const dateStr = formatReadableDate(typeof dateOrIso === 'string' ? dateOrIso : dateOrIso.toISOString());
    if (dateStr && timeStr) return `${dateStr} • ${timeStr}`;
    if (dateStr) return `${dateStr} GST`;
  }
  if (fallbackDateStr) {
    return `${formatReadableDate(fallbackDateStr) || fallbackDateStr} GST`;
  }
  return '';
}

/**
 * Parses a YYYY-MM-DD (or ISO) string safely in Asia/Dubai (+04:00)
 */
function parseDubaiDateNoon(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00+04:00`);
  }
  return new Date(trimmed);
}

/**
 * Calculates package expiry date from a given start date YYYY-MM-DD and validity days
 */
export function calculateExpiryDate(startDateStr: string, validityDays: number = 30): string {
  const d = parseDubaiDateNoon(startDateStr);
  if (isNaN(d.getTime())) return startDateStr;
  const target = new Date(d.getTime() + (validityDays || 30) * 24 * 60 * 60 * 1000);
  return formatDubaiDate(target);
}

/**
 * Calculates 30-day package expiry date from a given start date YYYY-MM-DD
 */
export function calculate30DayExpiry(startDateStr: string): string {
  return calculateExpiryDate(startDateStr, 30);
}

/**
 * Calculates calendar days remaining between today and expiry date (YYYY-MM-DD) in Asia/Dubai timezone
 */
export function getDaysRemaining(expiryDateStr: string): number {
  const todayStr = formatDubaiDate(new Date());
  const today = parseDubaiDateNoon(todayStr);
  const expiry = parseDubaiDateNoon(expiryDateStr);
  if (isNaN(today.getTime()) || isNaN(expiry.getTime())) return 0;
  const diffTime = expiry.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates age from Date of Birth (YYYY-MM-DD)
 */
export function calculateAge(dobStr: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  const today = new Date();
  if (isNaN(dob.getTime())) return 0;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

/**
 * Formats currency in AED
 */
export function formatAED(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Evaluates whether a cancellation is >= 12 hours before the scheduled session start time.
 * @param sessionDateStr YYYY-MM-DD
 * @param startTimeStr HH:mm (24-hour format)
 * @param now Optional reference time (defaults to current time)
 * @returns { isEligibleForRefund: boolean, hoursDiff: number }
 */
export function evaluateCancellationPolicy(
  sessionDateStr: string,
  startTimeStr: string,
  now: Date = new Date()
): { isEligibleForRefund: boolean; hoursDiff: number } {
  const [rawHours = '0', rawMinutes = '0'] = (startTimeStr || '00:00').split(':');
  const hh = String(parseInt(rawHours, 10) || 0).padStart(2, '0');
  const mm = String(parseInt(rawMinutes, 10) || 0).padStart(2, '0');
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(sessionDateStr.trim())
    ? sessionDateStr.trim()
    : formatDubaiDate(sessionDateStr);
  const sessionDate = new Date(`${datePart}T${hh}:${mm}:00+04:00`);

  const diffMs = sessionDate.getTime() - now.getTime();
  const hoursDiff = diffMs / (1000 * 60 * 60);

  // Exactly 12 hours or more qualifies for a full refund
  const isEligibleForRefund = hoursDiff >= 12;

  return {
    isEligibleForRefund,
    hoursDiff: Math.round(hoursDiff * 10) / 10,
  };
}

/**
 * Generates ISO timestamp formatted for Asia/Dubai
 */
export function getDubaiISOString(): string {
  return new Date().toISOString();
}

/**
 * Validates whether a trainer can mark a session as completed based on strict timing rules:
 * Rule 1: A trainer CANNOT mark a future date session completed before the session day.
 * Rule 2: On the scheduled session day, a trainer can ONLY mark the session completed starting 1 hour prior to scheduled start time.
 */
export function canMarkSessionCompleted(
  sessionDateStr: string,
  startTimeStr: string,
  now: Date = new Date()
): { allowed: boolean; reason?: string; allowedTimeString?: string } {
  const todayStr = formatDubaiDate(now);

  // Rule 1: Future date constraint (cannot complete session for tomorrow or later)
  if (sessionDateStr > todayStr) {
    return {
      allowed: false,
      reason: `Future Session Restriction: You cannot mark a session scheduled for ${sessionDateStr} as completed before the session day (today is ${todayStr}).`,
    };
  }

  // Rule 2: On the scheduled session date, can only mark starting 1 hour prior to session start time
  if (sessionDateStr === todayStr) {
    const [startHourStr, startMinStr] = startTimeStr.split(':');
    const startHour = parseInt(startHourStr, 10) || 0;
    const startMin = parseInt(startMinStr, 10) || 0;

    // Calculate 1 hour before start time
    let allowedHour = startHour - 1;
    let allowedMin = startMin;
    if (allowedHour < 0) {
      allowedHour = 0;
    }

    const allowedTimeFormatted = `${allowedHour.toString().padStart(2, '0')}:${allowedMin.toString().padStart(2, '0')}`;

    // Get current time in Dubai using Intl.formatToParts
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DUBAI_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    let curHour = 0;
    let curMin = 0;
    for (const part of parts) {
      if (part.type === 'hour') curHour = parseInt(part.value, 10) % 24;
      if (part.type === 'minute') curMin = parseInt(part.value, 10);
    }

    const currentTotalMin = curHour * 60 + curMin;
    const allowedTotalMin = allowedHour * 60 + allowedMin;

    if (currentTotalMin < allowedTotalMin) {
      return {
        allowed: false,
        reason: `Timing Policy Restriction: Sessions scheduled for ${startTimeStr} can only be marked as completed starting 1 hour prior (${allowedTimeFormatted} GST onwards).`,
        allowedTimeString: allowedTimeFormatted,
      };
    }
  }

  // Past dates or valid time window on current date
  return { allowed: true };
}
