import { User as PrismaUser } from '@prisma/client';
import type { IFileEntity } from '@/interfaces/file';
import { IVoucherEntity } from '@/interfaces/voucher';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IUserEntity } from '@/interfaces/user';
import { getTimestampNow } from '@/lib/utils/common';

/**
 * Info: (20241024 - Murky)
 * @note 用於從零開始建立新的 user entity，
 * @note 請使用 parsePrismaUserToUserEntity 來轉換 PrismaUser 至 UserEntity
 */
export function initUserEntity(
  dto: Partial<PrismaUser> & {
    name: string;
    imageFileId: number;
    createdAt?: number;
    updatedAt?: number;
    email?: string | null;
    deletedAt?: number | null;
    imageFile?: IFileEntity;
    vouchers?: IVoucherEntity[];
    certificates?: ICertificateEntity[];
  }
): IUserEntity {
  const nowInSecond = getTimestampNow();

  const userEntity: IUserEntity = {
    id: dto.id || 0,
    name: dto.name,
    email: dto.email || null,
    imageFileId: dto.imageFileId,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    imageFile: dto.imageFile,
    vouchers: dto.vouchers || [],
    certificates: dto.certificates || [],
  };

  return userEntity;
}
