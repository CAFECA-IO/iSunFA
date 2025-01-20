import { z } from 'zod';
import { nullSchema, zodStringToBoolean, zodStringToNumber } from '@/lib/utils/zod_schema/common';
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

export const IInvoiceDetailValidator = z.object({
  id: z.number(),
  teamId: z.number(),
  status: z.boolean(),
  issuedTimestamp: z.number(),
  dueTimestamp: z.number(),
  planId: z.enum([TPlanType.BEGINNER, TPlanType.PROFESSIONAL, TPlanType.ENTERPRISE]),
  planStartTimestamp: z.number(),
  planEndTimestamp: z.number(),
  planQuantity: z.number(),
  planUnitPrice: z.number(),
  planAmount: z.number(),
  payer: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    taxId: z.string(),
  }),
  payee: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    taxId: z.string(),
  }),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  amountDue: z.number(),
});

export const IInvoiceListValidator = paginatedDataSchema(IInvoiceDetailValidator);

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
    outputSchema: ISubscriptionItemValidator,
    frontend: nullSchema,
  },
  update: {
    input: {
      querySchema: ISubscriptionPutQueryValidator,
      bodySchema: ISubscriptionPutBodyValidator,
    },
    outputSchema: ISubscriptionItemValidator,
    frontend: nullSchema,
  },
  listInvoiceList: {
    input: {
      querySchema: z.object({
        teamId: zodStringToNumber,
        page: zodStringToNumber.optional(),
        pageSize: zodStringToNumber.optional(),
        plan: z.enum([TPlanType.BEGINNER, TPlanType.PROFESSIONAL, TPlanType.ENTERPRISE]).optional(),
        status: zodStringToBoolean.optional(),
        startDate: zodStringToNumber.optional(),
        endDate: zodStringToNumber.optional(),
        searchQuery: z.string().optional(),
      }),
      bodySchema: nullSchema,
    },
    outputSchema: IInvoiceListValidator,
  },
  getInvoice: {
    input: {
      querySchema: z.object({
        invoiceId: zodStringToNumber,
      }),
      bodySchema: nullSchema,
    },
    outputSchema: IInvoiceDetailValidator,
  },
};
