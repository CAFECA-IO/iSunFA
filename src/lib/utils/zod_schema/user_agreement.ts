import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

export const UserAgreementPrismaSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  agreementHash: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
});

export const UserAgreementPostQuerySchema = z.object({
  userId: zodStringToNumber,
});

export const UserAgreementPostBodySchema = z.object({
  agreementHash: z.string(),
});

export const UserAgreementPostSchema = {
  input: {
    querySchema: UserAgreementPostQuerySchema,
    bodySchema: UserAgreementPostBodySchema,
  },
  outputSchema: z.string(),
  frontend: nullSchema,
};
