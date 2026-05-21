// Info: (20260514 - Tzuhan) Centralized constants to replace Prisma Enums

export const MeasurementUnit = {
  KWH: "KWH",
  LITER: "LITER",
  KG: "KG",
  TONNE: "TONNE",
  GALLON: "GALLON",
  PIECE: "PIECE",
  TWD: "TWD",
} as const;

export type MeasurementUnit =
  (typeof MeasurementUnit)[keyof typeof MeasurementUnit];

export const EsgGenerationSource = {
  MANUAL_ENTRY: "MANUAL_ENTRY",
  SYSTEM_DETERMINISTIC: "SYSTEM_DETERMINISTIC",
  AI_SPECULATIVE_STAGE_3: "AI_SPECULATIVE_STAGE_3",
} as const;

export type EsgGenerationSource =
  (typeof EsgGenerationSource)[keyof typeof EsgGenerationSource];

export const VoucherPaymentStatus = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type VoucherPaymentStatus =
  (typeof VoucherPaymentStatus)[keyof typeof VoucherPaymentStatus];

export const DocumentType = {
  ACCRUAL_NOTICE: "ACCRUAL_NOTICE",
  PAYMENT_RECEIPT: "PAYMENT_RECEIPT",
  OTHERS: "OTHERS",
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
