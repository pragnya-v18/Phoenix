/**
 * Gemini AI client utilities for RecoverFlow AI
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Lazy-initialize Gemini AI client server-side with telemetry headers
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * Utility to cleanly parse JSON from Gemini text responses
 */
export function parseGeminiJson<T>(rawText: string | undefined): T | null {
  if (!rawText) return null;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
  } catch (e) {
    console.warn('RecoverFlow: Failed to parse JSON from Gemini output:', e);
  }
  return null;
}

/**
 * Timeout wrapper for snappy responses (max 12s per agent before fallback)
 */
export async function callGeminiWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 12000,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini call timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = lastError.message.includes('429') || lastError.message.includes('503')
        || lastError.message.includes('ECONNRESET') || lastError.message.includes('ETIMEDOUT')
        || lastError.message.includes('timed out');
      if (!isRetryable || attempt >= maxRetries) throw lastError;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`[Gemini] Retryable error (attempt ${attempt + 1}/${maxRetries}), retrying in ${backoffMs}ms:`, lastError.message);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  throw lastError;
}
