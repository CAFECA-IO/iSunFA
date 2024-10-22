export interface IPendingTask {
  companyId: number;
  missingCertificate: IMissingCertificate;
  missingCertificatePercentage: number;
  unpostedVoucher: IUnpostedVoucher;
  unpostedVoucherPercentage: number;
}

interface IMissingCertificate {
  companyId: number;
  companyName: string;
  count: number;
}

interface IUnpostedVoucher {
  companyId: number;
  companyName: string;
  count: number;
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
