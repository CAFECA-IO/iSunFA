import type { IUserEntity } from '@/interfaces/user';
import type { IVoucherEntity } from '@/interfaces/voucher';

/**
 * Info: (20241024 - Murky)
 * @description user voucher entity interface for backend, it means the voucher that user has read
 * @note use parsePrismaUserVoucherToUserVoucherEntity to convert Prisma.UserVoucher to IUserVoucherEntity
 * @note use initUserVoucherEntity to create a new IUserVoucherEntity from scratch
 */
export interface IUserVoucherEntity {
  /**
   * Info: (20241024 - Murky)
   * @description user voucher id from database, 0 means not created in database yet
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description user id of user who read this voucher
   */
  userId: number;

  /**
   * Info: (20241024 - Murky)
   * @description voucher id of voucher that user read
   */
  voucherId: number;

  /**
   * Info: (20241024 - Murky)
   * @description is read by user or not
   */
  isRead: boolean;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds, null if not deleted
   */
  deletedAt: number | null;

  /**
   * Info: (20241024 - Murky)
   * @description user entity that read this voucher
   */
  user?: IUserEntity;

  /**
   * Info: (20241024 - Murky)
   * @description voucher entity that user read
   */
  voucher?: IVoucherEntity;
}
