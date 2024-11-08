import { UserCertificate as PrismaUserCertificate } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import type { IUserEntity } from '@/interfaces/user';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';

/**
 * Info: (20241024 - Murky)
 * @note 用於從零開始建立新的 user Certificate entity，
 * @note 請使用 parsePrismaUserCertificateToUserCertificateEntity 來轉換 PrismaUserCertificate 至 UserCertificateEntity
 */
export function initUserCertificateEntity(
  dto: Partial<PrismaUserCertificate> & {
    userId: number;
    CertificateId: number;
    isRead: boolean;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
    user?: IUserEntity;
    Certificate?: ICertificateEntity;
  }
): IUserCertificateEntity {
  const nowInSecond = getTimestampNow();
  const userCertificateEntity: IUserCertificateEntity = {
    id: dto.id || 0,
    userId: dto.userId,
    certificateId: dto.CertificateId,
    isRead: dto.isRead,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    user: dto.user,
    certificate: dto.Certificate,
  };
  return userCertificateEntity;
}

export function isUserReadCertificate(userCertificates: IUserCertificateEntity[]): boolean {
  return userCertificates.some((userCertificate) => userCertificate.isRead);
}
