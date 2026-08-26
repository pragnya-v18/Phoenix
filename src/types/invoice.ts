/**
 * B2B invoice and receivables types for RecoverFlow AI
 */

export type InvoiceDPD = 'CURRENT' | 'OVERDUE_30' | 'OVERDUE_60' | 'OVERDUE_90_PLUS';

export type InvoicePaymentTerms = 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'NET_90' | 'NET_120' | 'DUE_ON_RECEIPT';

export interface PromiseToPayCommitment {
  commitmentId: string;
  caseId: string;
  promisedDate: string;
  promisedAmountINR: number;
  contactPerson: string;
  contactEmail: string;
  notes: string;
  status: 'PENDING' | 'KEPT' | 'MISSED' | 'ESCALATED';
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceProfile {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  daysPastDue: number;
  dpdBucket: InvoiceDPD;
  outstandingAmountINR: number;
  originalAmountINR: number;
  paymentTerms: InvoicePaymentTerms;
  companyName: string;
  companyGstin?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  invoiceItems: Array<{
    description: string;
    quantity: number;
    unitPriceINR: number;
  }>;
  poNumber?: string;
  gracePeriodDays: number;
  totalLifetimeBusinessINR: number;
  historicalOnTimePaymentRate: number;
  recoveryProbability: number;
}

export interface B2BReceivablesMetrics {
  totalOverdueInvoices: number;
  totalRecoveredInvoices: number;
  receivablesRecoveryRatePct: number;
  totalOutstandingINR: number;
  totalRecoveredINR: number;
  avgDaysToCollect: number;
  promiseToPayCount: number;
  promiseToPayConversionRatePct: number;
  agingBreakdown: Array<{
    bucket: InvoiceDPD;
    bucketLabel: string;
    invoiceCount: number;
    recoveredCount: number;
    outstandingINR: number;
    recoveredINR: number;
    recoveryRatePct: number;
  }>;
  rootCauseBreakdown: Array<{
    cause: string;
    causeLabel: string;
    invoiceCount: number;
    recoveredCount: number;
    recoveryRatePct: number;
  }>;
}
