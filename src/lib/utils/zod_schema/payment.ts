import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { z } from 'zod';

export const iPaymentValidator = z.object({
  isRevenue: z.boolean(),
  price: z.number(),
  hasTax: z.boolean(),
  taxPercentage: z.number(),
  hasFee: z.boolean(),
  fee: z.number(),
  method: z.string(),
  period: z.nativeEnum(PaymentPeriodType),
  installmentPeriod: z.number(),
  alreadyPaid: z.number(),
  status: z.nativeEnum(PaymentStatusType),
  progress: z.number(),
});
