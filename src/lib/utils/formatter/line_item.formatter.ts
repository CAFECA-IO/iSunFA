import { LineItem as PrismaLineItem } from '@prisma/client';

import { ILineItemEntity } from '@/interfaces/line_item';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { lineItemEntityValidator } from '@/lib/utils/zod_schema/line_item';

/**
 * Info: (20241023 - Murky)
 * @description convert LineItem from prisma to ILineItemEntity
 * @note please check lineItemEntityValidator for how to validate the data
 */
export function parsePrismaLineItemToLineItemEntity(dto: PrismaLineItem): ILineItemEntity {
  const { data, success, error } = lineItemEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('LineItemEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  return data;
}
