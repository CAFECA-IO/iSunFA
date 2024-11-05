import { UserVoucher as PrismaUserVoucher } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { IUserVoucherEntity } from '@/interfaces/user_voucher';
import { userVoucherEntityValidator } from '@/lib/utils/zod_schema/user_voucher';
/**
 * Info: (20241024 - Murky)
 * @description 將 PrismaUserVoucher 資料轉換為符合 IUserVoucherEntity 介面的物件。
 * 這個函數使用 Zod 進行資料驗證，確保傳入的 PrismaUserVoucher 物件符合 IUserVoucherEntity 所定義的結構。
 * 如果驗證失敗，會拋出 FormatterError 錯誤，並包含原始資料及錯誤訊息。
 * @param {PrismaUserVoucher} dto - 來自 Prisma 的 PrismaUserVoucher 資料物件。
 * @returns {IUserVoucherEntity} 符合 IUserVoucherEntity 結構的物件。
 * @throws {FormatterError} 當傳入的 dto 無法通過 Zod 驗證時，拋出錯誤，包含錯誤訊息及細節。
 * @note user, voucher are not parsed
 */
export function parsePrismaUserVoucherToUserVoucherEntity(
  dto: PrismaUserVoucher
): IUserVoucherEntity {
  const { data, success, error } = userVoucherEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('UserVoucherEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const userVoucherEntity: IUserVoucherEntity = {
    ...data,
  };

  return userVoucherEntity;
}
