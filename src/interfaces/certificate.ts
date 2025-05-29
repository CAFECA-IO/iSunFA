import { type IInvoiceBetaOptional, type IInvoiceEntity } from '@/interfaces/invoice';
import { IFileBeta, type IFileEntity } from '@/interfaces/file';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/invoice_rc2';
import type { IUserEntity } from '@/interfaces/user';
import {
  Certificate as PrismaCertificate,
  VoucherCertificate as PrismaVoucherCertificate,
  Voucher as PrismaVoucher,
  File as PrismaFile,
  Invoice as PrismaInvoice,
  User as PrismaUser,
} from '@prisma/client';

export interface ICertificateListSummary {
  totalInvoicePrice: number;
  incomplete: {
    withVoucher: number;
    withoutVoucher: number;
  };
  currency: string;
}

export interface ICertificate {
  id: number;
  name: string;
  companyId: number;
  incomplete: boolean;
  file: IFileBeta; // Info: (20241108 - Tzuhan) !!! removed IFileBeta and update IFile
  invoice: IInvoiceBetaOptional;
  voucherNo: string | null;
  voucherId: number | null;
  aiResultId?: string;
  aiStatus?: string;
  createdAt: number;
  updatedAt: number;
  uploader: string; // Info: (20241108 - tzuhan) moved from IInvoiceBetaOptional
  uploaderUrl: string; // Info: (20241108 - tzuhan) moved from IInvoiceBetaOptional
}

export interface ICertificateUI extends ICertificate {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
}

/**
 * Info: (20241024 - Murky)
 * @description certificate entity interface specific for backend
 * @note use parsePrismaCertificateToCertificateEntity to convert Prisma.Certificate to ICertificateEntity
 * @note use initCertificateEntity to create a new ICertificateEntity from scratch
 */
export interface ICertificateEntity {
  /**
   * Info: (20241024 - Murky)
   * @description certificate id from database, 0 means not created in database yet
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description company id of company this certificate belongs to
   */
  accountBookId: number;

  /**
   * Info: (20241024 - Murky)
   * @description 傳票流水號
   */
  // voucherNo: string | null;

  /**
   * Info: (20241024 - Murky)
   * @description aich result id
   * @note database has not yet created this column
   */
  aiResultId?: string;

  /**
   * Info: (20241024 - Murky)
   * @description aich result status
   * @note database has not yet created this column
   */
  aiStatus?: string;

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
   * @description file entity contain image meta data and buffer
   */
  file?: IFileEntity;

  /**
   * Info: (20241024 - Murky)
   * @description invoice entity contain invoice meta data
   */
  invoice?: IInvoiceEntity;

  /**
   * Info: (20241024 - Murky)
   * @description which company this certificate belongs to
   */
  company?: IAccountBookWithoutTeamEntity;

  /**
   * Info: (20241024 - Murky)
   * @description vouchers that take this certificate as reference
   */
  vouchers: IVoucherEntity[];

  uploader?: IUserEntity;
}

export type PostCertificateResponse = PrismaCertificate & {
  file: PrismaFile;
  voucherCertificates: (PrismaVoucherCertificate & {
    voucher: PrismaVoucher;
  })[];
  invoices: PrismaInvoice[];
  // invoices: (PrismaInvoice & {
  //   counterParty: PrismaCounterparty;
  // })[];
  uploader: PrismaUser & {
    imageFile: PrismaFile;
  };
};
