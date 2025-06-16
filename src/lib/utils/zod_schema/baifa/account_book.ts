import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { WORK_TAG } from '@/interfaces/account_book';
import { TPlanType } from '@/interfaces/subscription';
import { nullSchema } from '@/lib/utils/zod_schema/common';

export const listBaifaAccountBookQuerySchema = paginatedDataQuerySchema;

export const listBaifaAccountBookOutputSchema = paginatedDataSchema(
  z.object({
    id: z.number(),
    teamId: z.number(),
    ownerId: z.number(),
    imageId: z.string(),
    name: z.string(),
    taxId: z.string(),
    tag: z.nativeEnum(WORK_TAG),
    startDate: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),

    businessLocation: z.string().optional(),
    accountingCurrency: z.string().optional(),
    representativeName: z.string(),
    taxSerialNumber: z.string(),
    contactPerson: z.string(),
    phoneNumber: z.string(),
    city: z.string(),
    district: z.string(),
    enteredAddress: z.string(),

    isTransferring: z.boolean(),

    team: z.object({
      id: z.number(),
      name: z.string(),
      imageId: z.string(),
      about: z.string(),
      profile: z.string(),
      planType: z.nativeEnum(TPlanType),
      expiredAt: z.number(),
      inGracePeriod: z.boolean(),
      gracePeriodEndAt: z.number(),
      bankAccount: z.string(),
    }),
  })
);

export const listBaifaAccountBookSchema = {
  input: {
    querySchema: listBaifaAccountBookQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: listBaifaAccountBookOutputSchema,
  frontend: listBaifaAccountBookOutputSchema,
};
