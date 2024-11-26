import { ICertificateEntity } from '@/interfaces/certificate';
import type { IVoucherEntity } from '@/interfaces/voucher';

export interface IVoucherCertificateEntity {
  id: number;
  voucherId: number;
  certificateId: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  voucher?: IVoucherEntity;
  certificate?: ICertificateEntity;
}
