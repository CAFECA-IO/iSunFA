import { z } from 'zod';
import { Voucher as PrismaVoucher } from '@prisma/client';
import { JOURNAL_EVENT } from '@/constants/journal';
import { EventType } from '@/constants/account';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { IVoucherEntity } from '@/interfaces/voucher';
/**
 * Info: (20241022 - Murky)
 * @description 將 PrismaVoucher 資料轉換為符合 IVoucherEntity 介面的物件。
 * 這個函數使用 Zod 進行資料驗證，確保傳入的 PrismaVoucher 物件符合 IVoucherEntity 所定義的結構。
 * 如果驗證失敗，會拋出 FormatterError 錯誤，並包含原始資料及錯誤訊息。
 * @note original, result events, lineItems are not parsed
 * @param {PrismaVoucher} dto - 來自 Prisma 的 PrismaVoucher 資料物件。
 * @returns {IVoucherEntity} 符合 IVoucherEntity 結構的物件。
 * @throws {FormatterError} 當傳入的 dto 無法通過 Zod 驗證時，拋出錯誤，包含錯誤訊息及細節。
 */
export function parsePrismaVoucherToVoucherEntity(dto: PrismaVoucher): IVoucherEntity {
  // ToDo: (20241023 - Murky) Need to move to other place
  const zodVoucherEntityParser = z.object({
    id: z.number(),
    issuerId: z.number(),
    counterPartyId: z.number(),
    companyId: z.number(),
    status: z.nativeEnum(JOURNAL_EVENT),
    editable: z.boolean(),
    no: z.string(),
    date: z.number(),
    type: z.nativeEnum(EventType),
    note: z.string().nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    originalEvents: z.array(z.any()).optional(),
    resultEvents: z.array(z.any()).optional(),
    lineItems: z.array(z.any()).optional(),
    aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
    aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
    certificates: z.array(z.any()).optional(),
  });
  const { data, success, error } = zodVoucherEntityParser.safeParse(dto);

  if (!success) {
    throw new FormatterError('VoucherEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const voucherEntity: IVoucherEntity = {
    ...data,
    originalEvents: data.originalEvents || [],
    resultEvents: data.resultEvents || [],
    lineItems: data.lineItems || [],
    certificates: data.certificates || [],
  };

  return voucherEntity;
}
