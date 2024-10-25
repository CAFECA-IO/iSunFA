import { UserVoucher as PrismaUserVoucher } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import type { IUserEntity } from '@/interfaces/user';
import { IVoucherEntity } from '@/interfaces/voucher';
import { IUserVoucherEntity } from '@/interfaces/user_voucher';

/**
 * Info: (20241024 - Murky)
 * @note 用於從零開始建立新的 user voucher entity，
 * @note 請使用 parsePrismaUserVoucherToUserVoucherEntity 來轉換 PrismaUserVoucher 至 UserVoucherEntity
 */
export function initUserVoucherEntity(
  dto: Partial<PrismaUserVoucher> & {
    userId: number;
    voucherId: number;
    isRead: boolean;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
    user?: IUserEntity;
    voucher?: IVoucherEntity;
  }
): IUserVoucherEntity {
  const nowInSecond = getTimestampNow();
  const userVoucherEntity: IUserVoucherEntity = {
    id: dto.id || 0,
    userId: dto.userId,
    voucherId: dto.voucherId,
    isRead: dto.isRead,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    user: dto.user,
    voucher: dto.voucher,
  };
  return userVoucherEntity;
}
