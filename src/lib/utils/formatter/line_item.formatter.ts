import { LineItem as PrismaLineItem } from '@prisma/client';
import { z } from 'zod';

import { ILineItemEntity } from '@/interfaces/line_item';
import { FormatterError } from '@/lib/utils/error/formatter_error';

/**
 * Info: (20241023 - Murky)
 * @description convert LineItem from prisma to ILineItemEntity
 */
export function parsePrismaLineItemToLineItemEntity(dto: PrismaLineItem): ILineItemEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const lineItemEntitySchema = z.object({
    id: z.number(),
    amount: z.number(),
    description: z.string(),
    debit: z.boolean(),
    accountId: z.number(),
    voucherId: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  });

  const { data, success, error } = lineItemEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('LineItemEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  return data;
}
