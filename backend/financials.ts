/**
 * RecoverFlow AI - Indian Payment Rails Financial MDR & Interchange Accounting Engine
 * Razorpay Buildathon 2026 - Track 03 (AI Revenue Recovery)
 * 
 * Schedule of MDR / Interchange Rates (RBI / NPCI Mandates):
 * - UPI (P2M): 0.00% (Zero MDR)
 * - Domestic Standard Cards (Visa/Mastercard/RuPay): 1.95% + 18% GST = 2.301%
 * - Corporate / Amex / International Cards: 2.95% + 18% GST = 3.481%
 * - NetBanking (Top Issuers - HDFC/SBI/ICICI): Flat ₹15.00 (+ 18% GST = ₹17.70)
 * - Wallets (Paytm, Mobikwik, etc.): 1.80% (+ 18% GST = 2.124%)
 * - NACH e-Mandates / AutoPay: Flat ₹5.00 (+ 18% GST = ₹5.90)
 */

import { PaymentMethod } from '../src/types.js';

export interface MDRCalculationResult {
  method: PaymentMethod;
  amountINR: number;
  mdrRatePct: number;
  mdrFeeINR: number;
  gstINR: number;
  totalMdrFeeINR: number;
  feeFormula: string;
}

export class FinancialAccountingEngine {
  /**
   * Calculates the exact MDR and interchange fees deducted by payment gateways and bank switches.
   */
  public static calculateMDRFee(
    amountINR: number,
    method: PaymentMethod,
    isCorporateOrPremiumCard: boolean = false
  ): MDRCalculationResult {
    const safeAmount = Math.max(0, amountINR);
    let baseRatePct = 0;
    let flatFeeINR = 0;
    let formula = '';

    switch (method) {
      case 'UPI':
        baseRatePct = 0.0;
        flatFeeINR = 0.0;
        formula = '0.00% Zero MDR (NPCI/RBI Mandate)';
        break;

      case 'CARD':
        if (isCorporateOrPremiumCard || safeAmount >= 25000) {
          baseRatePct = 2.95;
          formula = '2.95% Corporate/Premium Card + 18% GST';
        } else {
          baseRatePct = 1.95;
          formula = '1.95% Domestic Retail Card + 18% GST';
        }
        break;

      case 'NETBANKING':
        flatFeeINR = 15.00;
        formula = 'Flat ₹15.00 NetBanking Switch + 18% GST';
        break;

      case 'WALLET':
        baseRatePct = 1.80;
        formula = '1.80% Prepaid Wallet Rail + 18% GST';
        break;

      case 'NACH_MANDATE':
        flatFeeINR = 5.00;
        formula = 'Flat ₹5.00 NPCI NACH Mandate + 18% GST';
        break;

      default:
        baseRatePct = 1.95;
        formula = '1.95% Default Gateway Rail + 18% GST';
        break;
    }

    const baseFee = flatFeeINR > 0 ? flatFeeINR : (safeAmount * baseRatePct) / 100;
    const gstINR = Number((baseFee * 0.18).toFixed(2));
    const totalMdrFeeINR = Number((baseFee + gstINR).toFixed(2));
    const effectiveRatePct = safeAmount > 0 ? Number(((totalMdrFeeINR / safeAmount) * 100).toFixed(2)) : 0;

    return {
      method,
      amountINR: safeAmount,
      mdrRatePct: effectiveRatePct,
      mdrFeeINR: Number(baseFee.toFixed(2)),
      gstINR,
      totalMdrFeeINR,
      feeFormula: formula
    };
  }
}
