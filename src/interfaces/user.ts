import type { IFileEntity } from '@/interfaces/file';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { ICertificateEntity } from '@/interfaces/certificate';

export interface IUser {
  id: number;
  name: string;
  email: string;
  imageId: string;
  agreementList: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

/**
 * Info: (20241024 - Murky)
 * @description user entity interface for backend
 * @note use parsePrismaUserToUserEntity to convert Prisma.User to IUserEntity
 * @note use initUserEntity to create a new IUserEntity from scratch
 */
export interface IUserEntity {
  /**
   * Info: (20241024 - Murky)
   * @description user id from database, 0 means not created in database yet
   */
  id: number;

  name: string;

  /**
   * Info: (20241024 - Murky)
   * @note nullable
   */
  email: string | null;

  /**
   * Info: (20241024 - Murky)
   * @description user image icon id
   */
  imageFileId: number;

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
   * @description user image icon
   */
  imageFile?: IFileEntity;

  /**
   * Info: (20241024 - Murky)
   * @description voucher that is created by this user (issuer)
   */
  vouchers?: IVoucherEntity[];

  /**
   * Info: (20241024 - Murky)
   * @description certificate that is created by this user (issuer)
   */
  certificates?: ICertificateEntity[];

  // ToDo: (20241024 - Murky) add more properties, ex:
  // admins          Admin[]
  // invitations     Invitation[]
  // authentications Authentication[]
  // userAgreements  UserAgreement[]
  // userPaymentInfo UserPaymentInfo[]
  // userRoles       UserRole[]
  // kycBookkeepers  KYCBookkeeper[]
  // userVoucher
}
