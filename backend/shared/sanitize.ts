/**
 * Input sanitization utilities for RecoverFlow AI
 */

/**
 * Sanitize user-controlled fields before interpolating into Gemini prompts
 */
export function sanitizeForPrompt(value: string | undefined | null, maxLength: number = 200): string {
  if (!value) return 'N/A';
  return value
    .replace(/[<>'"`;\\]/g, '')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a phone number for display
 */
export function sanitizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return 'N/A';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Return last 10 digits for Indian numbers
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Sanitize an email for display
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return 'N/A';
  return email.toLowerCase().trim();
}

/**
 * Sanitize a name for display
 */
export function sanitizeName(name: string | undefined | null): string {
  if (!name) return 'N/A';
  return name
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
}

/**
 * Mask a phone number for LLM prompts: only the last 3 digits survive.
 * e.g. "+91 98112 33445" -> "+91 XXXXXXX445"
 */
export function maskPhoneForPrompt(phone: string | undefined | null): string {
  if (!phone) return 'N/A';
  const digits = phone.replace(/\D/g, '');
  const tail = digits.slice(-3);
  const prefix = digits.length > 10 ? `+91` : '';
  return `${prefix} ${'X'.repeat(Math.max(digits.length - 3, 0))}${tail}`.trim() || 'N/A';
}

/**
 * Mask an email for LLM prompts: local part truncated, domain preserved.
 * e.g. "asha@example.com" -> "ash***@example.com"
 */
export function maskEmailForPrompt(email: string | undefined | null): string {
  if (!email) return 'N/A';
  const at = email.indexOf('@');
  if (at <= 0) {
    return email.slice(0, 2) + '***';
  }
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const keep = Math.min(local.length, 3);
  return local.slice(0, keep) + '***' + domain;
}

/**
 * Full PII envelope for a customer edge before it is interpolated into a
 * Gemini prompt. Replaces raw contact fields with masked equivalents.
 */
export function maskCustomerForPrompt(customer: {
  name?: string;
  phone?: string;
  email?: string;
}): { name: string; phone: string; email: string } {
  return {
    name: sanitizeName(customer?.name),
    phone: maskPhoneForPrompt(customer?.phone),
    email: maskEmailForPrompt(customer?.email)
  };
}


/**
 * Strip any 10-digit Indian mobile number and raw email from free text so the
 * agency log / prompt context never contains live contact data.
 */
export function scrubPiiFromText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\b\d{10}\b/g, 'XXXXXXXXXX')
    .replace(/(\+?91)?[\s-]?\d{5}[\s-]?\d{5}\b/g, '+91 XXXXX XXXXX')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '***@***');
}
