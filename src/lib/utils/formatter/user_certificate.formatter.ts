import { UserCertificate as PrismaUserCertificate } from '@prisma/client';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { userCertificateEntityValidator } from '@/lib/utils/zod_schema/user_certificate';
/**
 * Info: (20241024 - Murky)
 * @description 將 PrismaUserCertificate 資料轉換為符合 IUserCertificateEntity 介面的物件。
 * 這個函數使用 Zod 進行資料驗證，確保傳入的 PrismaUserCertificate 物件符合 IUserCertificateEntity 所定義的結構。
 * 如果驗證失敗，會拋出 FormatterError 錯誤，並包含原始資料及錯誤訊息。
 * @param {PrismaUserCertificate} dto - 來自 Prisma 的 PrismaUserCertificate 資料物件。
 * @returns {IUserCertificateEntity} 符合 IUserCertificateEntity 結構的物件。
 * @throws {FormatterError} 當傳入的 dto 無法通過 Zod 驗證時，拋出錯誤，包含錯誤訊息及細節。
 * @note user, Certificate are not parsed
 */
export function parsePrismaUserCertificateToUserCertificateEntity(
  dto: PrismaUserCertificate
): IUserCertificateEntity {
  const { data, success, error } = userCertificateEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('UserCertificateEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const userCertificateEntity: IUserCertificateEntity = {
    ...data,
  };

  return userCertificateEntity;
}
