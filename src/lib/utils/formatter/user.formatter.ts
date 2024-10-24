import { IUser, IUserEntity } from '@/interfaces/user';
import { User, UserAgreement, File, User as PrismaUser } from '@prisma/client';

import { z } from 'zod';
import { FormatterError } from '@/lib/utils/error/formatter_error';

export function formatUser(
  user: User & {
    userAgreements: UserAgreement[];
    imageFile: File | null;
  }
): IUser {
  const agreementList = user.userAgreements.map((userAgreement) => userAgreement.agreementHash);
  const formattedUser: IUser = {
    ...user,
    email: user.email ?? '',
    imageId: user?.imageFile?.url ?? '',
    agreementList,
  };

  return formattedUser;
}

export async function formatUserList(
  userList: (User & { userAgreements: UserAgreement[]; imageFile: File | null })[]
): Promise<IUser[]> {
  const formattedUserList: IUser[] = userList.map((user) => {
    const formattedUser: IUser = formatUser(user);
    return formattedUser;
  });

  return formattedUserList;
}

/**
 * Info: (20241024 - Murky)
 * @description 將 PrismaUser 資料轉換為符合 IUserEntity 介面的物件。
 * 這個函數使用 Zod 進行資料驗證，確保傳入的 PrismaUser 物件符合 IUserEntity 所定義的結構。
 * 如果驗證失敗，會拋出 FormatterError 錯誤，並包含原始資料及錯誤訊息。
 * @param {PrismaUser} dto - 來自 Prisma 的 PrismaUser 資料物件。
 * @returns {IUserEntity} 符合 IUserEntity 結構的物件。
 * @throws {FormatterError} 當傳入的 dto 無法通過 Zod 驗證時，拋出錯誤，包含錯誤訊息及細節。
 * @note file, vouchers, certificates are not parsed
 */
export function parsePrismaUserToUserEntity(dto: PrismaUser): IUserEntity {
  const zodUserEntityParser = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().nullable(),
    imageFileId: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    imageFile: z.any().optional(),
    vouchers: z.array(z.any()).optional(),
    certificates: z.array(z.any()).optional(),
  });

  const { data, success, error } = zodUserEntityParser.safeParse(dto);

  if (!success) {
    throw new FormatterError('UserEntity format prisma data error', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const userEntity: IUserEntity = {
    ...data,
    vouchers: data.vouchers || [],
    certificates: data.certificates || [],
  };

  return userEntity;
}
