import type { IUserEntity } from '@/interfaces/user';
import { ICertificateEntity } from '@/interfaces/certificate';

/**
 * Info: (20241024 - Murky)
 * @description user certificate entity interface for backend, it means the certificate that user has read
 * @note use parsePrismaUserCertificateToUserCertificateEntity to convert Prisma.UserCertificate to IUserCertificateEntity
 * @note use initUserCertificateEntity to create a new IUserCertificateEntity from scratch
 */
export interface IUserCertificateEntity {
  /**
   * Info: (20241024 - Murky)
   * @description user certificate id from database, 0 means not created in database yet
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description user id of user who read this certificate
   */
  userId: number;

  /**
   * Info: (20241024 - Murky)
   * @description certificate id of certificate that user read
   */
  certificateId: number;

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
  certificate?: ICertificateEntity;
}
