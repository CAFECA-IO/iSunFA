import { Voucher as PrismaVoucher } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { IVoucherEntity } from '@/interfaces/voucher';
import { voucherEntityValidator } from '@/lib/utils/zod_schema/voucher';
import loggerBack from '@/lib/utils/logger_back';
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
  const newDto = {
    originalEvents: [],
    resultEvents: [],
    lineItems: [],
    certificates: [],
    asset: [],
    ...dto,
    counterPartyId: dto.counterPartyId ?? null,
  };

  const { data, success, error } = voucherEntityValidator.safeParse(newDto);

  if (!success) {
    loggerBack.error(error);
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
    asset: data.asset || [],
    counterPartyId: dto.counterPartyId ?? null,
  };

  return voucherEntity;
}
