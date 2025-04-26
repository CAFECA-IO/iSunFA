export enum PendingTaskIconName {
  MISSING_CERTIFICATE = 'missing_certificate_icon',
  UNPOSTED_VOUCHERS = 'unposted_vouchers_icon',
}

export enum TaskTitle {
  MISSING_CERTIFICATE = 'MISSING_CERTIFICATE',
  UNPOSTED_VOUCHERS = 'UNPOSTED_VOUCHERS',
}

export interface IMissingCertificate {
  accountBookId: number;
  accountBookName: string;
  count: number;
  accountBookLogoSrc: string;
}

export interface IUnpostedVoucher {
  accountBookId: number;
  accountBookName: string;
  count: number;
  accountBookLogoSrc: string;
}

export interface IPendingTask {
  accountBookId: number;
  missingCertificate: IMissingCertificate;
  missingCertificatePercentage: number;
  unpostedVoucher: IUnpostedVoucher;
  unpostedVoucherPercentage: number;
}

export interface IPendingTaskTotal {
  userId: number;
  totalMissingCertificate: number;
  totalMissingCertificatePercentage: number;
  missingCertificateList: IMissingCertificate[];
  totalUnpostedVoucher: number;
  totalUnpostedVoucherPercentage: number;
  unpostedVoucherList: IUnpostedVoucher[];
}
