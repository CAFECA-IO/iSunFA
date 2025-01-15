import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { TPaymentStatus, TPlanType } from '@/interfaces/subscription';

/**
 * Info: (20250114 - Tzuhan)
 * @description Schema to validate individual team subscription
 */
export const ISubscriptionItemValidator = z.object({
  id: z.number(),
  name: z.string(),
  plan: z.enum([TPlanType.BEGINNER, TPlanType.PROFESSIONAL, TPlanType.ENTERPRISE]),
  enableAutoRenewal: z.boolean(),
  nextRenewalTimestamp: z.number(),
  expiredTimestamp: z.number(),
  paymentStatus: z.enum([TPaymentStatus.PAID, TPaymentStatus.UNPAID, TPaymentStatus.FREE]),
});

/**
 * Info: (20250114 - Tzuhan)
 * @description Schema to validate the detailed subscription response
 */
export const ISubscriptionDetailsValidator = ISubscriptionItemValidator.extend({
  relatedInvoices: z
    .array(
      z.object({
        invoiceId: z.number(),
        amount: z.number(),
        date: z.number(),
        status: z.enum([TPaymentStatus.PAID, TPaymentStatus.UNPAID]),
      })
    )
    .optional(),
  note: z.string().optional(),
});

/**
 * Info: (20250114 - Tzuhan)
 * @description Schema to validate PUT (update) subscription request
 */
export const ISubscriptionPutQueryValidator = z.object({
  teamId: zodStringToNumber,
});

export const ISubscriptionPutBodyValidator = z.object({
  plan: z.enum([TPlanType.BEGINNER, TPlanType.PROFESSIONAL, TPlanType.ENTERPRISE]).optional(),
  autoRenew: z.boolean().optional(),
});

/**
 * Info: (20250114 - Tzuhan)
 * @description Paginated response schema for subscription list
 */
export const ISubscriptionListOutputValidator = paginatedDataSchema(ISubscriptionItemValidator);

/**
 * Info: (20250114 - Tzuhan)
 * @description Schemas for subscription API operations
 */
export const subscriptionSchemas = {
  list: {
    input: {
      querySchema: nullSchema,
      bodySchema: nullSchema,
    },
    outputSchema: ISubscriptionListOutputValidator,
    frontend: nullSchema,
  },
  get: {
    input: {
      querySchema: ISubscriptionPutQueryValidator,
      bodySchema: nullSchema,
    },
    outputSchema: ISubscriptionDetailsValidator,
    frontend: nullSchema,
  },
  update: {
    input: {
      querySchema: ISubscriptionPutQueryValidator,
      bodySchema: ISubscriptionPutBodyValidator,
    },
    outputSchema: z.null(), // ISubscriptionDetailsValidator,
    frontend: nullSchema,
  },
};
