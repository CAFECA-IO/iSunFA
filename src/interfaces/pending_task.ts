export enum PendingTaskIconName {
  MISSING_CERTIFICATE = 'missing_certificate_icon',
  UNPOSTED_VOUCHERS = 'unposted_vouchers_icon',
}

export enum TaskTitle {
  MISSING_CERTIFICATE = 'MISSING_CERTIFICATE',
  UNPOSTED_VOUCHERS = 'UNPOSTED_VOUCHERS',
}

export interface IMissingCertificate {
  companyId: number;
  companyName: string;
  count: number;
  companyLogoSrc: string;
}

export interface IUnpostedVoucher {
  companyId: number;
  companyName: string;
  count: number;
  companyLogoSrc: string;
}

export interface IPendingTask {
  companyId: number;
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
