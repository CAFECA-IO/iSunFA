export interface IPendingTask {
  id: number;
  companyId: number;
  missingCertificate: IMissingCertificate;
  unpostedVoucher: IUnpostedVoucher;
}

interface IMissingCertificate {
  id: number;
  companyId: number;
  count: number;
}

interface IUnpostedVoucher {
  id: number;
  companyId: number;
  count: number;
}

export interface IPendingTaskTotal {
  id: number;
  userId: number;
  totalMissingCertificate: number;
  missingCertificateList: IMissingCertificate[];
  totalUnpostedVoucher: number;
  unpostedVoucherList: IUnpostedVoucher[];
}
