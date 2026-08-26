/**
 * Policy and configuration types for RecoverFlow AI
 */

export interface AntiAbusePolicyConfig {
  maxRecoveriesPer30Days: number;
  maxDiscountsPerCustomer: number;
  customerCooldownMinutes?: number;
  cooldownPeriodHours?: number;
  globalOutageThresholdSuccessRatePct?: number;
  enforceZeroDiscountOnAbuse?: boolean;
}
