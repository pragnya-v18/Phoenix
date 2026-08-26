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
